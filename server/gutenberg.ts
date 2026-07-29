/**
 * Project Gutenberg API integration for fetching book metadata and formats
 */

export interface GutenbergBook {
  id: number;
  title: string;
  author?: string;
  language: string;
  subjects: string[];
  formats: {
    epub?: string;
    pdf?: string;
    txt?: string;
    html?: string;
  };
  coverImage?: string;
}

const GUTENBERG_API = "https://gutendex.com/books";

/**
 * Fetch a single book from Project Gutenberg by ID
 */
export async function fetchGutenbergBook(gutenbergId: number): Promise<GutenbergBook | null> {
  try {
    const response = await fetch(`${GUTENBERG_API}/${gutenbergId}`);
    if (!response.ok) return null;

    const data = await response.json() as any;
    return parseGutenbergBook(data);
  } catch (error) {
    console.error(`Failed to fetch Gutenberg book ${gutenbergId}:`, error);
    return null;
  }
}

/**
 * Search for books on Project Gutenberg
 */
export async function searchGutenbergBooks(query: string, limit: number = 20): Promise<GutenbergBook[]> {
  try {
    const response = await fetch(`${GUTENBERG_API}?search=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) return [];

    const data = await response.json() as any;
    return (data.results || []).map(parseGutenbergBook).filter(Boolean);
  } catch (error) {
    console.error("Failed to search Gutenberg books:", error);
    return [];
  }
}

/**
 * Fetch books by language
 */
export async function fetchGutenbergBooksByLanguage(
  language: string,
  limit: number = 20,
  offset: number = 0
): Promise<GutenbergBook[]> {
  try {
    const response = await fetch(
      `${GUTENBERG_API}?topic=${encodeURIComponent(language)}&limit=${limit}&offset=${offset}`
    );
    if (!response.ok) return [];

    const data = await response.json() as any;
    return (data.results || []).map(parseGutenbergBook).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch Gutenberg books by language:", error);
    return [];
  }
}

/**
 * Parse a Gutenberg API response into our GutenbergBook format
 */
function parseGutenbergBook(data: any): GutenbergBook | null {
  if (!data || !data.id || !data.title) return null;

  const formats: GutenbergBook["formats"] = {};

  // Extract format URLs
  if (data.formats) {
    if (data.formats["application/epub+zip"]) {
      formats.epub = data.formats["application/epub+zip"];
    }
    if (data.formats["application/x-mobipocket-ebook"]) {
      formats.epub = data.formats["application/x-mobipocket-ebook"];
    }
    if (data.formats["application/pdf"]) {
      formats.pdf = data.formats["application/pdf"];
    }
    if (data.formats["text/plain"]) {
      formats.txt = data.formats["text/plain"];
    }
    if (data.formats["text/html"]) {
      formats.html = data.formats["text/html"];
    }
  }

  // Extract author
  let author: string | undefined;
  if (data.authors && data.authors.length > 0) {
    author = data.authors[0].name;
  }

  // Extract language (default to English)
  const language = data.languages?.[0] || "en";

  // Extract subjects
  const subjects = [
    ...(data.subjects || []),
    ...(data.bookshelves || []),
  ].slice(0, 10);

  // Extract cover image
  const coverImage = data.cover_image;

  return {
    id: data.id,
    title: data.title,
    author,
    language,
    subjects,
    formats,
    coverImage,
  };
}

/**
 * Fetch a batch of popular books (for bulk aggregation)
 */
export async function fetchPopularGutenbergBooks(limit: number = 100): Promise<GutenbergBook[]> {
  try {
    const response = await fetch(`${GUTENBERG_API}?sort=popular&limit=${limit}`);
    if (!response.ok) return [];

    const data = await response.json() as any;
    return (data.results || []).map(parseGutenbergBook).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch popular Gutenberg books:", error);
    return [];
  }
}

/**
 * Extract book ID from Gutenberg URL
 */
export function extractGutenbergId(urlOrId: string): number | null {
  // If it's already a number, return it
  if (/^\d+$/.test(urlOrId)) {
    return parseInt(urlOrId, 10);
  }

  // Try to extract from URL
  const match = urlOrId.match(/\/(\d+)(?:\/|$|\?)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}
