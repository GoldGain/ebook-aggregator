export type RightsStatus = "public_domain" | "open_access" | "metadata_only" | "unknown";

export type SourceRightsPolicy = {
  rightsStatus: RightsStatus;
  licenseName: string;
  licenseUrl?: string;
  allowDirectDownload: boolean;
};

/**
 * Providers approved for ingestion because they expose public-domain, open-access,
 * or discovery-only material through documented APIs or structured metadata feeds.
 * All other source slugs require a documented rights review before they can run.
 */
export const APPROVED_SOURCE_POLICIES: Record<string, SourceRightsPolicy> = {
  gutenberg: {
    rightsStatus: "public_domain",
    licenseName: "Project Gutenberg public-domain collection",
    licenseUrl: "https://www.gutenberg.org/policy/license.html",
    allowDirectDownload: true,
  },
  doab: {
    rightsStatus: "open_access",
    licenseName: "Open-access book; see publisher record for license terms",
    licenseUrl: "https://www.doabooks.org/",
    allowDirectDownload: true,
  },
  open_textbook: {
    rightsStatus: "open_access",
    licenseName: "Open textbook; see source record for license terms",
    licenseUrl: "https://open.umn.edu/opentextbooks/",
    allowDirectDownload: true,
  },
  openstax: {
    rightsStatus: "open_access",
    licenseName: "OpenStax openly licensed textbook",
    licenseUrl: "https://openstax.org/details/books",
    allowDirectDownload: true,
  },
  wikibooks: {
    rightsStatus: "open_access",
    licenseName: "Wikibooks free-content resource",
    licenseUrl: "https://en.wikibooks.org/wiki/Wikibooks:Copyrights",
    allowDirectDownload: false,
  },
  wikisource: {
    rightsStatus: "public_domain",
    licenseName: "Wikisource free-content or public-domain text",
    licenseUrl: "https://en.wikisource.org/wiki/Wikisource:Copyright_policy",
    allowDirectDownload: false,
  },
  doaj: {
    rightsStatus: "open_access",
    licenseName: "Open-access article indexed by DOAJ",
    licenseUrl: "https://doaj.org/apply/transparency",
    allowDirectDownload: true,
  },
  pubmed: {
    rightsStatus: "open_access",
    licenseName: "Open-access article indexed by PubMed Central",
    licenseUrl: "https://pmc.ncbi.nlm.nih.gov/about/",
    allowDirectDownload: false,
  },
  ajol: {
    rightsStatus: "open_access",
    licenseName: "Open-access article indexed by African Journals Online",
    licenseUrl: "https://www.ajol.info/",
    allowDirectDownload: false,
  },
  open_library: {
    rightsStatus: "metadata_only",
    licenseName: "Discovery metadata; access remains subject to the source record",
    licenseUrl: "https://openlibrary.org/developers/api",
    allowDirectDownload: false,
  },
};

/**
 * Smaller rotation for a serverless schedule. Each source is invoked separately
 * so one run can finish within the platform duration limit.
 */
export const SCHEDULED_SOURCE_SLUGS = [
  "gutenberg",
  "doab",
  "open_textbook",
  "openstax",
] as const;

export function getSourceRightsPolicy(sourceSlug: string): SourceRightsPolicy | null {
  return APPROVED_SOURCE_POLICIES[sourceSlug] ?? null;
}

export function isApprovedSource(sourceSlug: string): boolean {
  return getSourceRightsPolicy(sourceSlug) !== null;
}

export function selectScheduledSource(now = new Date()): string {
  const utcDay = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  return SCHEDULED_SOURCE_SLUGS[utcDay % SCHEDULED_SOURCE_SLUGS.length];
}
