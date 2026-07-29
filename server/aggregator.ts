/**
 * Automated bulk aggregator for Project Gutenberg books
 * Runs on a schedule via Heartbeat cron
 */

import { fetchPopularGutenbergBooks } from "./gutenberg";
import { createBook, getBookByGutenbergId, createAggregatorLog, updateAggregatorLog } from "./db";
import { InsertAggregatorLog } from "../drizzle/schema";

export async function runAggregator() {
  // Create a log entry
  const logResult = await createAggregatorLog({
    status: "running",
  });

  if (!logResult) {
    throw new Error("Failed to create aggregator log");
  }

  const logId = (logResult as any).insertId || (logResult as any)[0]?.id;

  try {
    // Fetch popular books from Gutenberg
    const books = await fetchPopularGutenbergBooks(100);

    let booksAdded = 0;
    let booksUpdated = 0;

    // Process each book
    for (const book of books) {
      try {
        // Check if already exists
        const existing = await getBookByGutenbergId(book.id);

        if (existing) {
          booksUpdated++;
        } else {
          // Create new book
          await createBook({
            gutenbergId: book.id,
            title: book.title,
            author: book.author,
            language: book.language,
            coverUrl: book.coverImage,
            subjects: JSON.stringify(book.subjects),
            formats: JSON.stringify(book.formats),
          });
          booksAdded++;
        }
      } catch (error) {
        console.error(`Failed to process book ${book.id}:`, error);
        // Continue with next book
      }
    }

    // Update log with success
    await updateAggregatorLog(logId, {
      status: "success",
      booksAdded,
      booksUpdated,
      completedAt: new Date(),
    });

    return {
      success: true,
      booksAdded,
      booksUpdated,
      logId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update log with failure
    await updateAggregatorLog(logId, {
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    });

    throw error;
  }
}
