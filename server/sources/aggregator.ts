/**
 * Master aggregator - orchestrates all 50+ ebook sources
 * Runs on schedule via Heartbeat cron or on-demand from Admin panel
 */

import { fetchPopularGutenbergBooks } from "../gutenberg";
import { fetchLatestDoabBooks } from "./doab";
import { fetchOpenTextbooks } from "./open-textbook";
import { fetchKicdResources } from "./kicd";
import { fetchKnecResources } from "./knec";
import {
  fetchInternetArchiveBooks,
  fetchOpenLibraryBooks,
  fetchOpenStaxBooks,
  fetchLibreTextsBooks,
  fetchWikibooksBooks,
  fetchWikisourceBooks,
  fetchDoajArticles,
  fetchPubMedBooks,
  fetchSaylorCourses,
  fetchOerCommonsResources,
  fetchMitOcwCourses,
  fetchCk12Books,
  fetchOpenLearnCourses,
  fetchEasyElimuResources,
  fetchAtikaSchoolResources,
  fetchKenyaplexResources,
  fetchSchoolsNetResources,
  fetchCbcResourcesKe,
  fetchTeachersUpdatesResources,
  type SourceBook,
} from "./multi-source";
import {
  getSourceRightsPolicy,
  isApprovedSource,
  selectScheduledSource,
} from "./policy";
import {
  createBook,
  getBookByGutenbergId,
  createAggregatorLog,
  updateAggregatorLog,
  getBookByTitleAuthor,
  getOrCreateSubject,
  linkBookToSubject,
  updateAggregatorSource,
  getAggregatorSources,
} from "../db";

type SourceConfig = {
  name: string;
  slug: string;
  enabled: boolean;
};

/**
 * Sources enabled for the scheduled (cron) run.
 * Only fast, reliable API-based sources are included to stay within
 * Vercel's 30-second serverless function limit.
 * Web-scraping sources can be triggered manually from the Admin panel.
 */
const DEFAULT_SOURCES: SourceConfig[] = [
  // Core open-access sources (reliable JSON APIs - fast)
  { name: "Project Gutenberg", slug: "gutenberg", enabled: true },
  { name: "Internet Archive", slug: "internet_archive", enabled: true },
  { name: "Open Library", slug: "open_library", enabled: true },
  { name: "LibreTexts", slug: "libretexts", enabled: true },
  { name: "Wikibooks", slug: "wikibooks", enabled: true },
  { name: "Wikisource", slug: "wikisource", enabled: true },
  { name: "DOAJ", slug: "doaj", enabled: true },
  { name: "OpenStax", slug: "openstax", enabled: true },
  { name: "DOAB", slug: "doab", enabled: true },
  { name: "Open Textbook Library", slug: "open_textbook", enabled: true },
  { name: "Saylor Academy", slug: "saylor", enabled: true },
  { name: "MIT OpenCourseWare", slug: "mit_ocw", enabled: true },
  { name: "CK-12", slug: "ck12", enabled: true },
  // Slower sources - disabled in scheduled run, use Admin panel to run manually
  { name: "PubMed Central", slug: "pubmed", enabled: false },
  { name: "OER Commons", slug: "oer_commons", enabled: false },
  { name: "OpenLearn", slug: "openlearn", enabled: false },
  // Kenyan web-scraping sources - disabled in scheduled run
  { name: "KICD", slug: "kicd", enabled: true },
  { name: "KNEC", slug: "knec", enabled: true },
  { name: "AJOL", slug: "ajol", enabled: false },
  { name: "Easy Elimu", slug: "easy_elimu", enabled: false },
  { name: "Atika School", slug: "atika_school", enabled: false },
  { name: "KenyaPlex", slug: "kenyaplex", enabled: false },
  { name: "Schools Net Kenya", slug: "schools_net", enabled: false },
  { name: "CBC Resources", slug: "cbc_resources", enabled: false },
  { name: "Teachers Updates", slug: "teachers_updates", enabled: false },
];

