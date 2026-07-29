/**
 * Open Textbook Library integration
 * Provides free, peer-reviewed open textbooks
 */

import axios from "axios";

const OTL_API = "https://open.umn.edu/opentextbooks/textbooks.json";
const OTL_SUBJECTS_API = "https://open.umn.edu/opentextbooks/categories.json";

export interface OpenTextbookBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  coverUrl: string;
  pdfUrl: string;
  publisher: string;
  publishedDate: string;
  pages?: number;
}

export interface OpenTextbookCategory {
  id: string;
  name: string;
}

export async function fetchOpenTextbooks(limit: number = 50, page: number = 1): Promise<OpenTextbookBook[]> {
  try {
    const response = await axios.get(OTL_API, {
      params: {
        per_page: limit,
        page: page,
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data.textbooks)) return [];

    return data.textbooks.map(parseOpenTextbook).filter(Boolean) as OpenTextbookBook[];
  } catch (error) {
    console.error("Failed to fetch Open Textbook Library books:", error);
    return [];
  }
}

export async function fetchOpenTextbooksBySubject(subjectId: string, limit: number = 20): Promise<OpenTextbookBook[]> {
  try {
    const response = await axios.get(OTL_API, {
      params: {
        subject: subjectId,
        per_page: limit,
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data.textbooks)) return [];

    return data.textbooks.map(parseOpenTextbook).filter(Boolean) as OpenTextbookBook[];
  } catch (error) {
    console.error("Failed to fetch Open Textbook Library books by subject:", error);
    return [];
  }
}

export async function fetchOpenTextbookCategories(): Promise<OpenTextbookCategory[]> {
  try {
    const response = await axios.get(OTL_SUBJECTS_API, {
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data.categories)) return [];

    return data.categories.map((cat: any) => ({
      id: String(cat.id),
      name: cat.name || "",
    }));
  } catch (error) {
    console.error("Failed to fetch Open Textbook categories:", error);
    return [];
  }
}

function parseOpenTextbook(data: any): OpenTextbookBook | null {
  if (!data) return null;

  const subjects: string[] = [];
  if (data.subjects) {
    if (Array.isArray(data.subjects)) {
      data.subjects.forEach((s: any) => {
        if (s.name) subjects.push(s.name);
      });
    }
  }

  return {
    id: String(data.id || `otl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
    title: data.title || "",
    author: data.author || "",
    description: data.description || "",
    language: "en",
    subjects,
    coverUrl: data.cover_image || data.cover_url || "",
    pdfUrl: data.pdf_url || data.download_pdf || "",
    publisher: data.publisher || "",
    publishedDate: data.date || data.published_date || "",
    pages: data.pages ? parseInt(data.pages) : undefined,
  };
}
