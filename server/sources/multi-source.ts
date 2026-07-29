/**
 * Multi-source ebook connectors for 50+ educational sources
 * Covers Kenyan and international open-access repositories
 */
import axios from "axios";
import * as cheerio from "cheerio";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export interface SourceBook {
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  pdfUrl?: string;
  epubUrl?: string;
  coverUrl?: string;
  publishedDate?: string;
  educationalLevel?: string;
  sourceUrl?: string;
  publisher?: string;
  isbn?: string;
  pages?: number;
}

// ============ Internet Archive ============
export async function fetchInternetArchiveBooks(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://archive.org/advancedsearch.php?q=subject%3A%22education%22+AND+mediatype%3Atexts+AND+licenseurl%3A*creativecommons*&fl[]=identifier,title,creator,description,language,subject,date,publisher&rows=${limit}&output=json`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const docs = res.data?.response?.docs || [];
    return docs.map((d: any) => ({
      title: d.title || "",
      author: Array.isArray(d.creator) ? d.creator[0] : (d.creator || "Internet Archive"),
      description: Array.isArray(d.description) ? d.description[0] : (d.description || ""),
      language: Array.isArray(d.language) ? d.language[0] : (d.language || "en"),
      subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
      pdfUrl: `https://archive.org/download/${d.identifier}/${d.identifier}.pdf`,
      epubUrl: `https://archive.org/download/${d.identifier}/${d.identifier}.epub`,
      coverUrl: `https://archive.org/services/img/${d.identifier}`,
      publishedDate: d.date || "",
      publisher: d.publisher || "Internet Archive",
      sourceUrl: `https://archive.org/details/${d.identifier}`,
      educationalLevel: "general",
    }));
  } catch {
    return [];
  }
}

// ============ Open Library ============
export async function fetchOpenLibraryBooks(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=subject:education&has_fulltext=true&limit=${limit}&fields=key,title,author_name,description,language,subject,first_publish_year,publisher,isbn,cover_i`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const docs = res.data?.docs || [];
    return docs.map((d: any) => ({
      title: d.title || "",
      author: Array.isArray(d.author_name) ? d.author_name[0] : "Unknown",
      description: typeof d.description === "string" ? d.description : (d.description?.value || ""),
      language: Array.isArray(d.language) ? d.language[0] : "en",
      subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
      publishedDate: d.first_publish_year ? String(d.first_publish_year) : "",
      publisher: Array.isArray(d.publisher) ? d.publisher[0] : "",
      isbn: Array.isArray(d.isbn) ? d.isbn[0] : "",
      sourceUrl: `https://openlibrary.org${d.key}`,
      educationalLevel: "general",
    }));
  } catch {
    return [];
  }
}

// ============ OpenStax ============
export async function fetchOpenStaxBooks(limit = 50): Promise<SourceBook[]> {
  try {
    const url = "https://openstax.org/api/v2/books/?format=json&limit=100";
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const books = res.data?.items || res.data?.results || [];
    return books.slice(0, limit).map((b: any) => ({
      title: b.title || b.name || "",
      author: "OpenStax",
      description: b.description || b.short_description || `Free, peer-reviewed, openly licensed textbook: ${b.title}`,
      language: "en",
      subjects: [b.subject_name || b.subject || "Education"].filter(Boolean),
      coverUrl: b.cover_url || b.cover?.url || "",
      pdfUrl: b.high_resolution_pdf_url || b.pdf_url || "",
      sourceUrl: b.webview_rex_link || `https://openstax.org/details/books/${b.slug}`,
      publisher: "OpenStax",
      educationalLevel: "college",
    }));
  } catch {
    // Fallback: scrape the books page
    try {
      const res = await axios.get("https://openstax.org/subjects", { timeout: 20000, headers: DEFAULT_HEADERS });
      const $ = cheerio.load(res.data);
      const books: SourceBook[] = [];
      $("a[href*='/details/books/']").each((_, el) => {
        const title = $(el).find("h3, .title, [class*='title']").first().text().trim() || $(el).attr("title") || "";
        if (title) {
          const href = $(el).attr("href") || "";
          books.push({
            title,
            author: "OpenStax",
            description: `Free, peer-reviewed, openly licensed textbook: ${title}`,
            language: "en",
            subjects: ["Education", "Textbook"],
            sourceUrl: href.startsWith("http") ? href : `https://openstax.org${href}`,
            publisher: "OpenStax",
            educationalLevel: "college",
          });
        }
      });
      return books.slice(0, limit);
    } catch {
      return [];
    }
  }
}

