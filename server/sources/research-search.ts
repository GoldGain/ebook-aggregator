import type { ExternalSearchResult } from "./external-search";
import { getSourceRightsPolicy, isApprovedSource } from "./policy";

const HEADERS = { "User-Agent": "ZAMIFU-E-MATERIALS/2.0 (open-access research aggregator)", Accept: "application/json" };

async function json(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers || {}) }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function policy(source: string) {
  return getSourceRightsPolicy(source) || { rightsStatus: "open_access", licenseName: "Item-specific open-access terms", licenseUrl: undefined, allowDirectDownload: false };
}

function result(source: string, value: Partial<ExternalSearchResult> & Pick<ExternalSearchResult, "title">): ExternalSearchResult {
  const p = policy(source);
  return {
    title: value.title,
    author: value.author || "",
    description: value.description || "Open-access research record.",
    language: value.language || "en",
    subjects: value.subjects || [],
    year: value.year,
    pages: value.pages,
    publisher: value.publisher,
    coverUrl: value.coverUrl,
    pdfUrl: value.directDownloadAllowed === false ? undefined : value.pdfUrl,
    sourceUrl: value.sourceUrl || value.pdfUrl || "",
    source,
    rightsStatus: value.rightsStatus || p.rightsStatus,
    licenseName: value.licenseName || p.licenseName,
    licenseUrl: value.licenseUrl || p.licenseUrl,
    directDownloadAllowed: value.directDownloadAllowed ?? Boolean(value.pdfUrl && p.allowDirectDownload),
  };
}

