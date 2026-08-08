/**
 * Approved external search - live queries against rights-cleared providers.
 *
 * Only providers whose records are approved for direct download by
 * server/sources/policy.ts are queried here, so the search surface can never
 * include sources that distribute copyrighted material without authorization.
 */

import { isApprovedSource, getSourceRightsPolicy } from "./policy";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)",
  "Accept": "application/json",
};

export interface ExternalSearchResult {
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  year?: string;
  pages?: number;
  publisher?: string;
  coverUrl?: string;
  pdfUrl?: string;
  sourceUrl: string;
  source: string;
  rightsStatus: string;
  licenseName: string;
  licenseUrl?: string;
  directDownloadAllowed: boolean;
}

const withTimeout = async <T,>(promise: Promise<T>, milliseconds: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error("source timeout")), milliseconds); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Internet Archive open items - only items explicitly marked public-domain or
 * open-access are eligible for direct download.
 */
export async function searchInternetArchive(query: string, limit = 15): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("internet_archive")) return [];
  try {
    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+(licenseurl%3A*creativecommons*+OR+collection%3A(prelinger+or+gutenberg+or+federalregister))+AND+mediatype%3Atexts&fl[]=identifier,title,creator,description,language,subject,date,publisher,pdf` +
      `&rows=${Math.min(limit, 50)}&output=json`;
    const data = await fetchJson(url);
    const docs = (data?.response?.docs || []).slice(0, limit);
    const policy = getSourceRightsPolicy("internet_archive")!;
    return docs.map((d: any) => ({
      title: d.title || "",
      author: Array.isArray(d.creator) ? (d.creator[0] || "Internet Archive") : (d.creator || "Internet Archive"),
      description: Array.isArray(d.description) ? (d.description[0] || "") : (d.description || ""),
      language: Array.isArray(d.language) ? (d.language[0] || "en") : (d.language || "en"),
      subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
      year: d.date ? String(d.date).slice(0, 4) : undefined,
      publisher: d.publisher || undefined,
      pdfUrl: d.pdf ? `https://archive.org/download/${d.identifier}/${d.pdf}` : `https://archive.org/download/${d.identifier}`,
      sourceUrl: `https://archive.org/details/${d.identifier}`,
      source: "internet_archive",
      rightsStatus: policy.rightsStatus,
      licenseName: policy.licenseName,
      licenseUrl: policy.licenseUrl,
      directDownloadAllowed: policy.allowDirectDownload,
    })).filter((b: ExternalSearchResult) => b.title.length > 2);
  } catch {
    return [];
  }
}

/**
 * Project Gutenberg (via Gutendex) - every title is public domain.
 */
export async function searchGutenberg(query: string, limit = 15): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("gutenberg")) return [];
  try {
    const data = await fetchJson(
      `https://gutendex.com/books?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`,
    );
    const results = (data?.results || []).slice(0, limit);
    const policy = getSourceRightsPolicy("gutenberg")!;
    return results.map((b: any) => ({
      title: b.title || "",
      author: b.authors?.[0]?.name || "Unknown",
      description: `Public-domain title from Project Gutenberg (ID ${b.id}).`,
      language: b.languages?.[0] || "en",
      subjects: [...(b.subjects || []), ...(b.bookshelves || [])].slice(0, 5),
      coverUrl: b.cover_image || undefined,
      pdfUrl: b.formats?.["application/pdf"] || undefined,
      sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
      source: "gutenberg",
      rightsStatus: policy.rightsStatus,
      licenseName: policy.licenseName,
      licenseUrl: policy.licenseUrl,
      directDownloadAllowed: policy.allowDirectDownload,
    })).filter((r: ExternalSearchResult) => r.title.length > 2);
  } catch {
    return [];
  }
}

/**
 * OpenStax - openly licensed peer-reviewed textbooks.
 */
export async function searchOpenStax(query: string, limit = 10): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("openstax")) return [];
  try {
    const data = await fetchJson("https://openstax.org/api/v2/books/?format=json&limit=100", 8000);
    const books = (data?.items || data?.results || []).slice(0, limit);
    const policy = getSourceRightsPolicy("openstax")!;
    const needle = query.toLowerCase();
    return books
      .filter((b: any) =>
        (b.title || "").toLowerCase().includes(needle) ||
        (b.description || "").toLowerCase().includes(needle),
      )
      .map((b: any) => ({
        title: b.title || b.name || "",
        author: "OpenStax",
        description: b.description || b.short_description || `OpenStax openly licensed textbook: ${b.title}`,
        language: "en",
        subjects: [b.subject_name || b.subject || "Education"].filter(Boolean),
        coverUrl: b.cover_url || b.cover?.url || undefined,
        pdfUrl: b.high_resolution_pdf_url || b.pdf_url || undefined,
        sourceUrl: b.webview_rex_link || `https://openstax.org/details/books/${b.slug}`,
        publisher: "OpenStax",
        source: "openstax",
        rightsStatus: policy.rightsStatus,
        licenseName: policy.licenseName,
        licenseUrl: policy.licenseUrl,
        directDownloadAllowed: policy.allowDirectDownload,
      }));
  } catch {
    return [];
  }
}

export interface ExternalSearchAggregate {
  internet_archive: ExternalSearchResult[];
  gutenberg: ExternalSearchResult[];
  openstax: ExternalSearchResult[];
}

/**
 * Search all approved external providers in parallel and return each source's
 * results separately so the caller can merge and dedupe them against the local
 * catalog.
 */
export async function runExternalSearch(query: string, limit = 15): Promise<ExternalSearchAggregate> {
  const [internetArchive, gutenberg, openstax] = await Promise.allSettled([
    withTimeout(searchInternetArchive(query, limit), 8000),
    withTimeout(searchGutenberg(query, limit), 8000),
    withTimeout(searchOpenStax(query, limit), 8000),
  ]);
  return {
    internet_archive: internetArchive.status === "fulfilled" ? internetArchive.value : [],
    gutenberg: gutenberg.status === "fulfilled" ? gutenberg.value : [],
    openstax: openstax.status === "fulfilled" ? openstax.value : [],
  };
}
