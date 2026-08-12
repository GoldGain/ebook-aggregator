import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar, index, uniqueIndex, serial } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Genres/categories for organizing books (primary category labels)
 */
export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Genre = typeof genres.$inferSelect;
export type InsertGenre = typeof genres.$inferInsert;

/**
 * Subjects - specific subject tags for books (more granular than genres)
 */
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("subjects_name_idx").on(table.name),
}));

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

/**
 * Books from Project Gutenberg and other sources
 */
export const educationalLevelEnum = pgEnum("educationalLevel", [
  "primary", "middle_school", "high_school", "college", "university", "professional", "general"
]);

export const rightsStatusEnum = pgEnum("rightsStatus", [
  "public_domain", "open_access", "metadata_only", "unknown"
]);

export const sourceEnum = pgEnum("source", [
  "gutenberg", "kicd", "knec", "doab", "open_textbook", "ajol", "unesco", "worldbank", "google_books",
  "internet_archive", "open_library", "oer_commons", "mit_ocw", "openstax", "libretexts",
  "wikibooks", "wikisource", "doaj", "pubmed", "ssrn", "saylor", "merlot", "openlearn",
  "kenyaplex", "easy_elimu", "atika_school", "schools_net", "teacher_co_ke", "cbc_resources",
  "teachers_updates", "ck12", "oasis", "other"
]);

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  gutenbergId: integer("gutenbergId").unique(), // Project Gutenberg ID
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  description: text("description"),
  language: varchar("language", { length: 10 }).default("en").notNull(), // ISO 639-1 code
  coverUrl: text("coverUrl"), // URL to book cover image
  subjects: text("subjects"), // JSON array of subjects
  formats: text("formats"), // JSON object with format URLs (epub, pdf, txt, html)
  downloadCount: integer("downloadCount").default(0),
  genreId: integer("genreId").references(() => genres.id),
  educationalLevel: educationalLevelEnum("educationalLevel"),
  source: sourceEnum("source").default("gutenberg"),
  sourceUrl: text("sourceUrl"), // Original URL from source
  rightsStatus: rightsStatusEnum("rightsStatus").default("unknown").notNull(),
  licenseName: varchar("licenseName", { length: 255 }),
  licenseUrl: text("licenseUrl"),
  directDownloadAllowed: boolean("directDownloadAllowed").default(false).notNull(),
  md5: varchar("md5", { length: 32 }),
  provenanceCheckedAt: timestamp("provenanceCheckedAt"),
  isbn: varchar("isbn", { length: 20 }),
  pages: integer("pages"),
  publisher: varchar("publisher", { length: 255 }),
  publishedDate: varchar("publishedDate", { length: 50 }),
  rating: integer("rating"), // 1-5 stars
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  titleIdx: index("books_title_idx").on(table.title),
  authorIdx: index("books_author_idx").on(table.author),
  languageIdx: index("books_language_idx").on(table.language),
  genreIdx: index("books_genre_idx").on(table.genreId),
  sourceIdx: index("books_source_idx").on(table.source),
}));

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/**
 * Book-Subject junction table (many-to-many)
 */
export const bookSubjects = pgTable("bookSubjects", {
  id: serial("id").primaryKey(),
  bookId: integer("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  subjectId: integer("subjectId")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniquePair: uniqueIndex("book_subjects_unique").on(table.bookId, table.subjectId),
}));

export type BookSubject = typeof bookSubjects.$inferSelect;
export type InsertBookSubject = typeof bookSubjects.$inferInsert;

/**
 * User bookshelf - saved books
 */
export const bookshelves = pgTable("bookshelves", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
}, (table) => ({
  uniquePair: uniqueIndex("bookshelf_user_book_unique").on(table.userId, table.bookId),
}));

export type Bookshelf = typeof bookshelves.$inferSelect;
export type InsertBookshelf = typeof bookshelves.$inferInsert;

/**
 * Download history - track user downloads
 */
export const downloadHistory = pgTable("downloadHistory", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  format: varchar("format", { length: 50 }).notNull(), // epub, pdf, txt, html, mobi
  downloadedAt: timestamp("downloadedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("download_history_user_idx").on(table.userId),
  bookIdx: index("download_history_book_idx").on(table.bookId),
}));

export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type InsertDownloadHistory = typeof downloadHistory.$inferInsert;

/**
 * Reading progress - track what users are reading
 */
export const readingProgress = pgTable("readingProgress", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  currentPage: integer("currentPage").default(0),
  totalPages: integer("totalPages"),
  percentage: integer("percentage").default(0), // 0-100
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  uniquePair: uniqueIndex("reading_progress_user_book_unique").on(table.userId, table.bookId),
  userIdx: index("reading_progress_user_idx").on(table.userId),
}));

export type ReadingProgress = typeof readingProgress.$inferSelect;
export type InsertReadingProgress = typeof readingProgress.$inferInsert;

/**
 * Book recommendations - algorithmic recommendations based on user behavior
 */
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  score: integer("score").default(0), // recommendation score
  reason: varchar("reason", { length: 255 }), // e.g., "based on your reading of X"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("recommendations_user_idx").on(table.userId),
  scoreIdx: index("recommendations_score_idx").on(table.score),
}));

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

/**
 * Aggregator logs - track bulk import runs
 */
export const aggregatorStatusEnum = pgEnum("aggregatorStatus", ["pending", "running", "success", "failed"]);

export const aggregatorLogs = pgTable("aggregatorLogs", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 50 }).default("gutenberg"), // which source was aggregated
  status: aggregatorStatusEnum("status").default("pending").notNull(),
  booksAdded: integer("booksAdded").default(0),
  booksUpdated: integer("booksUpdated").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  statusIdx: index("aggregator_logs_status_idx").on(table.status),
}));

export type AggregatorLog = typeof aggregatorLogs.$inferSelect;
export type InsertAggregatorLog = typeof aggregatorLogs.$inferInsert;

/**
 * Aggregator sources - configuration for each aggregation source
 */
export const isActiveEnum = pgEnum("isActive", ["yes", "no"]);

export const aggregatorSources = pgTable("aggregatorSources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  url: text("url"),
  isActive: isActiveEnum("isActive").default("yes").notNull(),
  lastRunAt: timestamp("lastRunAt"),
  booksFetched: integer("booksFetched").default(0),
  config: text("config"), // JSON config for the source
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AggregatorSource = typeof aggregatorSources.$inferSelect;
export type InsertAggregatorSource = typeof aggregatorSources.$inferInsert;
