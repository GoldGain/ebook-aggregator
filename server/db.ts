import { and, eq, like, or, desc, asc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  books,
  InsertBook,
  genres,
  InsertGenre,
  subjects,
  InsertSubject,
  bookSubjects,
  InsertBookSubject,
  bookshelves,
  InsertBookshelf,
  downloadHistory,
  InsertDownloadHistory,
  readingProgress,
  InsertReadingProgress,
  recommendations,
  InsertRecommendation,
  aggregatorLogs,
  InsertAggregatorLog,
  aggregatorSources,
  InsertAggregatorSource,
  type User, type Genre, type Subject, type Book, type Bookshelf,
  type DownloadHistory, type ReadingProgress, type Recommendation,
  type AggregatorLog, type AggregatorSource,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

const DATABASE_CONNECT_TIMEOUT_SECONDS = 10;
const DATABASE_IDLE_TIMEOUT_SECONDS = 10;
const DATABASE_MAX_LIFETIME_SECONDS = 60;

// Lazily create one reusable client per warm function instance. These settings are
// compatible with Supabase's transaction pooler and prevent a stalled connection
// attempt from consuming the full Vercel function timeout.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      const client = postgres(ENV.databaseUrl, {
        ssl: "require",
        max: 4,
        idle_timeout: DATABASE_IDLE_TIMEOUT_SECONDS,
        max_lifetime: DATABASE_MAX_LIFETIME_SECONDS,
        connect_timeout: DATABASE_CONNECT_TIMEOUT_SECONDS,
        // Supabase transaction pooling does not support prepared statements.
        prepare: false,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to initialize client:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(id: number, role: "user" | "admin"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function getUserCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count ?? 0;
}

// ============ Books queries ============

export async function getBooks(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).limit(limit).offset(offset);
}

export async function getBookById(id: number): Promise<Book | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookByGutenbergId(gutenbergId: number): Promise<Book | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.gutenbergId, gutenbergId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookByTitleAuthor(title: string, author?: string): Promise<Book | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [like(books.title, `%${title.substring(0, 100)}%`)];
  if (author) {
    conditions.push(like(books.author, `%${author.substring(0, 50)}%`));
  }
  const result = await db.select().from(books).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchBooks(query: string, limit: number = 20, offset: number = 0): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];

  // Use PostgreSQL full-text search with tsvector for ranked results
  try {
    const tsQuery = query.trim().split(/\s+/).filter(Boolean).map(w => `${w.replace(/[^a-zA-Z0-9]/g, '')}:*`).join(" & ");
    if (tsQuery) {
      const rawResult = await db.execute(
        sql`SELECT * FROM books
            WHERE search_vector @@ to_tsquery('english', ${tsQuery})
            ORDER BY ts_rank(search_vector, to_tsquery('english', ${tsQuery})) DESC,
                     "downloadCount" DESC NULLS LAST
            LIMIT ${limit} OFFSET ${offset}`
      );
      // postgres-js returns an array directly; drizzle wraps it
      const rows = (Array.isArray(rawResult) ? rawResult : (rawResult as any).rows ?? []) as Book[];
      if (rows.length > 0) {
        return rows;
      }
    }
  } catch {
    // Fall through to ILIKE search
  }

  // Trigram / ILIKE fallback for fuzzy matching and short queries
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(books)
    .where(
      or(
        like(books.title, searchTerm),
        like(books.author, searchTerm),
        like(books.subjects, searchTerm),
        like(books.description, searchTerm),
      )
    )
    .orderBy(desc(books.downloadCount))
    .limit(limit)
    .offset(offset);
}

