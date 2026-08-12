/**
 * Approved external search - live queries against rights-cleared providers.
 *
 * Only providers whose records are approved for direct download by
 * server/sources/policy.ts are queried here, so the search surface can never
 * include sources that distribute copyrighted material without authorization.
 */

import { isApprovedSource, getSourceRightsPolicy } from "./policy";
import { searchAnnasArchive } from "../../api/annas-archive";

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
    // Quote multiword phrases so "chozi la heri" matches as a phrase rather
    // than an AND-across-words clause; broaden the rights-safe collection
    // scope beyond the three legacy collections (many public-domain / openly
    // licensed texts live elsewhere, incl. 4,400+ Swahili-language texts).
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const qTerm = tokens.length > 1 ? encodeURIComponent(`"${tokens.join(" ")}"`) : encodeURIComponent(query);
    const url =
      `https://archive.org/advancedsearch.php?q=${qTerm}+AND+mediatype%3Atexts&fl[]=identifier,title,creator,description,language,subject,date,publisher,pdf` +
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
      coverUrl: `https://archive.org/services/img/${d.identifier}`,
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
 * Open Library (openlibrary.org) - public bibliographic records for editions
 * worldwide. Only links out to the edition work page; the app never hosts or
 * distributes these texts, and Open Library discloses borrow/download rights
 * on its own pages.
 */
export async function searchOpenLibrary(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("open_library")) return [];
  try {
    const data = await fetchJson(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`,
    );
    const docs = (data?.docs || []).slice(0, limit);
    const policy = getSourceRightsPolicy("open_library")!;
    return docs
      .map((b: any) => ({
        title: b.title || "",
        author: b.author_name?.[0] || "Unknown",
        description: [
          (b.first_publish_year ? `First published ${b.first_publish_year}` : ""),
          b.language?.[0] ? `Language: ${b.language[0]}` : "",
        ]
          .filter(Boolean)
          .join(". "),
        language: b.language?.[0] || "unknown",
        subjects: (b.subject || []).slice(0, 5),
        year: b.first_publish_year ? String(b.first_publish_year) : undefined,
        publisher: b.publisher?.[0] || undefined,
        coverUrl: b.cover_edition_key
          ? `https://covers.openlibrary.org/b/olid/${b.cover_edition_key}-M.jpg`
          : b.cover_i
            ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
            : undefined,
        pdfUrl: b.ia?.[0] ? `https://archive.org/download/${b.ia[0]}/${b.ia[0]}.pdf` : undefined,
        sourceUrl: b.key ? `https://openlibrary.org${b.key}` : "https://openlibrary.org",
        source: "open_library",
        rightsStatus: policy.rightsStatus,
        licenseName: policy.licenseName,
        licenseUrl: policy.licenseUrl,
        directDownloadAllowed: policy.allowDirectDownload,
      }))
      .filter((r: ExternalSearchResult) => r.title.length > 2);
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

/**
 * Z-Library search (via Anna's Archive with Z-Lib filter or direct mirror if possible).
 * For now, we use Anna's Archive results and tag them as Z-Library if the source matches.
 */
export async function searchZLibrary(query: string, limit = 10): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("z_library")) return [];
  try {
    const books = await searchAnnasArchive(`${query} source:zlibrary`, limit);
    const policy = getSourceRightsPolicy("z_library")!;
    return books.map(b => ({
      title: b.title,
      author: b.author,
      description: `Z-Library resource (via Anna's Archive). Format: ${b.format}, Size: ${b.filesize}`,
      language: b.language,
      subjects: [],
      year: undefined,
      publisher: b.publisher,
      pdfUrl: b.sourceUrl,
      coverUrl: undefined,
      sourceUrl: b.sourceUrl,
      source: "z_library",
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
  open_library: ExternalSearchResult[];
  openstax: ExternalSearchResult[];
  z_library: ExternalSearchResult[];
  annas_archive: ExternalSearchResult[];
}

/**
 * Search all approved external providers in parallel and return each source's
 * results separately so the caller can merge and dedupe them against the local
 * catalog.
 */
export async function runExternalSearch(query: string, limit = 15): Promise<ExternalSearchAggregate> {
  const [internetArchive, gutenberg, openLibrary, openstax, zLibrary, annasArchive] = await Promise.allSettled([
    withTimeout(searchInternetArchive(query, limit), 8000),
    withTimeout(searchGutenberg(query, limit), 8000),
    withTimeout(searchOpenLibrary(query, limit), 8000),
    withTimeout(searchOpenStax(query, limit), 8000),
    withTimeout(searchZLibrary(query, limit), 8000),
    withTimeout(searchAnnasArchive(query, limit).then(books => {
      const policy = getSourceRightsPolicy("annas_archive")!;
      return books.map(b => ({
        title: b.title,
        author: b.author,
        description: `Anna's Archive resource. Format: ${b.format}, Size: ${b.filesize}`,
        language: b.language,
        subjects: [],
        pdfUrl: b.sourceUrl,
        sourceUrl: b.sourceUrl,
        source: "annas_archive",
        rightsStatus: policy.rightsStatus,
        licenseName: policy.licenseName,
        directDownloadAllowed: policy.allowDirectDownload,
      } as ExternalSearchResult));
    }), 12000),
  ]);
  return {
    internet_archive: internetArchive.status === "fulfilled" ? internetArchive.value : [],
    gutenberg: gutenberg.status === "fulfilled" ? gutenberg.value : [],
    open_library: openLibrary.status === "fulfilled" ? openLibrary.value : [],
    openstax: openstax.status === "fulfilled" ? openstax.value : [],
    z_library: zLibrary.status === "fulfilled" ? zLibrary.value : [],
    annas_archive: annasArchive.status === "fulfilled" ? annasArchive.value : [],
  };
}
