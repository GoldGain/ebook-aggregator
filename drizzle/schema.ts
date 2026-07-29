import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Genres/categories for organizing books
 */
export const genres = mysqlTable("genres", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Genre = typeof genres.$inferSelect;
export type InsertGenre = typeof genres.$inferInsert;

/**
 * Books from Project Gutenberg and other sources
 */
export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  gutenbergId: int("gutenbergId").unique(), // Project Gutenberg ID
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  description: text("description"),
  language: varchar("language", { length: 10 }).default("en").notNull(), // ISO 639-1 code
  coverUrl: text("coverUrl"), // URL to book cover image
  subjects: text("subjects"), // JSON array of subjects
  formats: text("formats"), // JSON object with format URLs (epub, pdf, txt, html)
  downloadCount: int("downloadCount").default(0),
  genreId: int("genreId").references(() => genres.id),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/**
 * User bookshelf - saved books
 */
export const bookshelves = mysqlTable("bookshelves", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: int("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});

export type Bookshelf = typeof bookshelves.$inferSelect;
export type InsertBookshelf = typeof bookshelves.$inferInsert;

/**
 * Download history - track user downloads
 */
export const downloadHistory = mysqlTable("downloadHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: int("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  format: varchar("format", { length: 50 }).notNull(), // epub, pdf, txt, html
  downloadedAt: timestamp("downloadedAt").defaultNow().notNull(),
});

export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type InsertDownloadHistory = typeof downloadHistory.$inferInsert;

/**
 * Aggregator logs - track bulk import runs
 */
export const aggregatorLogs = mysqlTable("aggregatorLogs", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["pending", "running", "success", "failed"]).default("pending").notNull(),
  booksAdded: int("booksAdded").default(0),
  booksUpdated: int("booksUpdated").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type AggregatorLog = typeof aggregatorLogs.$inferSelect;
export type InsertAggregatorLog = typeof aggregatorLogs.$inferInsert;