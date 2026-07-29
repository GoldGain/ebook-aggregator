/**
 * Directory of Open Access Books (DOAB) API integration
 * DOAB provides free metadata for open access academic books
 */

import axios from "axios";

const DOAB_API = "https://directory.doabooks.org/rest/search";

export interface DoabBook {
  id: string;
  title: string;
  author: string;
  language: string;
  description: string;
  publisher: string;
  publishedDate: string;
  subjects: string[];
  imageUrl: string;
  pdfUrl: string;
  epubUrl: string;
  isbn: string;
}

export async function searchDoabBooks(query: string, limit: number = 20): Promise<DoabBook[]> {
  try {
    const response = await axios.get(DOAB_API, {
      params: {
        query: query,
        field: "dc.title",
        max: limit,
        format: "json",
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data)) return [];

    return data.map(parseDoabBook).filter(Boolean) as DoabBook[];
  } catch (error) {
    console.error("Failed to search DOAB books:", error);
    return [];
  }
}

export async function fetchDoabBooksBySubject(subject: string, limit: number = 20): Promise<DoabBook[]> {
  try {
    const response = await axios.get(DOAB_API, {
      params: {
        query: subject,
        field: "dc.subject",
        max: limit,
        format: "json",
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data)) return [];

    return data.map(parseDoabBook).filter(Boolean) as DoabBook[];
  } catch (error) {
    console.error("Failed to fetch DOAB books by subject:", error);
    return [];
  }
}

export async function fetchLatestDoabBooks(limit: number = 50): Promise<DoabBook[]> {
  try {
    const response = await axios.get(DOAB_API, {
      params: {
        query: "*",
        field: "dc.title",
        max: limit,
        format: "json",
      },
      timeout: 15000,
    });

    const data = response.data;
    if (!data || !Array.isArray(data)) return [];

    return data.map(parseDoabBook).filter(Boolean) as DoabBook[];
  } catch (error) {
    console.error("Failed to fetch latest DOAB books:", error);
    return [];
  }
}

function parseDoabBook(data: any): DoabBook | null {
  if (!data) return null;

  // DOAB returns different formats depending on the endpoint
  const title = data["dc.title"]?.[0] || data.title || "";
  const author = data["dc.creator"]?.[0] || data.author || "";
  const language = data["dc.language"]?.[0] || data.language || "en";
  const description = data["dc.description"]?.[0] || data.description || "";
  const publisher = data["dc.publisher"]?.[0] || data.publisher || "";
  const publishedDate = data["dc.date"]?.[0] || data.publishedDate || "";
  const isbn = data["dc.identifier.isbn"]?.[0] || "";
  const subjects = data["dc.subject"] || [];
  const imageUrl = data["dc.coverage"]?.[0] || data.imageUrl || data.coverImage || "";
  const pdfUrl = data["dc.identifier.uri"]?.find((u: string) => u.endsWith(".pdf")) || "";
  const epubUrl = data["dc.identifier.uri"]?.find((u: string) => u.endsWith(".epub")) || "";

  return {
    id: data.id || `doab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title || "",
    author,
    language: language.substring(0, 10),
    description,
    publisher,
    publishedDate,
    subjects: subjects.map((s: any) => typeof s === "string" ? s : String(s)),
    imageUrl,
    pdfUrl,
    epubUrl,
    isbn,
  };
}
