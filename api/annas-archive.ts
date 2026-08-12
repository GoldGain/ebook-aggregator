import axios from "axios";
import * as cheerio from "cheerio";

const ANNA_BASE_URL = "annas-archive.gd";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://${ANNA_BASE_URL}/search?q=${encodedQuery}&content=book_any`;

    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": UA,
      },
    });

    const $ = cheerio.load(response.data);
    const books: AnnaBook[] = [];

    // The selector from the Go code: a[href^='/md5/'] with specific class
    // In the HTML, it's often inside a container with class "h-[125] flex flex-col justify-center" or similar
    // Let's use a more general approach and filter
    $("a[href^='/md5/']").each((_, el) => {
      const $el = $(el);
      
      // Look for the main container that holds title and metadata
      // Usually it's a link containing the title text
      const href = $el.attr("href") || "";
      const md5Match = href.match(/\/md5\/([a-f0-9]{32})/i);
      if (!md5Match) return;
      const md5 = md5Match[1];

      // If we've already seen this MD5, skip it (results often have multiple links for same book)
      if (books.some(b => b.md5 === md5)) return;

      const container = $el.closest("div, li, tr");
      const title = (container.find("h3, h4, .text-lg, .font-bold").first().text().trim() || $el.text().trim()).slice(0, 255);
      if (!title || title.length < 2) return;

      const author = container.find(".text-gray-500, .text-sm, .italic").first().text().trim() || "Unknown";
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
        sourceUrl: `https://${ANNA_BASE_URL}${href}`,
        annaUrl: `https://${ANNA_BASE_URL}/md5/${md5}`,
        mirrors: [
          `https://${ANNA_BASE_URL}/md5/${md5}`,
          `https://libgen.li/get.php?md5=${md5}`,
          `https://libgen.rs/get.php?md5=${md5}`,
        ],
      });
    });

    return books.slice(0, limit);
  } catch (error) {
    console.error("Anna's Archive search error:", error);
    throw error;
  }
}
