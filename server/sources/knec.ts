/**
 * KNEC (Kenya National Examinations Council) integration
 * Fetches past papers, marking schemes, and educational materials
 * Base URL: https://cba.knec.ac.ke/
 */

import axios from "axios";
import * as cheerio from "cheerio";

const KNEC_BASE_URL = "https://cba.knec.ac.ke/";

export interface KnecBook {
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
 * Fetch KNEC resources from the CBA portal
 */
export async function fetchKnecResources(limit: number = 50): Promise<KnecBook[]> {
  try {
    const https = await import('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(KNEC_BASE_URL, {
      timeout: 20000,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const resources: KnecBook[] = [];

    // Parse resource listings
    $('a[href*=".pdf"], a[href*=".doc"], a.download, .resource-item, li a').each((_idx, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr('href') || '';

      if (title && title.length > 5 && !title.includes('login') && !title.includes('home')) {
        resources.push({
          id: `knec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 255),
          author: "KNEC",
          description: `KNEC educational resource: ${title.substring(0, 200)}`,
          language: "en",
          subjects: ["Kenya Examinations", "Past Papers", "CBC Assessment"],
          downloadUrl: link.startsWith('http') ? link : `${KNEC_BASE_URL}${link}`,
          coverUrl: "",
          publishedDate: "",
          educationalLevel: "primary",
          sourceUrl: link,
        });
      }
    });

    return resources.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch KNEC resources:", error);
    return [];
  }
}

/**
 * Search for specific KNEC resources
 */
export async function searchKnecResources(query: string): Promise<KnecBook[]> {
  try {
    const searchUrl = `${KNEC_BASE_URL}?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EbookAggregator/1.0)',
      },
    });

    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const resources: KnecBook[] = [];

    $('article a, .result a, li a').each((_idx, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr('href') || '';

      if (title && title.length > 5) {
        resources.push({
          id: `knec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 255),
          author: "KNEC",
          description: `KNEC resource: ${title.substring(0, 200)}`,
          language: "en",
          subjects: [query, "KNEC"],
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
    console.error("Failed to search KNEC resources:", error);
    return [];
  }
}