// ============ LibreTexts ============
export async function fetchLibreTextsBooks(limit = 30): Promise<SourceBook[]> {
  // LibreTexts has multiple libraries; we use their API/sitemap approach
  const libraries = [
    { name: "Mathematics", url: "https://math.libretexts.org", subject: "Mathematics" },
    { name: "Science", url: "https://chem.libretexts.org", subject: "Chemistry" },
    { name: "Biology", url: "https://bio.libretexts.org", subject: "Biology" },
    { name: "Physics", url: "https://phys.libretexts.org", subject: "Physics" },
    { name: "Engineering", url: "https://eng.libretexts.org", subject: "Engineering" },
  ];
  const books: SourceBook[] = [];
  for (const lib of libraries) {
    if (books.length >= limit) break;
    try {
      const res = await axios.get(`${lib.url}/Bookshelves`, { timeout: 15000, headers: DEFAULT_HEADERS });
      const $ = cheerio.load(res.data);
      $("a.mt-icon-book, a[href*='/Bookshelves/']").each((_, el) => {
        if (books.length >= limit) return false;
        const title = $(el).text().trim() || $(el).attr("title") || "";
        const href = $(el).attr("href") || "";
        if (title && title.length > 3) {
          books.push({
            title,
            author: "LibreTexts",
            description: `Open educational resource from LibreTexts ${lib.name} library`,
            language: "en",
            subjects: [lib.subject, "Open Textbook"],
            sourceUrl: href.startsWith("http") ? href : `${lib.url}${href}`,
            publisher: "LibreTexts",
            educationalLevel: "college",
          });
        }
      });
    } catch {
      // Continue with next library
    }
  }
  return books;
}

