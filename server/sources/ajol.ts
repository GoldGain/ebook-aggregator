/**
 * AJOL (African Journals Online) integration
 * Provides access to African academic journals and publications
 * Base URL: https://www.ajol.info/
 */

import axios from "axios";

const AJOL_SEARCH_API = "https://www.ajol.info/index.php/all/issue";

export interface AjolBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  pdfUrl: string;
  coverUrl: string;
  publisher: string;
  publishedDate: string;
  sourceUrl: string;
  journalName: string;
}

/**
 * Search AJOL for academic publications
 */
export async function searchAjolPublications(query: string, limit: number = 20): Promise<AjolBook[]> {
  try {
    const response = await axios.get(AJOL_SEARCH_API, {
      params: {
        search: query,
        limit: limit,
      },
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (response.status !== 200) return [];

    // AJOL returns HTML, we'd need to parse it
    // For now, return empty as AJOL doesn't have a clean JSON API
    return [];
  } catch (error) {
    console.error("Failed to search AJOL publications:", error);
    return [];
  }
}

/**
 * Fetch featured publications from AJOL
 */
export async function fetchAjolFeatured(limit: number = 20): Promise<AjolBook[]> {
  try {
    const response = await axios.get("https://www.ajol.info/", {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
      },
    });

    if (response.status !== 200) return [];

    // AJOL doesn't have a clean JSON API for featured items
    // Return empty - would need HTML scraping for full integration
    return [];
  } catch (error) {
    console.error("Failed to fetch AJOL featured publications:", error);
    return [];
  }
}
