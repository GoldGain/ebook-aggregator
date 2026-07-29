/**
 * AJOL (African Journals Online) integration
 * Uses OAI-PMH endpoint for open access African academic publications
 * Base URL: https://www.ajol.info/
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { SourceBook } from "./multi-source";

const AJOL_OAI_URL = "https://www.ajol.info/index.php/ajol/oai";
const AJOL_SEARCH_URL = "https://www.ajol.info/index.php/ajol/search/search";

/**
 * Fetch open access articles from AJOL via OAI-PMH
 */
export async function fetchAjolBooks(limit: number = 30): Promise<SourceBook[]> {
  try {
    // Use OAI-PMH ListRecords endpoint
    const url = `${AJOL_OAI_URL}?verb=ListRecords&metadataPrefix=oai_dc&set=openaccess`;
    const res = await axios.get(url, {
      timeout: 25000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)",
        "Accept": "application/xml,text/xml,*/*",
      },
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    const books: SourceBook[] = [];

    $("record").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("dc\\:title, title").first().text().trim();
      const author = $el.find("dc\\:creator, creator").first().text().trim();
      const description = $el.find("dc\\:description, description").first().text().trim();
      const language = $el.find("dc\\:language, language").first().text().trim() || "en";
      const subjects: string[] = [];
      $el.find("dc\\:subject, subject").each((_, s) => {
        subjects.push($(s).text().trim());
      });
      const pdfUrl = $el.find("dc\\:identifier, identifier").filter((_, i) => {
        return $(i).text().includes(".pdf") || $(i).text().includes("fulltext");
      }).first().text().trim();
      const sourceUrl = $el.find("dc\\:identifier, identifier").filter((_, i) => {
        return $(i).text().startsWith("http");
      }).first().text().trim();
      const publisher = $el.find("dc\\:publisher, publisher").first().text().trim();
      const date = $el.find("dc\\:date, date").first().text().trim();

      if (title && title.length > 3) {
        books.push({
          title,
          author: author || "AJOL",
          description,
          language: language.substring(0, 10),
          subjects: subjects.slice(0, 5),
          pdfUrl: pdfUrl || undefined,
          sourceUrl: sourceUrl || "https://www.ajol.info",
          publisher: publisher || "African Journals Online",
          publishedDate: date,
          educationalLevel: "university",
        });
      }
    });

    if (books.length > 0) return books;

    // Fallback: scrape the AJOL homepage for featured journals
    return fetchAjolFeatured(limit);
  } catch {
    return fetchAjolFeatured(limit);
  }
}

export async function fetchAjolFeatured(limit: number = 20): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://www.ajol.info/index.php/ajol/issue/current", {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0)",
      },
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];

    $("article, .article-summary, .obj_article_summary").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h3, h4, .title").first().text().trim();
      const author = $el.find(".authors, .author").first().text().trim();
      const href = $el.find("a").first().attr("href") || "";
      if (title && title.length > 5) {
        books.push({
          title,
          author: author || "AJOL",
          description: `Open access article from African Journals Online: ${title}`,
          language: "en",
          subjects: ["African Studies", "Academic Research"],
          sourceUrl: href.startsWith("http") ? href : `https://www.ajol.info${href}`,
          publisher: "African Journals Online",
          educationalLevel: "university",
        });
      }
    });

    return books;
  } catch {
    return [];
  }
}