/** Maximum time (ms) the aggregator may run before aborting remaining sources */
const AGGREGATOR_TIMEOUT_MS = 25000; // 25 seconds - leaves 5s buffer for Vercel's 30s limit

export async function runAggregator(sourceConfigs?: SourceConfig[]) {
  const requestedSources = sourceConfigs ?? DEFAULT_SOURCES.filter(source => isApprovedSource(source.slug));
  const unsupportedSource = requestedSources.find(source => source.enabled && !isApprovedSource(source.slug));
  if (unsupportedSource) {
    throw new Error(`Source '${unsupportedSource.slug}' is not approved for automated ingestion`);
  }

  const sources = requestedSources.filter(source => source.enabled);
  const results: Record<string, { added: number; updated: number; errors: number }> = {};

  // Create a master log entry
  const masterLog = await createAggregatorLog({
    source: "all",
    status: "running",
  });

  if (!masterLog) {
    throw new Error("Failed to create aggregator log");
  }

  const masterLogId = (masterLog as any).id;
  let totalAdded = 0;
  let totalUpdated = 0;
  const startTime = Date.now();

  try {
    for (const source of sources) {
      if (!source.enabled) continue;

      // Abort if we're approaching the serverless timeout
      if (Date.now() - startTime > AGGREGATOR_TIMEOUT_MS) {
        console.warn(`[Aggregator] Timeout reached after ${Date.now() - startTime}ms, stopping early`);
        break;
      }

      try {
        const sourceResult = await aggregateSource(source);
        results[source.slug] = sourceResult;
        totalAdded += sourceResult.added;
        totalUpdated += sourceResult.updated;

        // Create individual source log
        await createAggregatorLog({
          source: source.slug,
          status: "success",
          booksAdded: sourceResult.added,
          booksUpdated: sourceResult.updated,
        });

        // Update source last run time
        try {
          const allSources = await getAggregatorSources();
          const dbSource = allSources.find(s => s.slug === source.slug);
          if (dbSource) {
            await updateAggregatorSource(dbSource.id, {
              lastRunAt: new Date(),
              booksFetched: (dbSource.booksFetched || 0) + sourceResult.added,
            });
          }
        } catch {
          // Non-critical
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results[source.slug] = { added: 0, updated: 0, errors: 1 };

        // Log individual source failure
        await createAggregatorLog({
          source: source.slug,
          status: "failed",
          errorMessage,
        });
      }
    }

    // Update master log
    await updateAggregatorLog(masterLogId, {
      status: "success",
      booksAdded: totalAdded,
      booksUpdated: totalUpdated,
      completedAt: new Date(),
    });

    return {
      success: true,
      totalAdded,
      totalUpdated,
      results,
      masterLogId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await updateAggregatorLog(masterLogId, {
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    });

    throw error;
  }
}

export async function runScheduledAggregator(now = new Date()) {
  const scheduledSlug = selectScheduledSource(now);
  const source = DEFAULT_SOURCES.find(candidate => candidate.slug === scheduledSlug);
  if (!source) {
    throw new Error(`Scheduled source '${scheduledSlug}' is not configured`);
  }

  return runAggregator([{ ...source, enabled: true }]);
}

async function aggregateSource(source: SourceConfig): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy(source.slug);
  if (!rightsPolicy) {
    throw new Error(`Source '${source.slug}' is not approved for automated ingestion`);
  }

  switch (source.slug) {
    case "gutenberg":
      return aggregateGutenberg();
    case "doab":
      return aggregateDoab();
    case "open_textbook":
      return aggregateOpenTextbook();
    case "kicd":
      return aggregateKicd();
    case "knec":
      return aggregateKnec();
    case "ajol":
      return aggregateAjol();
    case "internet_archive":
      return aggregateGenericSource(fetchInternetArchiveBooks, "internet_archive", "general");
    case "open_library":
      return aggregateGenericSource(fetchOpenLibraryBooks, "open_library", "general");
    case "openstax":
      return aggregateGenericSource(fetchOpenStaxBooks, "openstax", "college");
    case "libretexts":
      return aggregateGenericSource(fetchLibreTextsBooks, "libretexts", "college");
    case "wikibooks":
      return aggregateGenericSource(fetchWikibooksBooks, "wikibooks", "general");
    case "wikisource":
      return aggregateGenericSource(fetchWikisourceBooks, "wikisource", "general");
    case "doaj":
      return aggregateGenericSource(fetchDoajArticles, "doaj", "university");
    case "pubmed":
      return aggregateGenericSource(fetchPubMedBooks, "pubmed", "university");
    case "saylor":
      return aggregateGenericSource(fetchSaylorCourses, "saylor", "college");
    case "oer_commons":
      return aggregateGenericSource(fetchOerCommonsResources, "oer_commons", "general");
    case "mit_ocw":
      return aggregateGenericSource(fetchMitOcwCourses, "mit_ocw", "university");
    case "ck12":
      return aggregateGenericSource(fetchCk12Books, "ck12", "high_school");
    case "openlearn":
      return aggregateGenericSource(fetchOpenLearnCourses, "openlearn", "college");
    case "easy_elimu":
      return aggregateGenericSource(fetchEasyElimuResources, "easy_elimu", "primary");
    case "atika_school":
      return aggregateGenericSource(fetchAtikaSchoolResources, "atika_school", "high_school");
    case "kenyaplex":
      return aggregateGenericSource(fetchKenyaplexResources, "kenyaplex", "high_school");
    case "schools_net":
      return aggregateGenericSource(fetchSchoolsNetResources, "schools_net", "primary");
    case "cbc_resources":
      return aggregateGenericSource(fetchCbcResourcesKe, "cbc_resources", "primary");
    case "teachers_updates":
      return aggregateGenericSource(fetchTeachersUpdatesResources, "teachers_updates", "high_school");
    default:
      return { added: 0, updated: 0, errors: 0 };
  }
}

/**
 * Generic aggregator for sources that return SourceBook[]
 */
async function aggregateGenericSource(
  fetchFn: (limit?: number) => Promise<SourceBook[]>,
  sourceSlug: string,
  defaultLevel: string
): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy(sourceSlug);
  if (!rightsPolicy) {
    throw new Error(`Source '${sourceSlug}' is not approved for automated ingestion`);
  }

  const books = await fetchFn(25);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    if (!book.title || book.title.length < 3) continue;
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (rightsPolicy.allowDirectDownload && book.pdfUrl) formats.pdf = book.pdfUrl;

        const bookId = await createBook({
          title: book.title.substring(0, 255),
          author: (book.author || "Unknown").substring(0, 255),
          description: book.description || "",
          language: (book.language || "en").substring(0, 10),
          coverUrl: book.coverUrl || "",
          subjects: JSON.stringify((book.subjects || []).slice(0, 10)),
          formats: JSON.stringify(formats),
          source: sourceSlug as any,
          sourceUrl: book.sourceUrl || "",
          publisher: book.publisher || "",
          publishedDate: book.publishedDate || "",
          isbn: book.isbn || undefined,
          pages: book.pages || undefined,
          educationalLevel: (book.educationalLevel || defaultLevel) as any,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            if (subject && subject.length > 1) {
              const subjectId = await getOrCreateSubject(subject);
              if (subjectId && typeof bookId === "number") {
                await linkBookToSubject(bookId, subjectId);
              }
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateGutenberg(): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy("gutenberg");
  if (!rightsPolicy) throw new Error("Missing Gutenberg rights policy");
  const books = await fetchPopularGutenbergBooks(32); // Gutendex returns max 32 per page
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const existing = await getBookByGutenbergId(book.id);
      if (existing) {
        updated++;
      } else {
        const bookId = await createBook({
          gutenbergId: book.id,
          title: book.title,
          author: book.author,
          language: book.language,
          coverUrl: book.coverImage,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(book.formats ? { pdf: (book.formats as any).pdf || (book.formats as any)["application/pdf"] } : {}),
          source: "gutenberg",
          sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateDoab(): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy("doab");
  if (!rightsPolicy) throw new Error("Missing DOAB rights policy");
  const books = await fetchLatestDoabBooks(25);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (book.pdfUrl) formats.pdf = book.pdfUrl;

        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.imageUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "doab",
          sourceUrl: `https://directory.doabooks.org/rest/search?query=${encodeURIComponent(book.title)}`,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          isbn: book.isbn || undefined,
          educationalLevel: "university",
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateOpenTextbook(): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy("open_textbook");
  if (!rightsPolicy) throw new Error("Missing Open Textbook rights policy");
  const books = await fetchOpenTextbooks(25);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (book.pdfUrl) formats.pdf = book.pdfUrl;

        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "open_textbook",
          sourceUrl: `https://open.umn.edu/opentextbooks/textbooks/${book.id}`,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pages: book.pages,
          educationalLevel: "college",
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateKicd(): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy("kicd");
  if (!rightsPolicy) throw new Error("Missing KICD rights policy");
  const books = await fetchKicdResources(30);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (rightsPolicy.allowDirectDownload && book.downloadUrl) formats.pdf = book.downloadUrl;

        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "kicd",
          sourceUrl: book.sourceUrl,
          publishedDate: book.publishedDate,
          educationalLevel: book.educationalLevel as any,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateKnec(): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy("knec");
  if (!rightsPolicy) throw new Error("Missing KNEC rights policy");
  const books = await fetchKnecResources(30);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (rightsPolicy.allowDirectDownload && book.downloadUrl) formats.pdf = book.downloadUrl;

        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "knec",
          sourceUrl: book.sourceUrl,
          educationalLevel: book.educationalLevel as any,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}

async function aggregateAjol(): Promise<{ added: number; updated: number; errors: number }> {
  // AJOL - use their OAI-PMH endpoint for open access articles
  try {
    const { fetchAjolBooks } = await import("./ajol");
    return aggregateGenericSource(fetchAjolBooks, "ajol", "university");
  } catch {
    return { added: 0, updated: 0, errors: 0 };
  }
}

async function aggregateGenericKenyanSource(
  fetchFn: (limit?: number) => Promise<SourceBook[]>,
  sourceSlug: string,
  defaultLevel: string
): Promise<{ added: number; updated: number; errors: number }> {
  const rightsPolicy = getSourceRightsPolicy(sourceSlug);
  if (!rightsPolicy) throw new Error(`Source '${sourceSlug}' is not approved for automated ingestion`);
  const books = await fetchFn(30);
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    if (!book.title || book.title.length < 3) continue;
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats: Record<string, string> = {};
        if (rightsPolicy.allowDirectDownload && (book as any).pdfUrl) formats.pdf = (book as any).pdfUrl;

        const bookId = await createBook({
          title: book.title.substring(0, 255),
          author: (book.author || "Unknown").substring(0, 255),
          description: book.description || "",
          language: (book.language || "en").substring(0, 10),
          coverUrl: book.coverUrl || "",
          subjects: JSON.stringify((book.subjects || []).slice(0, 10)),
          formats: JSON.stringify(formats),
          source: sourceSlug as any,
          sourceUrl: book.sourceUrl || "",
          publisher: book.publisher || "",
          publishedDate: book.publishedDate || "",
          isbn: book.isbn || undefined,
          pages: book.pages || undefined,
          educationalLevel: (book.educationalLevel || defaultLevel) as any,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: new Date(),
        });

        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            if (subject && subject.length > 1) {
              const subjectId = await getOrCreateSubject(subject);
              if (subjectId && typeof bookId === "number") {
                await linkBookToSubject(bookId, subjectId);
              }
            }
          }
        }

        added++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { added, updated, errors };
}