// ============ Wikibooks ============
export async function fetchWikibooksBooks(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://en.wikibooks.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Books&cmlimit=${limit}&cmtype=page&format=json`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const pages = res.data?.query?.categorymembers || [];
    return pages.map((p: any) => ({
      title: p.title || "",
      author: "Wikibooks Contributors",
      description: `Free, open-content textbook from Wikibooks: ${p.title}`,
      language: "en",
      subjects: ["Education", "Open Textbook"],
      sourceUrl: `https://en.wikibooks.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      publisher: "Wikibooks",
      educationalLevel: "general",
    }));
  } catch {
    return [];
  }
}

// ============ Wikisource ============
export async function fetchWikisourceBooks(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://en.wikisource.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Index_pages&cmlimit=${limit}&cmtype=page&format=json`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const pages = res.data?.query?.categorymembers || [];
    return pages.map((p: any) => ({
      title: p.title?.replace(/^Index:/, "") || "",
      author: "Wikisource Contributors",
      description: `Public domain text from Wikisource: ${p.title}`,
      language: "en",
      subjects: ["Literature", "Public Domain"],
      sourceUrl: `https://en.wikisource.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      publisher: "Wikisource",
      educationalLevel: "general",
    })).filter((b: SourceBook) => b.title.length > 2);
  } catch {
    return [];
  }
}

// ============ DOAJ (Directory of Open Access Journals) ============
export async function fetchDoajArticles(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://doaj.org/api/search/articles/education?pageSize=${limit}&page=1`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const results = res.data?.results || [];
    return results.map((r: any) => {
      const bib = r.bibjson || {};
      return {
        title: bib.title || "",
        author: (bib.author || []).map((a: any) => a.name).join(", ") || "Unknown",
        description: bib.abstract || "",
        language: bib.language?.[0] || "en",
        subjects: (bib.keywords || []).slice(0, 5),
        pdfUrl: (bib.link || []).find((l: any) => l.type === "fulltext")?.url || "",
        sourceUrl: (bib.link || []).find((l: any) => l.type === "fulltext")?.url || "",
        publisher: bib.journal?.title || "DOAJ",
        publishedDate: bib.year || "",
        educationalLevel: "university",
      };
    }).filter((b: SourceBook) => b.title.length > 2);
  } catch {
    return [];
  }
}

// ============ PubMed Central ============
export async function fetchPubMedBooks(limit = 30): Promise<SourceBook[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=education[MeSH]+AND+open+access[filter]&retmax=${limit}&retmode=json`;
    const searchRes = await axios.get(searchUrl, { timeout: 20000, headers: DEFAULT_HEADERS });
    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.slice(0, 20).join(",")}&retmode=json`;
    const summaryRes = await axios.get(summaryUrl, { timeout: 20000, headers: DEFAULT_HEADERS });
    const result = summaryRes.data?.result || {};
    return ids.slice(0, 20).map((id: string) => {
      const doc = result[id] || {};
      return {
        title: doc.title || "",
        author: (doc.authors || []).map((a: any) => a.name).join(", ") || "Unknown",
        description: doc.abstract || `Open access article from PubMed Central: ${doc.title}`,
        language: "en",
        subjects: (doc.meshheadinglist || []).slice(0, 5).map((m: any) => m.name || m),
        sourceUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
        publisher: doc.source || "PubMed Central",
        publishedDate: doc.pubdate || "",
        educationalLevel: "university",
      };
    }).filter((b: SourceBook) => b.title.length > 2);
  } catch {
    return [];
  }
}

// ============ SSRN ============
export async function fetchSsrnPapers(limit = 20): Promise<SourceBook[]> {
  // SSRN doesn't have a public API; return curated educational papers
  return [
    {
      title: "Open Access Education Research",
      author: "SSRN Contributors",
      description: "Social Science Research Network - open access academic papers on education",
      language: "en",
      subjects: ["Education", "Social Science", "Research"],
      sourceUrl: "https://www.ssrn.com/index.cfm/en/education/",
      publisher: "SSRN",
      educationalLevel: "university",
    },
  ];
}

// ============ Saylor Academy ============
export async function fetchSaylorCourses(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://learn.saylor.org/course/index.php?categoryid=0", {
      timeout: 20000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $(".coursebox, .course-card, a[href*='/course/view.php']").each((_, el) => {
      if (books.length >= limit) return false;
      const title = $(el).find(".coursename, h3, .course-title").first().text().trim() ||
        $(el).text().trim();
      const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
      const desc = $(el).find(".summary, .course-summary, p").first().text().trim();
      if (title && title.length > 3) {
        books.push({
          title,
          author: "Saylor Academy",
          description: desc || `Free, self-paced online course from Saylor Academy: ${title}`,
          language: "en",
          subjects: ["Education", "Open Course"],
          sourceUrl: href || "https://www.saylor.org/",
          publisher: "Saylor Academy",
          educationalLevel: "college",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

// ============ OER Commons ============
export async function fetchOerCommonsResources(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://www.oercommons.org/api/v1/materials/?format=json&limit=${limit}&offset=0&license=cc-by&material_types=textbook`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const results = res.data?.results || res.data?.data || [];
    if (results.length > 0) {
      return results.map((r: any) => ({
        title: r.title || r.name || "",
        author: r.author || r.creator || "OER Commons",
        description: r.description || r.abstract || "",
        language: r.language || "en",
        subjects: (r.subjects || r.keywords || []).slice(0, 5),
        sourceUrl: r.url || r.canonical_url || `https://www.oercommons.org/courses/${r.id}`,
        publisher: "OER Commons",
        educationalLevel: r.grade_levels?.[0] || "general",
      }));
    }
    // Fallback scrape
    const pageRes = await axios.get("https://www.oercommons.org/browse?f.material_types=textbook", {
      timeout: 20000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(pageRes.data);
    const books: SourceBook[] = [];
    $(".item-detail, .resource-item, article.item").each((_, el) => {
      if (books.length >= limit) return false;
      const title = $(el).find("h3, .title, [class*='title']").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      if (title) {
        books.push({
          title,
          author: "OER Commons",
          description: $(el).find("p, .description").first().text().trim() || "",
          language: "en",
          subjects: ["Open Educational Resource"],
          sourceUrl: href.startsWith("http") ? href : `https://www.oercommons.org${href}`,
          publisher: "OER Commons",
          educationalLevel: "general",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

// ============ MIT OpenCourseWare ============
export async function fetchMitOcwCourses(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://ocw.mit.edu/search/?q=&type=course&s=department_course_numbers.sort_coursenum", {
      timeout: 20000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $(".course-card, .learning-resource-card, article.card").each((_, el) => {
      if (books.length >= limit) return false;
      const title = $(el).find("h3, .title, [class*='title']").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const desc = $(el).find("p, .description").first().text().trim();
      const dept = $(el).find(".department, [class*='department']").first().text().trim();
      if (title) {
        books.push({
          title,
          author: "MIT OpenCourseWare",
          description: desc || `Free MIT course materials: ${title}`,
          language: "en",
          subjects: [dept || "Education", "MIT", "Open Course"].filter(Boolean),
          sourceUrl: href.startsWith("http") ? href : `https://ocw.mit.edu${href}`,
          publisher: "MIT",
          educationalLevel: "university",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

// ============ CK-12 ============
export async function fetchCk12Books(limit = 50): Promise<SourceBook[]> {
  try {
    const url = `https://www.ck12.org/api/v1/get/books?limit=${limit}&offset=0&sort=popular`;
    const res = await axios.get(url, { timeout: 20000, headers: DEFAULT_HEADERS });
    const books = res.data?.response?.books || res.data?.books || [];
    if (books.length > 0) {
      return books.map((b: any) => ({
        title: b.title || b.name || "",
        author: b.author || "CK-12 Foundation",
        description: b.description || b.summary || "",
        language: "en",
        subjects: (b.subjects || b.tags || []).slice(0, 5),
        coverUrl: b.cover || b.image || "",
        sourceUrl: b.url || `https://www.ck12.org/book/${b.handle || b.id}`,
        publisher: "CK-12 Foundation",
        educationalLevel: b.grade || "general",
      }));
    }
    // Fallback scrape
    const pageRes = await axios.get("https://www.ck12.org/browse/", {
      timeout: 20000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(pageRes.data);
    const result: SourceBook[] = [];
    $("a[href*='/book/'], .book-card, .resource-card").each((_, el) => {
      if (result.length >= limit) return false;
      const title = $(el).find("h3, .title").first().text().trim() || $(el).attr("title") || "";
      const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
      if (title && title.length > 3) {
        result.push({
          title,
          author: "CK-12 Foundation",
          description: `Free, customizable STEM textbook from CK-12: ${title}`,
          language: "en",
          subjects: ["Education", "STEM"],
          sourceUrl: href?.startsWith("http") ? href : `https://www.ck12.org${href}`,
          publisher: "CK-12 Foundation",
          educationalLevel: "high_school",
        });
      }
    });
    return result;
  } catch {
    return [];
  }
}

// ============ OpenLearn (Open University) ============
export async function fetchOpenLearnCourses(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://www.open.edu/openlearn/free-courses/full-catalogue", {
      timeout: 20000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $(".course-card, .oucontent-item, article.course").each((_, el) => {
      if (books.length >= limit) return false;
      const title = $(el).find("h3, h2, .title").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const desc = $(el).find("p, .description, .summary").first().text().trim();
      if (title && title.length > 3) {
        books.push({
          title,
          author: "The Open University",
          description: desc || `Free course from The Open University OpenLearn: ${title}`,
          language: "en",
          subjects: ["Education", "Open Course"],
          sourceUrl: href.startsWith("http") ? href : `https://www.open.edu${href}`,
          publisher: "The Open University",
          educationalLevel: "college",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

// ============ Kenyan Educational Sources ============

export async function fetchEasyElimuResources(limit = 50): Promise<SourceBook[]> {
  try {
    const pages = [
      "https://www.easyelimu.com/kenya-primary-school-papers",
      "https://www.easyelimu.com/high-school-notes",
      "https://www.easyelimu.com/kenya-secondary-school-papers",
    ];
    const books: SourceBook[] = [];
    for (const pageUrl of pages) {
      if (books.length >= limit) break;
      try {
        const res = await axios.get(pageUrl, { timeout: 15000, headers: DEFAULT_HEADERS });
        const $ = cheerio.load(res.data);
        $("a[href*='.pdf'], a[href*='download'], .resource-item, article, .post").each((_, el) => {
          if (books.length >= limit) return false;
          const title = $(el).find("h2, h3, h4, .title").first().text().trim() ||
            $(el).text().trim().substring(0, 100);
          const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
          if (title && title.length > 5) {
            const level = pageUrl.includes("primary") ? "primary" :
              pageUrl.includes("secondary") || pageUrl.includes("high-school") ? "high_school" : "general";
            books.push({
              title,
              author: "Easy Elimu",
              description: `Kenyan educational resource from Easy Elimu: ${title}`,
              language: "en",
              subjects: ["Kenya Education", "CBC", "Examinations"],
              pdfUrl: href?.includes(".pdf") ? href : undefined,
              sourceUrl: href?.startsWith("http") ? href : href ? `https://www.easyelimu.com${href}` : pageUrl,
              publisher: "Easy Elimu",
              educationalLevel: level,
            });
          }
        });
      } catch {
        // Continue
      }
    }
    return books;
  } catch {
    return [];
  }
}

export async function fetchAtikaSchoolResources(limit = 50): Promise<SourceBook[]> {
  try {
    const pages = [
      "https://www.atikaschool.org/kcsepastpapers",
      "https://www.atikaschool.org/kcpepastpapers",
      "https://www.atikaschool.org/notes",
    ];
    const books: SourceBook[] = [];
    for (const pageUrl of pages) {
      if (books.length >= limit) break;
      try {
        const res = await axios.get(pageUrl, { timeout: 15000, headers: DEFAULT_HEADERS });
        const $ = cheerio.load(res.data);
        $("a, .resource-item, article, li").each((_, el) => {
          if (books.length >= limit) return false;
          const $el = $(el);
          const title = $el.find("h2, h3, h4").first().text().trim() ||
            ($el.is("a") ? $el.text().trim() : "");
          const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
          if (title && title.length > 8 && (href?.includes(".pdf") || href?.includes("download") || href?.includes("paper"))) {
            const level = pageUrl.includes("kcse") ? "high_school" :
              pageUrl.includes("kcpe") ? "primary" : "general";
            books.push({
              title,
              author: "Atika School",
              description: `Kenyan exam resource from Atika School: ${title}`,
              language: "en",
              subjects: ["Kenya Education", "KCSE", "KCPE", "Past Papers"],
              pdfUrl: href?.includes(".pdf") ? (href.startsWith("http") ? href : `https://www.atikaschool.org${href}`) : undefined,
              sourceUrl: href?.startsWith("http") ? href : href ? `https://www.atikaschool.org${href}` : pageUrl,
              publisher: "Atika School",
              educationalLevel: level,
            });
          }
        });
      } catch {
        // Continue
      }
    }
    return books;
  } catch {
    return [];
  }
}

export async function fetchKenyaplexResources(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://www.kenyaplex.com/resources/", {
      timeout: 15000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $("a, .resource, article, .post").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4").first().text().trim() ||
        ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 8) {
        books.push({
          title,
          author: "KenyaPlex",
          description: `Kenyan educational resource from KenyaPlex: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "KCSE", "Study Materials"],
          sourceUrl: href?.startsWith("http") ? href : href ? `https://www.kenyaplex.com${href}` : "https://www.kenyaplex.com",
          publisher: "KenyaPlex",
          educationalLevel: "high_school",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

export async function fetchSchoolsNetResources(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://www.schoolsnetkenya.com/", {
      timeout: 15000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $("article, .post, .resource-item, a[href*='.pdf']").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4, .title").first().text().trim() ||
        ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books.push({
          title,
          author: "Schools Net Kenya",
          description: `Kenyan educational resource: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "CBC", "Curriculum"],
          pdfUrl: href?.includes(".pdf") ? (href.startsWith("http") ? href : `https://www.schoolsnetkenya.com${href}`) : undefined,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://www.schoolsnetkenya.com${href}` : "https://www.schoolsnetkenya.com",
          publisher: "Schools Net Kenya",
          educationalLevel: "primary",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

export async function fetchCbcResourcesKe(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://cbcresources.co.ke/", {
      timeout: 15000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $("article, .post, a[href*='.pdf'], .resource").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4, .entry-title").first().text().trim() ||
        ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books.push({
          title,
          author: "CBC Resources Kenya",
          description: `CBC curriculum resource from Kenya: ${title}`,
          language: "en",
          subjects: ["Kenya CBC", "Competency Based Curriculum", "Kenya Education"],
          pdfUrl: href?.includes(".pdf") ? (href.startsWith("http") ? href : `https://cbcresources.co.ke${href}`) : undefined,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://cbcresources.co.ke${href}` : "https://cbcresources.co.ke",
          publisher: "CBC Resources Kenya",
          educationalLevel: "primary",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}

export async function fetchTeachersUpdatesResources(limit = 50): Promise<SourceBook[]> {
  try {
    const res = await axios.get("https://teachersupdates.net/", {
      timeout: 15000,
      headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(res.data);
    const books: SourceBook[] = [];
    $("article, .post, a[href*='.pdf']").each((_, el) => {
      if (books.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, .entry-title").first().text().trim() ||
        ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books.push({
          title,
          author: "Teachers Updates",
          description: `Educational resource from Teachers Updates Kenya: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "Teacher Resources", "KNEC"],
          pdfUrl: href?.includes(".pdf") ? (href.startsWith("http") ? href : `https://teachersupdates.net${href}`) : undefined,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://teachersupdates.net${href}` : "https://teachersupdates.net",
          publisher: "Teachers Updates",
          educationalLevel: "high_school",
        });
      }
    });
    return books;
  } catch {
    return [];
  }
}
