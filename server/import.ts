/**
 * On-demand ebook import from Project Gutenberg
 */

import { fetchGutenbergBook, extractGutenbergId } from "./gutenberg";
import { createBook, getBookByGutenbergId } from "./db";
import { TRPCError } from "@trpc/server";

export async function importGutenbergBook(urlOrId: string) {
  // Extract ID from URL or use as-is
  const gutenbergId = extractGutenbergId(urlOrId);

  if (!gutenbergId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid Gutenberg ID or URL",
    });
  }

  // Check if already imported
  const existing = await getBookByGutenbergId(gutenbergId);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Book already imported",
    });
  }

  // Fetch from Gutenberg
  const gutenbergBook = await fetchGutenbergBook(gutenbergId);
  if (!gutenbergBook) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Book not found on Project Gutenberg",
    });
  }

  // Create book in database
  const result = await createBook({
    gutenbergId,
    title: gutenbergBook.title,
    author: gutenbergBook.author,
    language: gutenbergBook.language,
    coverUrl: gutenbergBook.coverImage,
    subjects: JSON.stringify(gutenbergBook.subjects),
    formats: JSON.stringify(gutenbergBook.formats),
  });

  return result;
}
