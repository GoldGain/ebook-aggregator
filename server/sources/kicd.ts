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

    // Parse the download listings
    $('.download-listing, .sdm_download, tr').each((_idx, el) => {
      const $el = $(el);
      const title = $el.find('.sdm_download_title, td:first-child, h3, h4').first().text().trim();
      const link = $el.find('a[href*=".pdf"], a[href*=".epub"], a.download').first().attr('href') || '';
      const date = $el.find('.sdm_date, td:last-child, .date').first().text().trim();

      if (title && title.length > 3) {
        resources.push({
          id: `kicd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          author: "KICD",
          description: `Educational resource from Kenya Institute of Curriculum Development: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "Curriculum", "CBC"],
          downloadUrl: link.startsWith('http') ? link : `${KICD_BASE_URL}${link}`,
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
