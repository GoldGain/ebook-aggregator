export type SourceCategory =
  | "books"
  | "academic_papers"
  | "journals"
  | "research_data"
  | "textbooks"
  | "kenyan_research"
  | "courses";

export type SourceDefinition = {
  key: string;
  displayName: string;
  category: SourceCategory;
  apiUrl?: string;
  websiteUrl: string;
  rightsStatus: "public_domain" | "open_access" | "metadata_only";
  licenseName: string;
  licenseUrl?: string;
  allowDirectDownload: boolean;
  adapter: string;
  enabled: boolean;
  requiresApiKey?: string;
};

/**
 * Registry-first architecture: every provider is declared here before an
 * adapter is enabled. This keeps future source additions auditable and avoids
 * scattering rights and provenance decisions through search code.
 */
export const SOURCE_REGISTRY: SourceDefinition[] = [
  { key: "internet_archive", displayName: "Internet Archive", category: "books", apiUrl: "https://archive.org/advancedsearch.php", websiteUrl: "https://archive.org", rightsStatus: "open_access", licenseName: "Open-access or public-domain item", licenseUrl: "https://archive.org/about/terms.php", allowDirectDownload: true, adapter: "internet_archive", enabled: true },
  { key: "open_library", displayName: "Open Library", category: "books", apiUrl: "https://openlibrary.org/search.json", websiteUrl: "https://openlibrary.org", rightsStatus: "metadata_only", licenseName: "Bibliographic metadata; edition rights vary", licenseUrl: "https://openlibrary.org/developers/api", allowDirectDownload: false, adapter: "open_library", enabled: true },
  { key: "gutenberg", displayName: "Project Gutenberg", category: "books", apiUrl: "https://gutendex.com/books", websiteUrl: "https://www.gutenberg.org", rightsStatus: "public_domain", licenseName: "Project Gutenberg public-domain collection", licenseUrl: "https://www.gutenberg.org/policy/license.html", allowDirectDownload: true, adapter: "gutenberg", enabled: true },
  { key: "doab", displayName: "DOAB", category: "books", apiUrl: "https://directory.doabooks.org/rest/search", websiteUrl: "https://www.doabooks.org", rightsStatus: "open_access", licenseName: "Open-access book; see publisher record", allowDirectDownload: true, adapter: "doab", enabled: true },
  { key: "oapen", displayName: "OAPEN Library", category: "books", apiUrl: "https://library.oapen.org/rest/search", websiteUrl: "https://www.oapen.org", rightsStatus: "open_access", licenseName: "Open-access book; see item license", licenseUrl: "https://www.oapen.org/content/license", allowDirectDownload: true, adapter: "oapen", enabled: true },
  { key: "openstax", displayName: "OpenStax", category: "textbooks", apiUrl: "https://openstax.org/api/v2/books/", websiteUrl: "https://openstax.org", rightsStatus: "open_access", licenseName: "OpenStax openly licensed textbook", licenseUrl: "https://openstax.org/subjects", allowDirectDownload: true, adapter: "openstax", enabled: true },
  { key: "arxiv", displayName: "arXiv", category: "academic_papers", apiUrl: "https://export.arxiv.org/api/query", websiteUrl: "https://arxiv.org", rightsStatus: "open_access", licenseName: "Repository copy; item license varies", licenseUrl: "https://info.arxiv.org/help/license/index.html", allowDirectDownload: true, adapter: "arxiv", enabled: true },
  { key: "europe_pmc", displayName: "Europe PMC", category: "academic_papers", apiUrl: "https://www.ebi.ac.uk/europepmc/webservices/rest/search", websiteUrl: "https://europepmc.org", rightsStatus: "open_access", licenseName: "Open-access full text where marked", licenseUrl: "https://europepmc.org/downloads", allowDirectDownload: true, adapter: "europe_pmc", enabled: true },
  { key: "pubmed_central", displayName: "PubMed Central", category: "journals", apiUrl: "https://www.ncbi.nlm.nih.gov/pmc/utils/esearch.fcgi", websiteUrl: "https://pmc.ncbi.nlm.nih.gov", rightsStatus: "open_access", licenseName: "PMC full-text rights vary by article", licenseUrl: "https://pmc.ncbi.nlm.nih.gov/about/copyright/", allowDirectDownload: true, adapter: "pubmed_central", enabled: true },
  { key: "crossref", displayName: "Crossref", category: "academic_papers", apiUrl: "https://api.crossref.org/works", websiteUrl: "https://www.crossref.org", rightsStatus: "metadata_only", licenseName: "DOI metadata; publisher rights apply", licenseUrl: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/", allowDirectDownload: false, adapter: "crossref", enabled: true },
  { key: "openalex", displayName: "OpenAlex", category: "academic_papers", apiUrl: "https://api.openalex.org/works", websiteUrl: "https://openalex.org", rightsStatus: "metadata_only", licenseName: "Scholarly metadata; OA locations vary", licenseUrl: "https://creativecommons.org/public-domain/cc0/", allowDirectDownload: true, adapter: "openalex", enabled: true, requiresApiKey: "OPENALEX_API_KEY" },
  { key: "doaj", displayName: "DOAJ", category: "journals", apiUrl: "https://doaj.org/api/search/articles", websiteUrl: "https://doaj.org", rightsStatus: "open_access", licenseName: "Open-access article; license is item-specific", licenseUrl: "https://doaj.org/apply/transparency/", allowDirectDownload: true, adapter: "doaj", enabled: true },
  { key: "zenodo", displayName: "Zenodo", category: "research_data", apiUrl: "https://zenodo.org/api/records", websiteUrl: "https://zenodo.org", rightsStatus: "open_access", licenseName: "Item-specific open license", licenseUrl: "https://about.zenodo.org/principles/", allowDirectDownload: true, adapter: "zenodo", enabled: true },
  { key: "core", displayName: "CORE", category: "academic_papers", apiUrl: "https://api.core.ac.uk/v3/search/works", websiteUrl: "https://core.ac.uk", rightsStatus: "metadata_only", licenseName: "Repository metadata; item rights vary", licenseUrl: "https://core.ac.uk/documentation/api", allowDirectDownload: true, adapter: "core", enabled: true, requiresApiKey: "CORE_API_KEY" },
  { key: "ajol", displayName: "African Journals Online", category: "journals", apiUrl: "https://www.ajol.info/index.php/ajol/oai", websiteUrl: "https://www.ajol.info", rightsStatus: "open_access", licenseName: "Open-access article where licensed", licenseUrl: "https://www.ajol.info", allowDirectDownload: false, adapter: "ajol", enabled: true },
  { key: "university_of_nairobi", displayName: "University of Nairobi Repository", category: "kenyan_research", websiteUrl: "https://erepository.uonbi.ac.ke", rightsStatus: "open_access", licenseName: "Repository item license", allowDirectDownload: false, adapter: "repository", enabled: false },
  { key: "university_of_eldoret", displayName: "University of Eldoret Repository", category: "kenyan_research", websiteUrl: "https://repository.uoeld.ac.ke", rightsStatus: "open_access", licenseName: "Repository item license", allowDirectDownload: false, adapter: "repository", enabled: false },
  { key: "african_books_collective", displayName: "African Books Collective", category: "books", websiteUrl: "https://www.africanbookscollective.com", rightsStatus: "metadata_only", licenseName: "Publisher-specific rights", allowDirectDownload: false, adapter: "publisher_catalog", enabled: false },
  { key: "biomed_central", displayName: "BioMed Central", category: "journals", websiteUrl: "https://www.biomedcentral.com", rightsStatus: "open_access", licenseName: "Article-specific open license", licenseUrl: "https://www.biomedcentral.com/getpublished/open-access", allowDirectDownload: false, adapter: "crossref", enabled: true },
  { key: "plos", displayName: "PLOS", category: "journals", websiteUrl: "https://plos.org", rightsStatus: "open_access", licenseName: "PLOS open license; article-specific terms", licenseUrl: "https://plos.org/open-science/open-access/", allowDirectDownload: false, adapter: "crossref", enabled: true },
  { key: "peerj", displayName: "PeerJ", category: "journals", websiteUrl: "https://peerj.com", rightsStatus: "open_access", licenseName: "Article-specific Creative Commons license", licenseUrl: "https://peerj.com/about/policies-and-standards/open-access/", allowDirectDownload: false, adapter: "crossref", enabled: true },
  { key: "springer_open", displayName: "SpringerOpen", category: "journals", websiteUrl: "https://www.springeropen.com", rightsStatus: "open_access", licenseName: "Article-specific open license", licenseUrl: "https://www.springeropen.com/about", allowDirectDownload: false, adapter: "crossref", enabled: true },
  { key: "mit_ocw", displayName: "MIT OpenCourseWare", category: "courses", websiteUrl: "https://ocw.mit.edu", rightsStatus: "open_access", licenseName: "CC BY-NC-SA", licenseUrl: "https://ocw.mit.edu/terms/", allowDirectDownload: false, adapter: "catalog", enabled: true },
  { key: "ck12", displayName: "CK-12", category: "textbooks", websiteUrl: "https://www.ck12.org", rightsStatus: "open_access", licenseName: "CK-12 item license", licenseUrl: "https://www.ck12.org/about/terms-of-use/", allowDirectDownload: false, adapter: "catalog", enabled: true },
  { key: "saylor", displayName: "Saylor Academy", category: "courses", websiteUrl: "https://learn.saylor.org", rightsStatus: "open_access", licenseName: "Saylor item license", licenseUrl: "https://learn.saylor.org/course/index.php", allowDirectDownload: false, adapter: "catalog", enabled: true },
];

export function getSourceDefinition(key: string): SourceDefinition | undefined {
  return SOURCE_REGISTRY.find((source) => source.key === key);
}

export function getEnabledSources(): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((source) => source.enabled);
}

export function getSourceRegistrySummary() {
  return SOURCE_REGISTRY.reduce<Record<string, number>>((summary, source) => {
    summary[source.category] = (summary[source.category] || 0) + 1;
    return summary;
  }, {});
}