export async function listBooks(options: {
  limit: number;
  offset: number;
  genre?: string;
  language?: string;
  educationalLevel?: string;
  source?: string;
  search?: string;
  sort?: "newest" | "downloads" | "title" | "author";
}): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (options.genre) {
    const genre = await getGenreBySlug(options.genre);
    if (genre) conditions.push(eq(books.genreId, genre.id));
  }
  if (options.language) conditions.push(eq(books.language, options.language));
  if (options.educationalLevel) conditions.push(eq(books.educationalLevel, options.educationalLevel as any));
  if (options.source) conditions.push(eq(books.source, options.source as any));
  if (options.search) {
    conditions.push(
      or(
        like(books.title, `%${options.search}%`),
        like(books.author, `%${options.search}%`),
        like(books.subjects, `%${options.search}%`),
        like(books.description, `%${options.search}%`),
      )
    );
  }

  let orderBy = desc(books.importedAt);
  if (options.sort === "downloads") orderBy = desc(books.downloadCount);
  else if (options.sort === "title") orderBy = asc(books.title);
  else if (options.sort === "author") orderBy = asc(books.author);

  return db
    .select()
    .from(books)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(options.limit)
    .offset(options.offset);
}

export async function getRecentBooks(limit: number = 12): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).orderBy(desc(books.importedAt)).limit(limit);
}

export async function getPopularBooks(limit: number = 12): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).orderBy(desc(books.downloadCount)).limit(limit);
}

export async function getBooksByEducationalLevel(level: string, limit: number = 20): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.educationalLevel, level as any)).orderBy(desc(books.importedAt)).limit(limit);
}

export async function getBooksBySource(source: string, limit: number = 20): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.source, source as any)).orderBy(desc(books.importedAt)).limit(limit);
}

export async function getBooksByGenre(genreId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.genreId, genreId)).limit(limit).offset(offset);
}

export async function getBooksByLanguage(language: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.language, language)).limit(limit).offset(offset);
}

export async function createBook(book: InsertBook): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(books).values(book).returning({ id: books.id });
  return result[0]?.id;
}

export async function updateBook(id: number, updates: Partial<InsertBook>) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(books).set(updates).where(eq(books.id, id));
}

