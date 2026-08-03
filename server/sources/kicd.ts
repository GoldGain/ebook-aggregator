/**
 * KICD (Kenya Institute of Curriculum Development) integration
 * Fetches educational materials and curriculum resources
 * Base URL: https://kicd.ac.ke/sdm_downloads/
 */

import axios from "axios";
import * as cheerio from "cheerio";

const KICD_BASE_URL = "https://kicd.ac.ke/sdm_downloads/";

export interface KicdBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  downloadUrl: string;
  coverUrl: string;
  publishedDate: string;
  educationalLevel: string;
  sourceUrl: string;
}

/**
 * Fetch KICD download page and extract book/resource listings
 */
export async function fetchKicdResources(limit: number = 50): Promise<KicdBook[]> {
  try {
    const response = await axios.get(KICD_BASE_URL, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const resources: KicdBook[] = [];
    const seen = new Set<string>();

    // The KICD SDM page is a WordPress listing with links to individual download pages
    // Parse all links that point to /sdm_downloads/* sub-pages
    $('a[href*="/sdm_downloads/"]').each((_idx, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();

      // Skip navigation links, "more" links, and the base URL itself
      if (!href.includes('/sdm_downloads/') || 
          href === KICD_BASE_URL || 
          href.endsWith('/sdm_downloads/') ||
          text.toLowerCase() === 'more' ||
          text.toLowerCase() === 'downloads' ||
          text.length < 5) {
        return;
      }

      // Deduplicate by href
      if (seen.has(href)) return;
      seen.add(href);

      const fullUrl = href.startsWith('http') ? href : `https://kicd.ac.ke${href.startsWith('/') ? '' : '/'}${href}`;

      resources.push({
        id: `kicd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: text.substring(0, 255),
        author: "KICD",
        description: `KICD educational resource: ${text}`,
        language: "en",
        subjects: ["Kenya Education", "Curriculum", "CBC"],
        downloadUrl: fullUrl,
        coverUrl: "",
        publishedDate: date,
        educationalLevel: "primary",
        sourceUrl: link || "",
      });
    }
    });

    return resources.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch KICD resources:", error);
    return [];
  }
}

/**
 * Search KICD resources by category
 */
export async function searchKicdResources(category: string): Promise<KicdBook[]> {
  try {
    const searchUrl = `${KICD_BASE_URL}?s=${encodeURIComponent(category)}`;
    const response = await axios.get(searchUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
      },
    });

    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const resources: KicdBook[] = [];

    $('tr, .download-item, article').each((_idx, el) => {
      const $el = $(el);
      const title = $el.find('td:first-child, h3, .title').first().text().trim();
      const link = $el.find('a[href*=".pdf"], a[href*=".epub"]').first().attr('href') || '';

      if (title && title.length > 3) {
        resources.push({
          id: `kicd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          author: "KICD",
          description: `KICD resource: ${title}`,
          language: "en",
          subjects: [category, "Kenya Education"],
          downloadUrl: link,
          coverUrl: "",
          publishedDate: "",
          educationalLevel: "primary",
          sourceUrl: link,
        });
      }
    });

    return resources;
  } catch (error) {
    console.error("Failed to search KICD resources:", error);
    return [];
  }
}
