import axios from "axios";
import * as cheerio from "cheerio";

const ANNA_DOMAINS = ["annas-archive.li", "annas-archive.se", "annas-archive.org", "annas-archive.gd", "annas-archive.gl", "annas-archive.pk"];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export interface AnnaBook {
  title: string;
  author: string;
  publisher: string;
  language: string;
  format: string;
  filesize: string;
  md5: string;
  source: string;
  sourceUrl: string;
  annaUrl: string;
  mirrors: string[];
}

function extractMetaInformation(meta: string) {
  const parts = meta.split(" · ");
  if (parts.length < 3) return { language: "", format: "", filesize: "" };

  let language = "";
  const languagePart = parts[0].trim();
  const idx = languagePart.indexOf("[");
  if (idx > 0) {
    language = languagePart.substring(0, idx).replace("✅", "").trim();
  }

  const formatRegex = /\b(EPUB|PDF|MOBI|AZW3|AZW|DJVU|CBZ|CBR|FB2|DOCX?|TXT)\b/i;
  const sizeRegex = /\d+\.?\d*\s*(MB|KB|GB|TB)/i;

  let format = "";
  let filesize = "";

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!filesize && sizeRegex.test(part)) {
      filesize = part;
    }
    const formatMatch = part.match(formatRegex);
    if (!format && formatMatch) {
      format = formatMatch[1].toUpperCase();
    }
  }

  return { language, format, filesize };
}

export async function searchAnnasArchive(query: string, limit: number = 20): Promise<AnnaBook[]> {
  const encodedQuery = encodeURIComponent(query);
  let lastError: any = null;

  for (const domain of ANNA_DOMAINS) {
    try {
      const url = `https://${domain}/search?q=${encodedQuery}`;
      console.log(`[annas] Searching ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": UA },
      });

      const $ = cheerio.load(response.data);
      const books: AnnaBook[] = [];

      $("a[href*='/md5/']").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        const md5Match = href.match(/\/md5\/([a-f0-9]{32})/i);
        if (!md5Match) return;
        const md5 = md5Match[1];

        if (books.some(b => b.md5 === md5)) return;

        const container = $el.closest("div, li, tr");
        // Improved title extraction: check several possible selectors
        let title = container.find("h3, h4, .text-lg, .font-bold, .line-clamp-2").first().text().trim();
        if (!title) {
          // Fallback: if the link itself has text and it's not just a metadata link
          const linkText = $el.text().trim();
          if (linkText.length > 5 && !linkText.includes("·")) {
            title = linkText;
          }
        }
        
        if (!title || title.length < 2) return;
        title = title.slice(0, 255);

        let author = container.find(".text-gray-500, .text-sm, .italic, a[href*='author']").first().text().trim() || "Unknown";
        // Clean up author if it looks like a file path or contains source markers
        if (author.includes("/") || author.includes("\\") || author.includes("lgli/") || author.includes("zlib/")) {
          const parts = author.split(/[/\\]/);
          const lastPart = parts[parts.length - 1];
          // Try to extract author from filename like "James Clear - Atomic Habits.pdf"
          const nameMatch = lastPart.match(/^([^-\.]+)\s*-\s*.*$/);
          author = nameMatch ? nameMatch[1].trim() : "Unknown";
        }
        author = author.replace(/✅/g, "").trim();
        const meta = container.find(".text-gray-800, .text-xs, .opacity-80").text().trim();
        const { language, format, filesize } = extractMetaInformation(meta);

        books.push({
          title,
          author,
          publisher: "",
          language: language || "en",
          format: format || "pdf",
          filesize: filesize || "Unknown",
          md5,
          source: "annas_archive",
          sourceUrl: `https://${domain}/md5/${md5}`,
          annaUrl: `https://${domain}/md5/${md5}`,
          mirrors: [
            `https://${domain}/md5/${md5}`,
            `https://libgen.li/get.php?md5=${md5}`,
            `https://libgen.rs/get.php?md5=${md5}`,
          ],
        });
      });

      if (books.length > 0) {
        return books.slice(0, limit);
      }
    } catch (error: any) {
      console.error(`[annas] Error with domain ${domain}:`, error.message);
      lastError = error;
      continue; // Try next domain
    }
  }

  if (lastError) throw lastError;
  return [];
}