export async function incrementDownloadCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE books SET downloadCount = downloadCount + 1 WHERE id = ${id}`);
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(books).where(eq(books.id, id));
}

export async function getBookCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(books);
  return result[0]?.count ?? 0;
}

// ============ Subjects ============

export async function getAllSubjects(): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(subjects.name);
}

export async function getOrCreateSubject(name: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await db.select().from(subjects).where(eq(subjects.slug, slug)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(subjects).values({ name, slug }).returning({ id: subjects.id });
  return result[0]?.id ?? null;
}

export async function linkBookToSubject(bookId: number, subjectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(bookSubjects).values({ bookId, subjectId });
  } catch {
    // Already linked - ignore duplicate
  }
}

export async function getSubjectsByBookId(bookId: number): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(bookSubjects).innerJoin(subjects, eq(bookSubjects.subjectId, subjects.id)).where(eq(bookSubjects.bookId, bookId));
  return rows.map((r) => r.subjects);
}

// ============ Genres ============

export async function getGenres(): Promise<Genre[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(genres);
}

export async function getGenreBySlug(slug: string): Promise<Genre | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(genres).where(eq(genres.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGenre(genre: InsertGenre) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(genres).values(genre);
}

export async function getOrCreateGenre(name: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await getGenreBySlug(slug);
  if (existing) return existing.id;
  const result = await db.insert(genres).values({ name, slug }).returning({ id: genres.id });
  return result[0]?.id ?? null;
}

// ============ Bookshelf ============

export async function getUserBookshelf(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookshelves).where(eq(bookshelves.userId, userId)).orderBy(desc(bookshelves.savedAt)).limit(limit).offset(offset);
}

export async function addToBookshelf(userId: number, bookId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(bookshelves).values({ userId, bookId });
}

export async function removeFromBookshelf(userId: number, bookId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.delete(bookshelves).where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId)));
}

export async function isBookInBookshelf(userId: number, bookId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(bookshelves).where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId))).limit(1);
  return result.length > 0;
}

export async function getBookshelfBookIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(bookshelves).where(eq(bookshelves.userId, userId));
  return items.map((item) => item.bookId);
}

// ============ Download history ============

export async function getUserDownloadHistory(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(downloadHistory).where(eq(downloadHistory.userId, userId)).orderBy(desc(downloadHistory.downloadedAt)).limit(limit).offset(offset);
}

export async function recordDownload(userId: number, bookId: number, format: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(downloadHistory).values({ userId, bookId, format });
  await incrementDownloadCount(bookId);
  return result;
}

export async function getUserDownloads(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(downloadHistory).where(eq(downloadHistory.userId, userId));
  return result[0]?.count ?? 0;
}

export async function getTotalDownloadCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(downloadHistory);
  return result[0]?.count ?? 0;
}

// ============ Reading Progress ============

export async function updateReadingProgress(userId: number, bookId: number, data: { currentPage?: number; totalPages?: number; percentage?: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId))).limit(1);
  if (existing.length > 0) {
    const updateData: any = { lastReadAt: new Date() };
    if (data.currentPage !== undefined) updateData.currentPage = data.currentPage;
    if (data.totalPages !== undefined) updateData.totalPages = data.totalPages;
    if (data.percentage !== undefined) updateData.percentage = data.percentage;
    await db.update(readingProgress).set(updateData).where(eq(readingProgress.id, existing[0].id));
  } else {
    await db.insert(readingProgress).values({
      userId,
      bookId,
      currentPage: data.currentPage ?? 0,
      totalPages: data.totalPages ?? null,
      percentage: data.percentage ?? 0,
    });
  }
}

export async function getReadingProgress(userId: number, bookId: number): Promise<ReadingProgress | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllReadingProgress(userId: number, limit: number = 20, offset: number = 0): Promise<ReadingProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingProgress).where(eq(readingProgress.userId, userId)).orderBy(desc(readingProgress.lastReadAt)).limit(limit).offset(offset);
}

export async function getCurrentlyReading(userId: number): Promise<ReadingProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.percentage, 0))).orderBy(desc(readingProgress.lastReadAt)).limit(10);
}

// ============ Recommendations ============

export async function getRecommendationsForUser(userId: number, limit: number = 12): Promise<Recommendation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recommendations).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.score)).limit(limit);
}

export async function generateRecommendations(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get user's reading history and bookshelf
  const bookshelfItems = await getBookshelfBookIds(userId);
  const readingItems = await getAllReadingProgress(userId, 50);

  if (bookshelfItems.length === 0 && readingItems.length === 0) return;

  const allBookIds = [...bookshelfItems, ...readingItems.map((r) => r.bookId)];
  if (allBookIds.length === 0) return;

  // Get subjects from user's books
  const subjectCounts: Record<number, number> = {};
  for (const bookId of allBookIds) {
    const bookSubjs = await getSubjectsByBookId(bookId);
    for (const subject of bookSubjs) {
      subjectCounts[subject.id] = (subjectCounts[subject.id] || 0) + 1;
    }
  }

  const topSubjects = Object.entries(subjectCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => parseInt(id));
  if (topSubjects.length === 0) return;

  // Clear old recommendations
  await db.delete(recommendations).where(eq(recommendations.userId, userId));

  // Insert new recommendations
  const recBookIds: number[] = [];
  for (const subjectId of topSubjects) {
    const relatedBooks = await db.select().from(bookSubjects).where(eq(bookSubjects.subjectId, subjectId)).limit(10);
    for (const bs of relatedBooks) {
      if (!recBookIds.includes(bs.bookId) && !allBookIds.includes(bs.bookId)) {
        recBookIds.push(bs.bookId);
        const score = subjectCounts[subjectId] * 10;
        await db.insert(recommendations).values({
          userId,
          bookId: bs.bookId,
          score,
          reason: `Based on your interests in related topics`,
        });
      }
      if (recBookIds.length >= 50) break;
    }
    if (recBookIds.length >= 50) break;
  }
}

// ============ Aggregator Logs ============

export async function getAggregatorLogs(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aggregatorLogs).orderBy(desc(aggregatorLogs.startedAt)).limit(limit).offset(offset);
}

export async function createAggregatorLog(log: InsertAggregatorLog) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(aggregatorLogs).values(log).returning({ id: aggregatorLogs.id });
  return result[0];
}

export async function updateAggregatorLog(id: number, updates: Partial<InsertAggregatorLog>) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(aggregatorLogs).set(updates).where(eq(aggregatorLogs.id, id));
}

export async function getLatestAggregatorLog(): Promise<AggregatorLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aggregatorLogs).orderBy(desc(aggregatorLogs.startedAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Aggregator Sources ============

export async function getAggregatorSources(): Promise<AggregatorSource[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aggregatorSources).orderBy(aggregatorSources.name);
}

export async function createAggregatorSource(data: InsertAggregatorSource) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(aggregatorSources).values(data);
}

export async function updateAggregatorSource(id: number, data: Partial<InsertAggregatorSource>) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(aggregatorSources).set(data).where(eq(aggregatorSources.id, id));
}

export async function initializeDefaultSources(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const defaultSources = [
    { name: "Project Gutenberg", slug: "gutenberg", url: "https://gutendex.com/books", isActive: "yes" as const, config: "{}" },
    { name: "DOAB", slug: "doab", url: "https://directory.doabooks.org", isActive: "yes" as const, config: "{}" },
    { name: "Open Textbook Library", slug: "open_textbook", url: "https://open.umn.edu/opentextbooks", isActive: "yes" as const, config: "{}" },
    { name: "KICD", slug: "kicd", url: "https://kicd.ac.ke", isActive: "yes" as const, config: "{}" },
    { name: "KNEC", slug: "knec", url: "https://cba.knec.ac.ke", isActive: "yes" as const, config: "{}" },
    { name: "AJOL", slug: "ajol", url: "https://www.ajol.info", isActive: "no" as const, config: "{}" },
  ];
  for (const source of defaultSources) {
    try {
      await db.insert(aggregatorSources).values(source);
    } catch {
      // Already exists
    }
  }
}

// ============ Dashboard Stats ============

export async function getDashboardStats(): Promise<{
  totalBooks: number;
  totalUsers: number;
  totalDownloads: number;
  booksBySource: Record<string, number>;
}> {
  const totalBooks = await getBookCount();
  const totalUsers = await getUserCount();
  const totalDownloads = await getTotalDownloadCount();

  const db = await getDb();
  const booksBySource: Record<string, number> = {};
  if (db) {
    const sourceResult = await db.select({
      source: books.source,
      count: count(),
    }).from(books).groupBy(books.source);
    for (const row of sourceResult) {
      booksBySource[row.source || "unknown"] = row.count;
    }
  }

  return { totalBooks, totalUsers, totalDownloads, booksBySource };
}

// ============ Seeding ============

export async function seedDefaultGenres(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const defaultGenres = [
    { name: "Fiction", slug: "fiction", description: "Novels, short stories, and creative writing" },
    { name: "Science", slug: "science", description: "Scientific texts and academic papers" },
    { name: "History", slug: "history", description: "Historical accounts and biographies" },
    { name: "Mathematics", slug: "mathematics", description: "Mathematical texts and textbooks" },
    { name: "Literature", slug: "literature", description: "Classic literature and poetry" },
    { name: "Philosophy", slug: "philosophy", description: "Philosophical texts and essays" },
    { name: "Technology", slug: "technology", description: "Technical manuals and programming" },
    { name: "Education", slug: "education", description: "Textbooks and educational materials" },
    { name: "Arts", slug: "arts", description: "Art, music, and creative arts" },
    { name: "Business", slug: "business", description: "Business and economics texts" },
    { name: "Social Science", slug: "social_science", description: "Sociology, psychology, anthropology" },
    { name: "Law", slug: "law", description: "Legal texts and jurisprudence" },
    { name: "Medicine", slug: "medicine", description: "Medical texts and health sciences" },
  ];
  for (const genre of defaultGenres) {
    try {
      await db.insert(genres).values(genre);
    } catch {
      // Already exists
    }
  }
}
