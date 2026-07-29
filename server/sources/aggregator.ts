/**
 * Master aggregator - orchestrates all ebook sources
 * Runs on schedule via Heartbeat cron
 */

import { fetchPopularGutenbergBooks } from "../gutenberg";
import { fetchLatestDoabBooks, searchDoabBooks } from "./doab";
import { fetchOpenTextbooks } from "./open-textbook";
import { fetchKicdResources } from "./kicd";
import { fetchKnecResources } from "./knec";
import {
  createBook,
  getBookByGutenbergId,
  createAggregatorLog,
  updateAggregatorLog,
  getBookByTitleAuthor,
  getOrCreateSubject,
  linkBookToSubject,
} from "../db";

type SourceConfig = {
  name: string;
  slug: string;
  enabled: boolean;
};

const DEFAULT_SOURCES: SourceConfig[] = [
  { name: "Project Gutenberg", slug: "gutenberg", enabled: true },
  { name: "DOAB", slug: "doab", enabled: true },
  { name: "Open Textbook Library", slug: "open_textbook", enabled: true },
  { name: "KICD", slug: "kicd", enabled: true },
  { name: "KNEC", slug: "knec", enabled: true },
  { name: "AJOL", slug: "ajol", enabled: false }, // AJOL needs HTML scraping - disabled by default
];

export async function runAggregator(sourceConfigs?: SourceConfig[]) {
  const sources = sourceConfigs || DEFAULT_SOURCES;
  const results: Record<string, { added: number; updated: number; errors: number }> = {};

  // Create a master log entry
  const masterLog = await createAggregatorLog({
    source: "all",
    status: "running",
  });

  if (!masterLog) {
    throw new Error("Failed to create aggregator log");
  }

  const masterLogId = (masterLog as any).insertId || (masterLog as any)[0]?.id;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    for (const source of sources) {
      if (!source.enabled) continue;

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

async function aggregateSource(source: SourceConfig): Promise<{ added: number; updated: number; errors: number }> {
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
    default:
      return { added: 0, updated: 0, errors: 1 };
  }
}

async function aggregateGutenberg(): Promise<{ added: number; updated: number; errors: number }> {
  const books = await fetchPopularGutenbergBooks(100);
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
          formats: JSON.stringify(book.formats),
          source: "gutenberg",
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId) {
              await linkBookToSubject(bookId as number, subjectId);
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
  const books = await fetchLatestDoabBooks(50);
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
        if (book.epubUrl) formats.epub = book.epubUrl;

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
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId) {
              await linkBookToSubject(bookId as number, subjectId);
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
  const books = await fetchOpenTextbooks(50);
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
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId) {
              await linkBookToSubject(bookId as number, subjectId);
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
        if (book.downloadUrl) formats.pdf = book.downloadUrl;

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
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId) {
              await linkBookToSubject(bookId as number, subjectId);
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
        if (book.downloadUrl) formats.pdf = book.downloadUrl;

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
        });

        // Link subjects
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId) {
              await linkBookToSubject(bookId as number, subjectId);
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
  // AJOL doesn't have a clean API - placeholder for future integration
  return { added: 0, updated: 0, errors: 0 };
}
