import { and, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  books,
  InsertBook,
  genres,
  InsertGenre,
  bookshelves,
  InsertBookshelf,
  downloadHistory,
  InsertDownloadHistory,
  aggregatorLogs,
  InsertAggregatorLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Books queries
 */
export async function getBooks(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).limit(limit).offset(offset);
}

export async function getBookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookByGutenbergId(gutenbergId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.gutenbergId, gutenbergId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchBooks(query: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(books)
    .where(
      or(
        like(books.title, searchTerm),
        like(books.author, searchTerm),
        like(books.subjects, searchTerm)
      )
    )
    .limit(limit)
    .offset(offset);
}

export async function getBooksByGenre(genreId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(books)
    .where(eq(books.genreId, genreId))
    .limit(limit)
    .offset(offset);
}

export async function getBooksByLanguage(language: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(books)
    .where(eq(books.language, language))
    .limit(limit)
    .offset(offset);
}

export async function createBook(book: InsertBook) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(books).values(book);
  return result;
}

export async function updateBook(id: number, updates: Partial<InsertBook>) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(books).set(updates).where(eq(books.id, id));
}

/**
 * Genres queries
 */
export async function getGenres() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(genres);
}

export async function getGenreBySlug(slug: string) {
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

/**
 * Bookshelf queries
 */
export async function getUserBookshelf(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bookshelves)
    .where(eq(bookshelves.userId, userId))
    .limit(limit)
    .offset(offset);
}

export async function addToBookshelf(userId: number, bookId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(bookshelves).values({ userId, bookId });
}

export async function removeFromBookshelf(userId: number, bookId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .delete(bookshelves)
    .where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId)));
}

export async function isBookInBookshelf(userId: number, bookId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(bookshelves)
    .where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId)))
    .limit(1);
  return result.length > 0;
}

/**
 * Download history queries
 */
export async function getUserDownloadHistory(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(downloadHistory)
    .where(eq(downloadHistory.userId, userId))
    .limit(limit)
    .offset(offset);
}

export async function recordDownload(userId: number, bookId: number, format: string) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(downloadHistory).values({ userId, bookId, format });
}

/**
 * Aggregator log queries
 */
export async function getAggregatorLogs(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aggregatorLogs).limit(limit).offset(offset);
}

export async function createAggregatorLog(log: InsertAggregatorLog) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(aggregatorLogs).values(log);
}

export async function updateAggregatorLog(id: number, updates: Partial<InsertAggregatorLog>) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(aggregatorLogs).set(updates).where(eq(aggregatorLogs.id, id));
}