export async function searchArxiv(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("arxiv")) return [];
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(limit, 20)}`;
    const xml = await (await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: AbortSignal.timeout(9000) })).text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, limit).map((m) => {
      const body = m[1];
      const pick = (tag: string) => body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() || "";
      const id = pick("id");
      const pdf = (body.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/)?.[1] || (id ? id.replace("abs/", "pdf/") : "")).replace(/^http:\/\//i, "https://");
      return result("arxiv", { title: pick("title").replace(/\s+/g, " "), author: [...body.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map((x) => x[1].trim()).join(", "), description: pick("summary").replace(/\s+/g, " "), pdfUrl: pdf, sourceUrl: id, year: pick("published").slice(0, 4), subjects: [...body.matchAll(/<category[^>]+term="([^"]+)"/g)].map((x) => x[1]).slice(0, 5), directDownloadAllowed: Boolean(pdf) });
    }).filter((x) => x.title.length > 2);
  } catch { return []; }
}

export async function searchEuropePmc(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("europe_pmc")) return [];
  try {
    const data = await json(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${Math.min(limit, 25)}`);
    return (data?.resultList?.result || []).slice(0, limit).map((item: any) => {
      const pmcid = item.pmcid || "";
      const pdf = pmcid ? `https://europepmc.org/api/getPdf?pmcid=${encodeURIComponent(pmcid)}` : undefined;
      return result("europe_pmc", { title: item.title || "", author: item.authorString || "", description: item.abstractText || "Open-access life-sciences publication.", year: item.firstPublicationDate?.slice(0, 4), sourceUrl: `https://europepmc.org/article/${item.source}/${item.id}`, pdfUrl: item.isOpenAccess === "Y" ? pdf : undefined, directDownloadAllowed: item.isOpenAccess === "Y" && Boolean(pdf) });
    }).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchCrossref(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("crossref")) return [];
  try {
    const data = await json(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${Math.min(limit, 20)}&select=DOI,title,author,published,URL,link,container-title,publisher`);
    return (data?.message?.items || []).slice(0, limit).map((item: any) => {
      const link = (item.link || []).find((l: any) => /pdf/i.test(l["content-type"] || ""))?.URL;
      return result("crossref", { title: item.title?.[0] || "", author: (item.author || []).slice(0, 3).map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).join(", "), publisher: item.publisher, year: String(item.published?.["date-parts"]?.[0]?.[0] || ""), sourceUrl: item.URL || `https://doi.org/${item.DOI}`, pdfUrl: link, directDownloadAllowed: false });
    }).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchOpenAlex(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("openalex")) return [];
  try {
    const key = process.env.OPENALEX_API_KEY;
    const suffix = key ? `&api_key=${encodeURIComponent(key)}` : "";
    const data = await json(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${Math.min(limit, 20)}${suffix}`);
    return (data?.results || []).slice(0, limit).map((item: any) => {
      const loc = item.best_oa_location || item.primary_location || {};
      return result("openalex", { title: item.title || "", author: item.authorships?.[0]?.author?.display_name || "", description: "Scholarly work with open-access location metadata.", year: item.publication_year ? String(item.publication_year) : undefined, sourceUrl: item.doi || item.id || "", pdfUrl: loc.is_oa ? (loc.pdf_url || undefined) : undefined, directDownloadAllowed: Boolean(loc.is_oa && loc.pdf_url) });
    }).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchDoaj(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("doaj")) return [];
  try {
    const data = await json(`https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=${Math.min(limit, 20)}`);
    return (data?.results || []).slice(0, limit).map((item: any) => {
      const b = item.bibjson || {};
      const fulltext = (b.link || []).find((l: any) => /pdf/i.test(`${l.type || ""} ${l.url || ""}`) || /\.pdf(?:$|[?#])/i.test(l.url || ""))?.url;
      return result("doaj", { title: b.title || "", author: (b.author || []).slice(0, 3).map((a: any) => a.name).join(", "), description: b.abstract || "Open-access journal article.", year: b.year, sourceUrl: b.link?.[0]?.url || fulltext || "", pdfUrl: fulltext, directDownloadAllowed: Boolean(fulltext) });
    }).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchZenodo(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("zenodo")) return [];
  try {
    const data = await json(`https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=${Math.min(limit, 20)}`);
    return (data?.hits?.hits || []).slice(0, limit).map((item: any) => {
      const file = (item.files || []).find((f: any) => /pdf/i.test(f.key || f.type || ""));
      return result("zenodo", { title: item.metadata?.title || "", author: (item.metadata?.creators || []).slice(0, 3).map((a: any) => a.name).join(", "), description: item.metadata?.description || "Open research record.", year: item.metadata?.publication_date?.slice(0, 4), sourceUrl: `https://zenodo.org/records/${item.id}`, pdfUrl: file?.links?.self, directDownloadAllowed: Boolean(file?.links?.self) });
    }).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchCore(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  if (!isApprovedSource("core") || !process.env.CORE_API_KEY) return [];
  try {
    const data = await json(`https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`, { headers: { Authorization: `Bearer ${process.env.CORE_API_KEY}` } });
    return (data?.results || []).slice(0, limit).map((item: any) => result("core", { title: item.title || "", author: (item.authors || []).slice(0, 3).map((a: any) => a.name).join(", "), description: item.abstract || "Open research repository record.", year: item.yearPublished ? String(item.yearPublished) : undefined, sourceUrl: item.downloadUrl || item.links?.[0]?.url || `https://core.ac.uk/works/${item.id}`, pdfUrl: item.downloadUrl, directDownloadAllowed: Boolean(item.downloadUrl) })).filter((x: ExternalSearchResult) => x.title.length > 2);
  } catch { return []; }
}

export async function searchResearchSources(query: string, limit = 8): Promise<ExternalSearchResult[]> {
  const jobs = await Promise.allSettled([
    searchArxiv(query, limit),
    searchEuropePmc(query, limit),
    searchCrossref(query, limit),
    searchOpenAlex(query, limit),
    searchDoaj(query, limit),
    searchZenodo(query, limit),
    searchCore(query, limit),
  ]);
  return jobs.flatMap((job) => job.status === "fulfilled" ? job.value : []);
}
