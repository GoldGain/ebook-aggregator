var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    };
  }
});

// drizzle/schema.ts
import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar, index, uniqueIndex, serial } from "drizzle-orm/pg-core";
var roleEnum, users, genres, subjects, educationalLevelEnum, rightsStatusEnum, sourceEnum, books, bookSubjects, bookshelves, downloadHistory, readingProgress, recommendations, aggregatorStatusEnum, aggregatorLogs, isActiveEnum, aggregatorSources;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    roleEnum = pgEnum("role", ["user", "admin"]);
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: roleEnum("role").default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    genres = pgTable("genres", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 128 }).notNull().unique(),
      slug: varchar("slug", { length: 128 }).notNull().unique(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    subjects = pgTable("subjects", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull().unique(),
      slug: varchar("slug", { length: 255 }).notNull().unique(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      nameIdx: index("subjects_name_idx").on(table.name)
    }));
    educationalLevelEnum = pgEnum("educationalLevel", [
      "primary",
      "middle_school",
      "high_school",
      "college",
      "university",
      "professional",
      "general"
    ]);
    rightsStatusEnum = pgEnum("rightsStatus", [
      "public_domain",
      "open_access",
      "metadata_only",
      "unknown"
    ]);
    sourceEnum = pgEnum("source", [
      "gutenberg",
      "kicd",
      "knec",
      "doab",
      "open_textbook",
      "ajol",
      "unesco",
      "worldbank",
      "google_books",
      "internet_archive",
      "open_library",
      "oer_commons",
      "mit_ocw",
      "openstax",
      "libretexts",
      "wikibooks",
      "wikisource",
      "doaj",
      "pubmed",
      "ssrn",
      "saylor",
      "merlot",
      "openlearn",
      "kenyaplex",
      "easy_elimu",
      "atika_school",
      "schools_net",
      "teacher_co_ke",
      "cbc_resources",
      "teachers_updates",
      "ck12",
      "oasis",
      "other"
    ]);
    books = pgTable("books", {
      id: serial("id").primaryKey(),
      gutenbergId: integer("gutenbergId").unique(),
      // Project Gutenberg ID
      title: varchar("title", { length: 255 }).notNull(),
      author: varchar("author", { length: 255 }),
      description: text("description"),
      language: varchar("language", { length: 10 }).default("en").notNull(),
      // ISO 639-1 code
      coverUrl: text("coverUrl"),
      // URL to book cover image
      subjects: text("subjects"),
      // JSON array of subjects
      formats: text("formats"),
      // JSON object with format URLs (epub, pdf, txt, html)
      downloadCount: integer("downloadCount").default(0),
      genreId: integer("genreId").references(() => genres.id),
      educationalLevel: educationalLevelEnum("educationalLevel"),
      source: sourceEnum("source").default("gutenberg"),
      sourceUrl: text("sourceUrl"),
      // Original URL from source
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
      rating: integer("rating"),
      // 1-5 stars
      importedAt: timestamp("importedAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    }, (table) => ({
      titleIdx: index("books_title_idx").on(table.title),
      authorIdx: index("books_author_idx").on(table.author),
      languageIdx: index("books_language_idx").on(table.language),
      genreIdx: index("books_genre_idx").on(table.genreId),
      sourceIdx: index("books_source_idx").on(table.source)
    }));
    bookSubjects = pgTable("bookSubjects", {
      id: serial("id").primaryKey(),
      bookId: integer("bookId").notNull().references(() => books.id, { onDelete: "cascade" }),
      subjectId: integer("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      uniquePair: uniqueIndex("book_subjects_unique").on(table.bookId, table.subjectId)
    }));
    bookshelves = pgTable("bookshelves", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
      bookId: integer("bookId").notNull().references(() => books.id, { onDelete: "cascade" }),
      savedAt: timestamp("savedAt").defaultNow().notNull()
    }, (table) => ({
      uniquePair: uniqueIndex("bookshelf_user_book_unique").on(table.userId, table.bookId)
    }));
    downloadHistory = pgTable("downloadHistory", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
      bookId: integer("bookId").notNull().references(() => books.id, { onDelete: "cascade" }),
      format: varchar("format", { length: 50 }).notNull(),
      // epub, pdf, txt, html, mobi
      downloadedAt: timestamp("downloadedAt").defaultNow().notNull()
    }, (table) => ({
      userIdx: index("download_history_user_idx").on(table.userId),
      bookIdx: index("download_history_book_idx").on(table.bookId)
    }));
    readingProgress = pgTable("readingProgress", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
      bookId: integer("bookId").notNull().references(() => books.id, { onDelete: "cascade" }),
      currentPage: integer("currentPage").default(0),
      totalPages: integer("totalPages"),
      percentage: integer("percentage").default(0),
      // 0-100
      lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    }, (table) => ({
      uniquePair: uniqueIndex("reading_progress_user_book_unique").on(table.userId, table.bookId),
      userIdx: index("reading_progress_user_idx").on(table.userId)
    }));
    recommendations = pgTable("recommendations", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
      bookId: integer("bookId").notNull().references(() => books.id, { onDelete: "cascade" }),
      score: integer("score").default(0),
      // recommendation score
      reason: varchar("reason", { length: 255 }),
      // e.g., "based on your reading of X"
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => ({
      userIdx: index("recommendations_user_idx").on(table.userId),
      scoreIdx: index("recommendations_score_idx").on(table.score)
    }));
    aggregatorStatusEnum = pgEnum("aggregatorStatus", ["pending", "running", "success", "failed"]);
    aggregatorLogs = pgTable("aggregatorLogs", {
      id: serial("id").primaryKey(),
      source: varchar("source", { length: 50 }).default("gutenberg"),
      // which source was aggregated
      status: aggregatorStatusEnum("status").default("pending").notNull(),
      booksAdded: integer("booksAdded").default(0),
      booksUpdated: integer("booksUpdated").default(0),
      errorMessage: text("errorMessage"),
      startedAt: timestamp("startedAt").defaultNow().notNull(),
      completedAt: timestamp("completedAt")
    }, (table) => ({
      statusIdx: index("aggregator_logs_status_idx").on(table.status)
    }));
    isActiveEnum = pgEnum("isActive", ["yes", "no"]);
    aggregatorSources = pgTable("aggregatorSources", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 128 }).notNull().unique(),
      slug: varchar("slug", { length: 128 }).notNull().unique(),
      url: text("url"),
      isActive: isActiveEnum("isActive").default("yes").notNull(),
      lastRunAt: timestamp("lastRunAt"),
      booksFetched: integer("booksFetched").default(0),
      config: text("config"),
      // JSON config for the source
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addToBookshelf: () => addToBookshelf,
  countBooks: () => countBooks,
  createAggregatorLog: () => createAggregatorLog,
  createAggregatorSource: () => createAggregatorSource,
  createBook: () => createBook,
  createGenre: () => createGenre,
  deleteBook: () => deleteBook,
  generateRecommendations: () => generateRecommendations,
  getAggregatorLogs: () => getAggregatorLogs,
  getAggregatorSources: () => getAggregatorSources,
  getAllReadingProgress: () => getAllReadingProgress,
  getAllSubjects: () => getAllSubjects,
  getAllUsers: () => getAllUsers,
  getBookByGutenbergId: () => getBookByGutenbergId,
  getBookById: () => getBookById,
  getBookByTitleAuthor: () => getBookByTitleAuthor,
  getBookCount: () => getBookCount,
  getBooks: () => getBooks,
  getBooksByEducationalLevel: () => getBooksByEducationalLevel,
  getBooksByGenre: () => getBooksByGenre,
  getBooksByLanguage: () => getBooksByLanguage,
  getBooksBySource: () => getBooksBySource,
  getBookshelfBookIds: () => getBookshelfBookIds,
  getCurrentlyReading: () => getCurrentlyReading,
  getDashboardStats: () => getDashboardStats,
  getDb: () => getDb,
  getGenreBySlug: () => getGenreBySlug,
  getGenres: () => getGenres,
  getLatestAggregatorLog: () => getLatestAggregatorLog,
  getOrCreateGenre: () => getOrCreateGenre,
  getOrCreateSubject: () => getOrCreateSubject,
  getPopularBooks: () => getPopularBooks,
  getReadingProgress: () => getReadingProgress,
  getRecentBooks: () => getRecentBooks,
  getRecommendationsForUser: () => getRecommendationsForUser,
  getSubjectsByBookId: () => getSubjectsByBookId,
  getTotalDownloadCount: () => getTotalDownloadCount,
  getUserBookshelf: () => getUserBookshelf,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserCount: () => getUserCount,
  getUserDownloadHistory: () => getUserDownloadHistory,
  getUserDownloads: () => getUserDownloads,
  incrementDownloadCount: () => incrementDownloadCount,
  initializeDefaultSources: () => initializeDefaultSources,
  isBookInBookshelf: () => isBookInBookshelf,
  linkBookToSubject: () => linkBookToSubject,
  listBooks: () => listBooks,
  recordDownload: () => recordDownload,
  removeFromBookshelf: () => removeFromBookshelf,
  searchBooks: () => searchBooks,
  seedDefaultGenres: () => seedDefaultGenres,
  updateAggregatorLog: () => updateAggregatorLog,
  updateAggregatorSource: () => updateAggregatorSource,
  updateBook: () => updateBook,
  updateReadingProgress: () => updateReadingProgress,
  updateUserRole: () => updateUserRole,
  upsertUser: () => upsertUser
});
import { and, eq, like, ilike, or, desc, asc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
async function getDb() {
  if (!_db) {
    if (!ENV.databaseUrl) {
      console.error("[Database] DATABASE_URL is missing in ENV!");
      return null;
    }
    try {
      console.log("[Database] Initializing new connection...");
      const client = postgres(ENV.databaseUrl, {
        ssl: "require",
        max: 4,
        idle_timeout: DATABASE_IDLE_TIMEOUT_SECONDS,
        max_lifetime: DATABASE_MAX_LIFETIME_SECONDS,
        connect_timeout: DATABASE_CONNECT_TIMEOUT_SECONDS,
        // Supabase transaction pooling does not support prepared statements.
        prepare: false
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to initialize client:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function getAllUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}
async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result2 = await db.select({ count: count() }).from(users);
  return result2[0]?.count ?? 0;
}
async function getBooks(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).limit(limit).offset(offset);
}
async function getBookById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function getBookByGutenbergId(gutenbergId) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(books).where(eq(books.gutenbergId, gutenbergId)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function getBookByTitleAuthor(title, author) {
  const db = await getDb();
  if (!db) return void 0;
  const conditions = [like(books.title, `%${title.substring(0, 100)}%`)];
  if (author) {
    conditions.push(like(books.author, `%${author.substring(0, 50)}%`));
  }
  const result2 = await db.select().from(books).where(and(...conditions)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function searchBooks(query, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  try {
    const words = query.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w) && w.replace(/[^a-zA-Z0-9]/g, "").length >= 3);
    const tsQuery = words.map((w) => `${w.replace(/[^a-zA-Z0-9]/g, "")}:*`).join(" & ");
    if (tsQuery) {
      const rawResult = await db.execute(
        sql`SELECT * FROM books
            WHERE search_vector @@ to_tsquery('english', ${tsQuery})
            ORDER BY ts_rank(search_vector, to_tsquery('english', ${tsQuery})) DESC,
                     "downloadCount" DESC NULLS LAST
            LIMIT ${limit} OFFSET ${offset}`
      );
      const rows = Array.isArray(rawResult) ? rawResult : rawResult.rows ?? [];
      if (rows.length > 0) {
        return rows;
      }
    }
  } catch {
  }
  return db.select().from(books).where(buildSearchCondition(query)).orderBy(desc(books.downloadCount)).limit(limit).offset(offset);
}
function buildSearchCondition(query) {
  const searchTerm = `%${query}%`;
  return or(
    ilike(books.title, searchTerm),
    ilike(books.author, searchTerm),
    ilike(books.subjects, searchTerm),
    ilike(books.description, searchTerm),
    ilike(books.publisher, searchTerm),
    ilike(books.isbn, searchTerm),
    ilike(books.publishedDate, searchTerm)
  );
}
async function countBooks(options) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [];
  if (options.genre) {
    const genre = await getGenreBySlug(options.genre);
    if (genre) conditions.push(eq(books.genreId, genre.id));
  }
  if (options.language) conditions.push(ilike(books.language, options.language));
  if (options.educationalLevel) conditions.push(eq(books.educationalLevel, options.educationalLevel));
  if (options.source) conditions.push(eq(books.source, options.source));
  if (options.search) conditions.push(buildSearchCondition(options.search));
  const result2 = await db.select({ count: count() }).from(books).where(conditions.length > 0 ? and(...conditions) : void 0);
  return result2[0]?.count ?? 0;
}
async function listBooks(options) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (options.genre) {
    const genre = await getGenreBySlug(options.genre);
    if (genre) conditions.push(eq(books.genreId, genre.id));
  }
  if (options.language) {
    conditions.push(ilike(books.language, options.language));
  }
  if (options.educationalLevel) conditions.push(eq(books.educationalLevel, options.educationalLevel));
  if (options.source) conditions.push(eq(books.source, options.source));
  if (options.search) {
    conditions.push(buildSearchCondition(options.search));
  }
  if (options.pdfOnly) {
    conditions.push(like(books.formats, '%"pdf":%'));
  }
  let orderBy = desc(books.importedAt);
  if (options.sort === "downloads") orderBy = desc(books.downloadCount);
  else if (options.sort === "title") orderBy = asc(books.title);
  else if (options.sort === "author") orderBy = asc(books.author);
  return db.select().from(books).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(orderBy).limit(options.limit).offset(options.offset);
}
async function getRecentBooks(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).orderBy(desc(books.importedAt)).limit(limit);
}
async function getPopularBooks(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).orderBy(desc(books.downloadCount)).limit(limit);
}
async function getBooksByEducationalLevel(level, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.educationalLevel, level)).orderBy(desc(books.importedAt)).limit(limit);
}
async function getBooksBySource(source, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.source, source)).orderBy(desc(books.importedAt)).limit(limit);
}
async function getBooksByGenre(genreId, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.genreId, genreId)).limit(limit).offset(offset);
}
async function getBooksByLanguage(language, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.language, language)).limit(limit).offset(offset);
}
async function createBook(book) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.insert(books).values(book).returning({ id: books.id });
  return result2[0]?.id;
}
async function updateBook(id, updates) {
  const db = await getDb();
  if (!db) return void 0;
  return db.update(books).set(updates).where(eq(books.id, id));
}
async function incrementDownloadCount(id) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE books SET downloadCount = downloadCount + 1 WHERE id = ${id}`);
}
async function deleteBook(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(books).where(eq(books.id, id));
}
async function getBookCount() {
  const db = await getDb();
  if (!db) return 0;
  const result2 = await db.select({ count: count() }).from(books);
  return result2[0]?.count ?? 0;
}
async function getAllSubjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(subjects.name);
}
async function getOrCreateSubject(name) {
  const db = await getDb();
  if (!db) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await db.select().from(subjects).where(eq(subjects.slug, slug)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result2 = await db.insert(subjects).values({ name, slug }).returning({ id: subjects.id });
  return result2[0]?.id ?? null;
}
async function linkBookToSubject(bookId, subjectId) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(bookSubjects).values({ bookId, subjectId });
  } catch {
  }
}
async function getSubjectsByBookId(bookId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(bookSubjects).innerJoin(subjects, eq(bookSubjects.subjectId, subjects.id)).where(eq(bookSubjects.bookId, bookId));
  return rows.map((r) => r.subjects);
}
async function getGenres() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(genres);
}
async function getGenreBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(genres).where(eq(genres.slug, slug)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function createGenre(genre) {
  const db = await getDb();
  if (!db) return void 0;
  return db.insert(genres).values(genre);
}
async function getOrCreateGenre(name) {
  const db = await getDb();
  if (!db) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await getGenreBySlug(slug);
  if (existing) return existing.id;
  const result2 = await db.insert(genres).values({ name, slug }).returning({ id: genres.id });
  return result2[0]?.id ?? null;
}
async function getUserBookshelf(userId, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookshelves).where(eq(bookshelves.userId, userId)).orderBy(desc(bookshelves.savedAt)).limit(limit).offset(offset);
}
async function addToBookshelf(userId, bookId) {
  const db = await getDb();
  if (!db) return void 0;
  return db.insert(bookshelves).values({ userId, bookId });
}
async function removeFromBookshelf(userId, bookId) {
  const db = await getDb();
  if (!db) return void 0;
  return db.delete(bookshelves).where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId)));
}
async function isBookInBookshelf(userId, bookId) {
  const db = await getDb();
  if (!db) return false;
  const result2 = await db.select().from(bookshelves).where(and(eq(bookshelves.userId, userId), eq(bookshelves.bookId, bookId))).limit(1);
  return result2.length > 0;
}
async function getBookshelfBookIds(userId) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(bookshelves).where(eq(bookshelves.userId, userId));
  return items.map((item) => item.bookId);
}
async function getUserDownloadHistory(userId, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(downloadHistory).where(eq(downloadHistory.userId, userId)).orderBy(desc(downloadHistory.downloadedAt)).limit(limit).offset(offset);
}
async function recordDownload(userId, bookId, format) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.insert(downloadHistory).values({ userId, bookId, format });
  await incrementDownloadCount(bookId);
  return result2;
}
async function getUserDownloads(userId) {
  const db = await getDb();
  if (!db) return 0;
  const result2 = await db.select({ count: count() }).from(downloadHistory).where(eq(downloadHistory.userId, userId));
  return result2[0]?.count ?? 0;
}
async function getTotalDownloadCount() {
  const db = await getDb();
  if (!db) return 0;
  const result2 = await db.select({ count: count() }).from(downloadHistory);
  return result2[0]?.count ?? 0;
}
async function updateReadingProgress(userId, bookId, data) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId))).limit(1);
  if (existing.length > 0) {
    const updateData = { lastReadAt: /* @__PURE__ */ new Date() };
    if (data.currentPage !== void 0) updateData.currentPage = data.currentPage;
    if (data.totalPages !== void 0) updateData.totalPages = data.totalPages;
    if (data.percentage !== void 0) updateData.percentage = data.percentage;
    await db.update(readingProgress).set(updateData).where(eq(readingProgress.id, existing[0].id));
  } else {
    await db.insert(readingProgress).values({
      userId,
      bookId,
      currentPage: data.currentPage ?? 0,
      totalPages: data.totalPages ?? null,
      percentage: data.percentage ?? 0
    });
  }
}
async function getReadingProgress(userId, bookId) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId))).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function getAllReadingProgress(userId, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingProgress).where(eq(readingProgress.userId, userId)).orderBy(desc(readingProgress.lastReadAt)).limit(limit).offset(offset);
}
async function getCurrentlyReading(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.percentage, 0))).orderBy(desc(readingProgress.lastReadAt)).limit(10);
}
async function getRecommendationsForUser(userId, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recommendations).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.score)).limit(limit);
}
async function generateRecommendations(userId) {
  const db = await getDb();
  if (!db) return;
  const bookshelfItems = await getBookshelfBookIds(userId);
  const readingItems = await getAllReadingProgress(userId, 50);
  if (bookshelfItems.length === 0 && readingItems.length === 0) return;
  const allBookIds = [...bookshelfItems, ...readingItems.map((r) => r.bookId)];
  if (allBookIds.length === 0) return;
  const subjectCounts = {};
  for (const bookId of allBookIds) {
    const bookSubjs = await getSubjectsByBookId(bookId);
    for (const subject of bookSubjs) {
      subjectCounts[subject.id] = (subjectCounts[subject.id] || 0) + 1;
    }
  }
  const topSubjects = Object.entries(subjectCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => parseInt(id));
  if (topSubjects.length === 0) return;
  await db.delete(recommendations).where(eq(recommendations.userId, userId));
  const recBookIds = [];
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
          reason: `Based on your interests in related topics`
        });
      }
      if (recBookIds.length >= 50) break;
    }
    if (recBookIds.length >= 50) break;
  }
}
async function getAggregatorLogs(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aggregatorLogs).orderBy(desc(aggregatorLogs.startedAt)).limit(limit).offset(offset);
}
async function createAggregatorLog(log) {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.insert(aggregatorLogs).values(log).returning({ id: aggregatorLogs.id });
  return result2[0];
}
async function updateAggregatorLog(id, updates) {
  const db = await getDb();
  if (!db) return void 0;
  return db.update(aggregatorLogs).set(updates).where(eq(aggregatorLogs.id, id));
}
async function getLatestAggregatorLog() {
  const db = await getDb();
  if (!db) return void 0;
  const result2 = await db.select().from(aggregatorLogs).orderBy(desc(aggregatorLogs.startedAt)).limit(1);
  return result2.length > 0 ? result2[0] : void 0;
}
async function getAggregatorSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aggregatorSources).orderBy(aggregatorSources.name);
}
async function createAggregatorSource(data) {
  const db = await getDb();
  if (!db) return void 0;
  return db.insert(aggregatorSources).values(data);
}
async function updateAggregatorSource(id, data) {
  const db = await getDb();
  if (!db) return void 0;
  return db.update(aggregatorSources).set(data).where(eq(aggregatorSources.id, id));
}
async function initializeDefaultSources() {
  const db = await getDb();
  if (!db) return;
  const defaultSources = [
    { name: "Project Gutenberg", slug: "gutenberg", url: "https://gutendex.com/books", isActive: "yes", config: "{}" },
    { name: "DOAB", slug: "doab", url: "https://directory.doabooks.org", isActive: "yes", config: "{}" },
    { name: "Open Textbook Library", slug: "open_textbook", url: "https://open.umn.edu/opentextbooks", isActive: "yes", config: "{}" },
    { name: "KICD", slug: "kicd", url: "https://kicd.ac.ke", isActive: "yes", config: "{}" },
    { name: "KNEC", slug: "knec", url: "https://cba.knec.ac.ke", isActive: "yes", config: "{}" },
    { name: "AJOL", slug: "ajol", url: "https://www.ajol.info", isActive: "no", config: "{}" }
  ];
  for (const source of defaultSources) {
    try {
      await db.insert(aggregatorSources).values(source);
    } catch {
    }
  }
}
async function getDashboardStats() {
  const totalBooks = await getBookCount();
  const totalUsers = await getUserCount();
  const totalDownloads = await getTotalDownloadCount();
  const db = await getDb();
  const booksBySource = {};
  if (db) {
    const sourceResult = await db.select({
      source: books.source,
      count: count()
    }).from(books).groupBy(books.source);
    for (const row of sourceResult) {
      booksBySource[row.source || "unknown"] = row.count;
    }
  }
  return { totalBooks, totalUsers, totalDownloads, booksBySource };
}
async function seedDefaultGenres() {
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
    { name: "Medicine", slug: "medicine", description: "Medical texts and health sciences" }
  ];
  for (const genre of defaultGenres) {
    try {
      await db.insert(genres).values(genre);
    } catch {
    }
  }
}
var _db, DATABASE_CONNECT_TIMEOUT_SECONDS, DATABASE_IDLE_TIMEOUT_SECONDS, DATABASE_MAX_LIFETIME_SECONDS;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    init_env();
    _db = null;
    DATABASE_CONNECT_TIMEOUT_SECONDS = 10;
    DATABASE_IDLE_TIMEOUT_SECONDS = 10;
    DATABASE_MAX_LIFETIME_SECONDS = 60;
  }
});

// server/sources/kicd.ts
var kicd_exports = {};
__export(kicd_exports, {
  fetchKicdResources: () => fetchKicdResources,
  searchKicdResources: () => searchKicdResources
});
import axios3 from "axios";
import * as cheerio2 from "cheerio";
async function fetchKicdResources(limit = 50) {
  try {
    let response = null;
    for (const url of KICD_BASE_URLS) {
      try {
        const resp = await axios3.get(url, {
          timeout: 2e4,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/1.0)",
            "Accept": "text/html,application/xhtml+xml"
          }
        });
        if (resp.status === 200) {
          response = resp;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!response) return [];
    const $ = cheerio2.load(response.data);
    const resources = [];
    const seen = /* @__PURE__ */ new Set();
    const allLinks = $('a[href*="/sdm_downloads/"], a[href*="/downloads/"], a[href*=".pdf"], a[href*=".epub"], a[href*=".docx"], a[href*=".pptx"]');
    allLinks.each((_idx, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const text2 = $el.text().trim();
      if (!href || href === KICD_BASE_URLS[0] || href.endsWith("/sdm_downloads/") || text2.toLowerCase() === "more" || text2.toLowerCase() === "downloads" || text2.length < 3) {
        return;
      }
      if (seen.has(href)) return;
      seen.add(href);
      const fullUrl = href.startsWith("http") ? href : `https://kicd.ac.ke${href.startsWith("/") ? "" : "/"}${href}`;
      let educationalLevel = "primary";
      if (href.toLowerCase().includes("secondary") || text2.toLowerCase().includes("secondary")) {
        educationalLevel = "high_school";
      } else if (href.toLowerCase().includes("university") || text2.toLowerCase().includes("university")) {
        educationalLevel = "university";
      } else if (href.toLowerCase().includes("college") || text2.toLowerCase().includes("college")) {
        educationalLevel = "college";
      }
      resources.push({
        id: `kicd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: text2.substring(0, 255),
        author: "KICD",
        description: `KICD educational resource: ${text2}`,
        language: "en",
        subjects: ["Kenya Education", "Curriculum", "CBC"],
        downloadUrl: fullUrl,
        coverUrl: "",
        publishedDate: (/* @__PURE__ */ new Date()).toISOString(),
        educationalLevel,
        sourceUrl: fullUrl
      });
    });
    return resources.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch KICD resources:", error);
    return [];
  }
}
async function searchKicdResources(category) {
  try {
    const searchUrl = `${KICD_BASE_URLS[0]}?s=${encodeURIComponent(category)}`;
    const response = await axios3.get(searchUrl, {
      timeout: 2e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EbookAggregator/1.0)"
      }
    });
    if (response.status !== 200) return [];
    const $ = cheerio2.load(response.data);
    const resources = [];
    $("tr, .download-item, article").each((_idx, el) => {
      const $el = $(el);
      const title = $el.find("td:first-child, h3, .title").first().text().trim();
      const link = $el.find('a[href*=".pdf"], a[href*=".epub"]').first().attr("href") || "";
      if (title && title.length > 3) {
        resources.push({
          id: `kicd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          author: "KICD",
          description: `KICD resource: ${title}`,
          language: "en",
          subjects: [category, "Kenya Education"],
          downloadUrl: link,
          coverUrl: "",
          publishedDate: "",
          educationalLevel: "primary",
          sourceUrl: link
        });
      }
    });
    return resources;
  } catch (error) {
    console.error("Failed to search KICD resources:", error);
    return [];
  }
}
var KICD_BASE_URLS;
var init_kicd = __esm({
  "server/sources/kicd.ts"() {
    KICD_BASE_URLS = ["https://kicd.ac.ke/sdm_downloads/", "https://kicd.ac.ke/downloads/", "https://kicd.ac.ke/curriculum-downloads/"];
  }
});

// server/sources/knec.ts
var knec_exports = {};
__export(knec_exports, {
  fetchKnecResources: () => fetchKnecResources,
  searchKnecResources: () => searchKnecResources
});
import axios4 from "axios";
import * as cheerio3 from "cheerio";
async function fetchKnecResources(limit = 50) {
  try {
    const https = await import("https");
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios4.get(KNEC_BASE_URL, {
      timeout: 2e4,
      httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EbookAggregator/1.0)",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    if (response.status !== 200) return [];
    const $ = cheerio3.load(response.data);
    const resources = [];
    $('a[href*=".pdf"], a[href*=".doc"], a.download, .resource-item, li a').each((_idx, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr("href") || "";
      if (title && title.length > 5 && !title.includes("login") && !title.includes("home")) {
        resources.push({
          id: `knec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 255),
          author: "KNEC",
          description: `KNEC educational resource: ${title.substring(0, 200)}`,
          language: "en",
          subjects: ["Kenya Examinations", "Past Papers", "CBC Assessment"],
          downloadUrl: link.startsWith("http") ? link : `${KNEC_BASE_URL}${link}`,
          coverUrl: "",
          publishedDate: "",
          educationalLevel: "primary",
          sourceUrl: link
        });
      }
    });
    return resources.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch KNEC resources:", error);
    return [];
  }
}
async function searchKnecResources(query) {
  try {
    const searchUrl = `${KNEC_BASE_URL}?s=${encodeURIComponent(query)}`;
    const response = await axios4.get(searchUrl, {
      timeout: 2e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EbookAggregator/1.0)"
      }
    });
    if (response.status !== 200) return [];
    const $ = cheerio3.load(response.data);
    const resources = [];
    $("article a, .result a, li a").each((_idx, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr("href") || "";
      if (title && title.length > 5) {
        resources.push({
          id: `knec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 255),
          author: "KNEC",
          description: `KNEC resource: ${title.substring(0, 200)}`,
          language: "en",
          subjects: [query, "KNEC"],
          downloadUrl: link,
          coverUrl: "",
          publishedDate: "",
          educationalLevel: "primary",
          sourceUrl: link
        });
      }
    });
    return resources;
  } catch (error) {
    console.error("Failed to search KNEC resources:", error);
    return [];
  }
}
var KNEC_BASE_URL;
var init_knec = __esm({
  "server/sources/knec.ts"() {
    KNEC_BASE_URL = "https://cba.knec.ac.ke/";
  }
});

// server/sources/policy.ts
function getSourceRightsPolicy(sourceSlug) {
  return APPROVED_SOURCE_POLICIES[sourceSlug] ?? null;
}
function isApprovedSource(sourceSlug) {
  return getSourceRightsPolicy(sourceSlug) !== null;
}
function selectScheduledSource(now = /* @__PURE__ */ new Date()) {
  const utcDay = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 864e5);
  return SCHEDULED_SOURCE_SLUGS[utcDay % SCHEDULED_SOURCE_SLUGS.length];
}
var APPROVED_SOURCE_POLICIES, SCHEDULED_SOURCE_SLUGS;
var init_policy = __esm({
  "server/sources/policy.ts"() {
    APPROVED_SOURCE_POLICIES = {
      gutenberg: {
        rightsStatus: "public_domain",
        licenseName: "Project Gutenberg public-domain collection",
        licenseUrl: "https://www.gutenberg.org/policy/license.html",
        allowDirectDownload: true
      },
      doab: {
        rightsStatus: "open_access",
        licenseName: "Open-access book; see publisher record for license terms",
        licenseUrl: "https://www.doabooks.org/",
        allowDirectDownload: true
      },
      open_textbook: {
        rightsStatus: "open_access",
        licenseName: "Open textbook; see source record for license terms",
        licenseUrl: "https://open.umn.edu/opentextbooks/",
        allowDirectDownload: true
      },
      openstax: {
        rightsStatus: "open_access",
        licenseName: "OpenStax openly licensed textbook",
        licenseUrl: "https://openstax.org/details/books",
        allowDirectDownload: true
      },
      wikibooks: {
        rightsStatus: "open_access",
        licenseName: "Wikibooks free-content resource",
        licenseUrl: "https://en.wikibooks.org/wiki/Wikibooks:Copyrights",
        allowDirectDownload: false
      },
      wikisource: {
        rightsStatus: "public_domain",
        licenseName: "Wikisource free-content or public-domain text",
        licenseUrl: "https://en.wikisource.org/wiki/Wikisource:Copyright_policy",
        allowDirectDownload: false
      },
      doaj: {
        rightsStatus: "open_access",
        licenseName: "Open-access article indexed by DOAJ",
        licenseUrl: "https://doaj.org/apply/transparency",
        allowDirectDownload: true
      },
      pubmed: {
        rightsStatus: "open_access",
        licenseName: "Open-access article indexed by PubMed Central",
        licenseUrl: "https://pmc.ncbi.nlm.nih.gov/about/",
        allowDirectDownload: false
      },
      ajol: {
        rightsStatus: "open_access",
        licenseName: "Open-access article indexed by African Journals Online",
        licenseUrl: "https://www.ajol.info/",
        allowDirectDownload: false
      },
      open_library: {
        rightsStatus: "open_access",
        licenseName: "Open Library / Internet Archive resource",
        licenseUrl: "https://openlibrary.org/developers/api",
        allowDirectDownload: true
      },
      internet_archive: {
        rightsStatus: "open_access",
        licenseName: "Internet Archive open-access or public-domain item",
        licenseUrl: "https://archive.org/about/terms.php",
        allowDirectDownload: true
      },
      z_library: {
        rightsStatus: "open_access",
        licenseName: "Z-Library shadow library resource",
        licenseUrl: "https://z-lib.gs",
        allowDirectDownload: true
      },
      annas_archive: {
        rightsStatus: "open_access",
        licenseName: "Anna's Archive meta-search resource",
        licenseUrl: "https://annas-archive.org",
        allowDirectDownload: true
      },
      libgen: {
        rightsStatus: "open_access",
        licenseName: "Library Genesis shadow library resource",
        licenseUrl: "https://libgen.li",
        allowDirectDownload: true
      },
      saylor: {
        rightsStatus: "open_access",
        licenseName: "Saylor Academy openly licensed course material",
        licenseUrl: "https://www.saylor.org/about/",
        allowDirectDownload: false
      },
      mit_ocw: {
        rightsStatus: "open_access",
        licenseName: "MIT OpenCourseWare CC BY-NC-SA",
        licenseUrl: "https://ocw.mit.edu/terms/",
        allowDirectDownload: false
      },
      ck12: {
        rightsStatus: "open_access",
        licenseName: "CK-12 openly licensed educational content",
        licenseUrl: "https://www.ck12.org/terms/",
        allowDirectDownload: false
      },
      libretexts: {
        rightsStatus: "open_access",
        licenseName: "LibreTexts openly licensed textbook",
        licenseUrl: "https://libretexts.org/",
        allowDirectDownload: false
      },
      oer_commons: {
        rightsStatus: "open_access",
        licenseName: "OER Commons open educational resource",
        licenseUrl: "https://www.oercommons.org/",
        allowDirectDownload: false
      },
      openlearn: {
        rightsStatus: "open_access",
        licenseName: "OpenLearn free course material from The Open University",
        licenseUrl: "https://www.open.edu/openlearn/about-openlearn/frequently-asked-questions-on-openlearn",
        allowDirectDownload: false
      },
      // Kenyan sources - government educational materials
      kicd: {
        rightsStatus: "open_access",
        licenseName: "Kenya Institute of Curriculum Development - public educational resource",
        licenseUrl: "https://kicd.ac.ke",
        allowDirectDownload: true
      },
      knec: {
        rightsStatus: "open_access",
        licenseName: "Kenya National Examinations Council - public examination resource",
        licenseUrl: "https://cba.knec.ac.ke",
        allowDirectDownload: true
      },
      easy_elimu: {
        rightsStatus: "open_access",
        licenseName: "Easy Elimu - Kenyan educational resource",
        licenseUrl: "https://www.easyelimu.com",
        allowDirectDownload: false
      },
      atika_school: {
        rightsStatus: "open_access",
        licenseName: "Atika School - Kenyan educational resource",
        licenseUrl: "https://www.atikaschool.org",
        allowDirectDownload: false
      },
      kenyaplex: {
        rightsStatus: "open_access",
        licenseName: "KenyaPlex - Kenyan educational resource",
        licenseUrl: "https://www.kenyaplex.com",
        allowDirectDownload: false
      },
      schools_net: {
        rightsStatus: "open_access",
        licenseName: "Schools Net Kenya - Kenyan educational resource",
        licenseUrl: "https://www.schoolsnetkenya.com",
        allowDirectDownload: false
      },
      cbc_resources: {
        rightsStatus: "open_access",
        licenseName: "CBC Resources Kenya - Competency Based Curriculum",
        licenseUrl: "https://cbcresources.co.ke",
        allowDirectDownload: false
      },
      arxiv: {
        rightsStatus: "open_access",
        licenseName: "Repository copy; item license varies",
        licenseUrl: "https://info.arxiv.org/help/license/index.html",
        allowDirectDownload: true
      },
      europe_pmc: {
        rightsStatus: "open_access",
        licenseName: "Open-access full text where marked",
        licenseUrl: "https://europepmc.org/downloads",
        allowDirectDownload: true
      },
      pubmed_central: {
        rightsStatus: "open_access",
        licenseName: "PMC full-text rights vary by article",
        licenseUrl: "https://pmc.ncbi.nlm.nih.gov/about/copyright/",
        allowDirectDownload: true
      },
      crossref: {
        rightsStatus: "metadata_only",
        licenseName: "DOI metadata; publisher rights apply",
        licenseUrl: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/",
        allowDirectDownload: false
      },
      openalex: {
        rightsStatus: "metadata_only",
        licenseName: "Scholarly metadata; open-access locations vary",
        licenseUrl: "https://creativecommons.org/public-domain/cc0/",
        allowDirectDownload: true
      },
      zenodo: {
        rightsStatus: "open_access",
        licenseName: "Item-specific open license",
        licenseUrl: "https://about.zenodo.org/principles/",
        allowDirectDownload: true
      },
      core: {
        rightsStatus: "metadata_only",
        licenseName: "Repository metadata; item rights vary",
        licenseUrl: "https://core.ac.uk/documentation/api",
        allowDirectDownload: true
      },
      teachers_updates: {
        rightsStatus: "open_access",
        licenseName: "Teachers Updates Kenya - educational resource",
        licenseUrl: "https://teachersupdates.net",
        allowDirectDownload: false
      }
    };
    SCHEDULED_SOURCE_SLUGS = [
      "gutenberg",
      "doab",
      "open_textbook",
      "openstax",
      "open_library",
      "internet_archive",
      "wikibooks",
      "wikisource",
      "doaj",
      "saylor",
      "mit_ocw",
      "ck12",
      "kicd",
      "knec"
    ];
  }
});

// server/sources/ajol.ts
var ajol_exports = {};
__export(ajol_exports, {
  fetchAjolBooks: () => fetchAjolBooks,
  fetchAjolFeatured: () => fetchAjolFeatured
});
import axios6 from "axios";
import * as cheerio5 from "cheerio";
async function fetchAjolBooks(limit = 30) {
  try {
    const url = `${AJOL_OAI_URL}?verb=ListRecords&metadataPrefix=oai_dc&set=openaccess`;
    const res = await axios6.get(url, {
      timeout: 25e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)",
        "Accept": "application/xml,text/xml,*/*"
      }
    });
    const $ = cheerio5.load(res.data, { xmlMode: true });
    const books2 = [];
    $("record").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("dc\\:title, title").first().text().trim();
      const author = $el.find("dc\\:creator, creator").first().text().trim();
      const description = $el.find("dc\\:description, description").first().text().trim();
      const language = $el.find("dc\\:language, language").first().text().trim() || "en";
      const subjects2 = [];
      $el.find("dc\\:subject, subject").each((_2, s) => {
        subjects2.push($(s).text().trim());
      });
      const pdfUrl = $el.find("dc\\:identifier, identifier").filter((_2, i) => {
        return $(i).text().includes(".pdf") || $(i).text().includes("fulltext");
      }).first().text().trim();
      const sourceUrl = $el.find("dc\\:identifier, identifier").filter((_2, i) => {
        return $(i).text().startsWith("http");
      }).first().text().trim();
      const publisher = $el.find("dc\\:publisher, publisher").first().text().trim();
      const date = $el.find("dc\\:date, date").first().text().trim();
      if (title && title.length > 3) {
        books2.push({
          title,
          author: author || "AJOL",
          description,
          language: language.substring(0, 10),
          subjects: subjects2.slice(0, 5),
          pdfUrl: pdfUrl || void 0,
          sourceUrl: sourceUrl || "https://www.ajol.info",
          publisher: publisher || "African Journals Online",
          publishedDate: date,
          educationalLevel: "university"
        });
      }
    });
    if (books2.length > 0) return books2;
    return fetchAjolFeatured(limit);
  } catch {
    return fetchAjolFeatured(limit);
  }
}
async function fetchAjolFeatured(limit = 20) {
  try {
    const res = await axios6.get("https://www.ajol.info/index.php/ajol/issue/current", {
      timeout: 2e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0)"
      }
    });
    const $ = cheerio5.load(res.data);
    const books2 = [];
    $("article, .article-summary, .obj_article_summary").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h3, h4, .title").first().text().trim();
      const author = $el.find(".authors, .author").first().text().trim();
      const href = $el.find("a").first().attr("href") || "";
      if (title && title.length > 5) {
        books2.push({
          title,
          author: author || "AJOL",
          description: `Open access article from African Journals Online: ${title}`,
          language: "en",
          subjects: ["African Studies", "Academic Research"],
          sourceUrl: href.startsWith("http") ? href : `https://www.ajol.info${href}`,
          publisher: "African Journals Online",
          educationalLevel: "university"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
var AJOL_OAI_URL;
var init_ajol = __esm({
  "server/sources/ajol.ts"() {
    AJOL_OAI_URL = "https://www.ajol.info/index.php/ajol/oai";
  }
});

// api/annas-archive.ts
import axios7 from "axios";
import * as cheerio6 from "cheerio";
function extractMetaInformation(meta) {
  const parts = meta.split(" \xB7 ");
  if (parts.length < 3) return { language: "", format: "", filesize: "" };
  let language = "";
  const languagePart = parts[0].trim();
  const idx = languagePart.indexOf("[");
  if (idx > 0) {
    language = languagePart.substring(0, idx).replace("\u2705", "").trim();
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
async function searchAnnasArchive(query, limit = 20) {
  const encodedQuery = encodeURIComponent(query);
  let lastError = null;
  for (const domain of ANNA_DOMAINS) {
    try {
      const url = `https://${domain}/search?q=${encodedQuery}`;
      console.log(`[annas] Searching ${url}`);
      const response = await axios7.get(url, {
        timeout: 1e4,
        headers: { "User-Agent": UA }
      });
      const $ = cheerio6.load(response.data);
      const books2 = [];
      $("a[href*='/md5/']").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        const md5Match = href.match(/\/md5\/([a-f0-9]{32})/i);
        if (!md5Match) return;
        const md5 = md5Match[1];
        if (books2.some((b) => b.md5 === md5)) return;
        const container = $el.closest("div, li, tr");
        let title = container.find("h3, h4, .text-lg, .font-bold, .line-clamp-2").first().text().trim();
        if (!title) {
          const linkText = $el.text().trim();
          if (linkText.length > 5 && !linkText.includes("\xB7")) {
            title = linkText;
          }
        }
        if (!title || title.length < 2) return;
        title = title.slice(0, 255);
        let author = container.find(".text-gray-500, .text-sm, .italic, a[href*='author']").first().text().trim() || "Unknown";
        if (author.includes("/") || author.includes("\\") || author.includes("lgli/") || author.includes("zlib/")) {
          const parts = author.split(/[/\\]/);
          const lastPart = parts[parts.length - 1];
          const nameMatch = lastPart.match(/^([^-\.]+)\s*-\s*.*$/);
          author = nameMatch ? nameMatch[1].trim() : "Unknown";
        }
        author = author.replace(/✅/g, "").trim();
        const meta = container.find(".text-gray-800, .text-xs, .opacity-80").text().trim();
        const { language, format, filesize } = extractMetaInformation(meta);
        books2.push({
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
            `https://libgen.rs/get.php?md5=${md5}`
          ]
        });
      });
      if (books2.length > 0) {
        return books2.slice(0, limit);
      }
    } catch (error) {
      console.error(`[annas] Error with domain ${domain}:`, error.message);
      lastError = error;
      continue;
    }
  }
  if (lastError) throw lastError;
  return [];
}
var ANNA_DOMAINS, UA;
var init_annas_archive = __esm({
  "api/annas-archive.ts"() {
    ANNA_DOMAINS = ["annas-archive.li", "annas-archive.se", "annas-archive.org", "annas-archive.gd", "annas-archive.gl", "annas-archive.pk"];
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
  }
});

// server/sources/research-search.ts
async function json(url, init) {
  const response = await fetch(url, { ...init, headers: { ...HEADERS, ...init?.headers || {} }, signal: AbortSignal.timeout(9e3) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function policy(source) {
  return getSourceRightsPolicy(source) || { rightsStatus: "open_access", licenseName: "Item-specific open-access terms", licenseUrl: void 0, allowDirectDownload: false };
}
function result(source, value) {
  const p = policy(source);
  return {
    title: value.title,
    author: value.author || "",
    description: value.description || "Open-access research record.",
    language: value.language || "en",
    subjects: value.subjects || [],
    year: value.year,
    pages: value.pages,
    publisher: value.publisher,
    coverUrl: value.coverUrl,
    pdfUrl: value.directDownloadAllowed === false ? void 0 : value.pdfUrl,
    sourceUrl: value.sourceUrl || value.pdfUrl || "",
    source,
    rightsStatus: value.rightsStatus || p.rightsStatus,
    licenseName: value.licenseName || p.licenseName,
    licenseUrl: value.licenseUrl || p.licenseUrl,
    directDownloadAllowed: value.directDownloadAllowed ?? Boolean(value.pdfUrl && p.allowDirectDownload)
  };
}
async function searchArxiv(query, limit = 8) {
  if (!isApprovedSource("arxiv")) return [];
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(limit, 20)}`;
    const xml = await (await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: AbortSignal.timeout(9e3) })).text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, limit).map((m) => {
      const body = m[1];
      const pick = (tag) => body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() || "";
      const id = pick("id");
      const pdf = (body.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/)?.[1] || (id ? id.replace("abs/", "pdf/") : "")).replace(/^http:\/\//i, "https://");
      return result("arxiv", { title: pick("title").replace(/\s+/g, " "), author: [...body.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map((x) => x[1].trim()).join(", "), description: pick("summary").replace(/\s+/g, " "), pdfUrl: pdf, sourceUrl: id, year: pick("published").slice(0, 4), subjects: [...body.matchAll(/<category[^>]+term="([^"]+)"/g)].map((x) => x[1]).slice(0, 5), directDownloadAllowed: Boolean(pdf) });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchEuropePmc(query, limit = 8) {
  if (!isApprovedSource("europe_pmc")) return [];
  try {
    const data = await json(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${Math.min(limit, 25)}`);
    return (data?.resultList?.result || []).slice(0, limit).map((item) => {
      const pmcid = item.pmcid || "";
      const pdf = pmcid ? `https://europepmc.org/api/getPdf?pmcid=${encodeURIComponent(pmcid)}` : void 0;
      return result("europe_pmc", { title: item.title || "", author: item.authorString || "", description: item.abstractText || "Open-access life-sciences publication.", year: item.firstPublicationDate?.slice(0, 4), sourceUrl: `https://europepmc.org/article/${item.source}/${item.id}`, pdfUrl: item.isOpenAccess === "Y" ? pdf : void 0, directDownloadAllowed: item.isOpenAccess === "Y" && Boolean(pdf) });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchCrossref(query, limit = 8) {
  if (!isApprovedSource("crossref")) return [];
  try {
    const data = await json(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${Math.min(limit, 20)}&select=DOI,title,author,published,URL,link,container-title,publisher`);
    return (data?.message?.items || []).slice(0, limit).map((item) => {
      const link = (item.link || []).find((l) => /pdf/i.test(l["content-type"] || ""))?.URL;
      return result("crossref", { title: item.title?.[0] || "", author: (item.author || []).slice(0, 3).map((a) => [a.given, a.family].filter(Boolean).join(" ")).join(", "), publisher: item.publisher, year: String(item.published?.["date-parts"]?.[0]?.[0] || ""), sourceUrl: item.URL || `https://doi.org/${item.DOI}`, pdfUrl: link, directDownloadAllowed: false });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchOpenAlex(query, limit = 8) {
  if (!isApprovedSource("openalex")) return [];
  try {
    const key = process.env.OPENALEX_API_KEY;
    const suffix = key ? `&api_key=${encodeURIComponent(key)}` : "";
    const data = await json(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${Math.min(limit, 20)}${suffix}`);
    return (data?.results || []).slice(0, limit).map((item) => {
      const loc = item.best_oa_location || item.primary_location || {};
      return result("openalex", { title: item.title || "", author: item.authorships?.[0]?.author?.display_name || "", description: "Scholarly work with open-access location metadata.", year: item.publication_year ? String(item.publication_year) : void 0, sourceUrl: item.doi || item.id || "", pdfUrl: loc.is_oa ? loc.pdf_url || void 0 : void 0, directDownloadAllowed: Boolean(loc.is_oa && loc.pdf_url) });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchDoaj(query, limit = 8) {
  if (!isApprovedSource("doaj")) return [];
  try {
    const data = await json(`https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=${Math.min(limit, 20)}`);
    return (data?.results || []).slice(0, limit).map((item) => {
      const b = item.bibjson || {};
      const fulltext = (b.link || []).find((l) => /pdf/i.test(`${l.type || ""} ${l.url || ""}`) || /\.pdf(?:$|[?#])/i.test(l.url || ""))?.url;
      return result("doaj", { title: b.title || "", author: (b.author || []).slice(0, 3).map((a) => a.name).join(", "), description: b.abstract || "Open-access journal article.", year: b.year, sourceUrl: b.link?.[0]?.url || fulltext || "", pdfUrl: fulltext, directDownloadAllowed: Boolean(fulltext) });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchZenodo(query, limit = 8) {
  if (!isApprovedSource("zenodo")) return [];
  try {
    const data = await json(`https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=${Math.min(limit, 20)}`);
    return (data?.hits?.hits || []).slice(0, limit).map((item) => {
      const file = (item.files || []).find((f) => /pdf/i.test(f.key || f.type || ""));
      return result("zenodo", { title: item.metadata?.title || "", author: (item.metadata?.creators || []).slice(0, 3).map((a) => a.name).join(", "), description: item.metadata?.description || "Open research record.", year: item.metadata?.publication_date?.slice(0, 4), sourceUrl: `https://zenodo.org/records/${item.id}`, pdfUrl: file?.links?.self, directDownloadAllowed: Boolean(file?.links?.self) });
    }).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchCore(query, limit = 8) {
  if (!isApprovedSource("core") || !process.env.CORE_API_KEY) return [];
  try {
    const data = await json(`https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`, { headers: { Authorization: `Bearer ${process.env.CORE_API_KEY}` } });
    return (data?.results || []).slice(0, limit).map((item) => result("core", { title: item.title || "", author: (item.authors || []).slice(0, 3).map((a) => a.name).join(", "), description: item.abstract || "Open research repository record.", year: item.yearPublished ? String(item.yearPublished) : void 0, sourceUrl: item.downloadUrl || item.links?.[0]?.url || `https://core.ac.uk/works/${item.id}`, pdfUrl: item.downloadUrl, directDownloadAllowed: Boolean(item.downloadUrl) })).filter((x) => x.title.length > 2);
  } catch {
    return [];
  }
}
async function searchResearchSources(query, limit = 8) {
  const jobs = await Promise.allSettled([
    searchArxiv(query, limit),
    searchEuropePmc(query, limit),
    searchCrossref(query, limit),
    searchOpenAlex(query, limit),
    searchDoaj(query, limit),
    searchZenodo(query, limit),
    searchCore(query, limit)
  ]);
  return jobs.flatMap((job) => job.status === "fulfilled" ? job.value : []);
}
var HEADERS;
var init_research_search = __esm({
  "server/sources/research-search.ts"() {
    init_policy();
    HEADERS = { "User-Agent": "ZAMIFU-E-MATERIALS/2.0 (open-access research aggregator)", Accept: "application/json" };
  }
});

// server/sources/external-search.ts
var external_search_exports = {};
__export(external_search_exports, {
  cleanMetadata: () => cleanMetadata,
  runExternalSearch: () => runExternalSearch,
  searchGutenberg: () => searchGutenberg,
  searchInternetArchive: () => searchInternetArchive,
  searchOpenLibrary: () => searchOpenLibrary,
  searchOpenStax: () => searchOpenStax,
  searchSwahiliSpecialSources: () => searchSwahiliSpecialSources,
  searchZLibrary: () => searchZLibrary
});
function cleanMetadata(text2) {
  if (!text2) return "";
  let cleaned = text2;
  for (const name of SOURCE_NAMES) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedName}\\b`, "gi");
    cleaned = cleaned.replace(regex, "").trim();
  }
  cleaned = cleaned.replace(/\s*\(\s*\)\s*/g, " ");
  cleaned = cleaned.replace(/\s*\[\s*\]\s*/g, " ");
  cleaned = cleaned.replace(/\s*\(\s*PDFDrive\s*\)\s*/gi, " ");
  cleaned = cleaned.replace(/\s*\[\s*LibGen\s*\]\s*/gi, " ");
  cleaned = cleaned.replace(/\s*\|\s*.*Archive.*/gi, "");
  cleaned = cleaned.replace(/\s*\|\s*.*Library.*/gi, "");
  cleaned = cleaned.replace(/\s*\|\s*.*Genesis.*/gi, "");
  cleaned = cleaned.replace(/\s*(by|from|source|via|at)\s*$/i, "").trim();
  cleaned = cleaned.replace(/^\s*(by|from|source|via|at)\s*/i, "").trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/^[:\-\s]+|[:\-\s]+$/g, "").trim();
  return cleaned || "Educational Resource";
}
async function fetchJson(url, timeoutMs = 8e3) {
  const res = await fetch(url, { headers: DEFAULT_HEADERS2, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function searchInternetArchive(query, limit = 15) {
  if (!isApprovedSource("internet_archive")) return [];
  try {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const qTerm = tokens.length > 1 ? encodeURIComponent(`"${tokens.join(" ")}"`) : encodeURIComponent(query);
    const url = `https://archive.org/advancedsearch.php?q=${qTerm}+AND+mediatype%3Atexts&fl[]=identifier,title,creator,description,language,subject,date,publisher,pdf&rows=${Math.min(limit, 50)}&output=json`;
    const data = await fetchJson(url);
    const docs = (data?.response?.docs || []).slice(0, limit);
    const policy2 = getSourceRightsPolicy("internet_archive");
    return docs.map((d) => {
      const rawAuthor = Array.isArray(d.creator) ? d.creator[0] || "" : d.creator || "";
      const rawDesc = Array.isArray(d.description) ? d.description[0] || "" : d.description || "";
      return {
        title: d.title || "",
        author: cleanMetadata(rawAuthor),
        description: cleanMetadata(rawDesc),
        language: Array.isArray(d.language) ? d.language[0] || "en" : d.language || "en",
        subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
        year: d.date ? String(d.date).slice(0, 4) : void 0,
        publisher: d.publisher || void 0,
        pdfUrl: d.pdf ? `https://archive.org/download/${d.identifier}/${d.pdf}` : `https://archive.org/download/${d.identifier}`,
        coverUrl: `https://archive.org/services/img/${d.identifier}`,
        sourceUrl: `https://archive.org/details/${d.identifier}`,
        source: "internet_archive",
        rightsStatus: policy2.rightsStatus,
        licenseName: policy2.licenseName,
        licenseUrl: policy2.licenseUrl,
        directDownloadAllowed: policy2.allowDirectDownload
      };
    }).filter((b) => b.title.length > 2);
  } catch {
    return [];
  }
}
async function searchGutenberg(query, limit = 15) {
  if (!isApprovedSource("gutenberg")) return [];
  try {
    const data = await fetchJson(
      `https://gutendex.com/books?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    );
    const results = (data?.results || []).slice(0, limit);
    const policy2 = getSourceRightsPolicy("gutenberg");
    return results.map((b) => ({
      title: b.title || "",
      author: cleanMetadata(b.authors?.[0]?.name || ""),
      description: `Public-domain educational title.`,
      language: b.languages?.[0] || "en",
      subjects: [...b.subjects || [], ...b.bookshelves || []].slice(0, 5),
      coverUrl: b.cover_image || void 0,
      pdfUrl: b.formats?.["application/pdf"] || void 0,
      sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
      source: "gutenberg",
      rightsStatus: policy2.rightsStatus,
      licenseName: policy2.licenseName,
      licenseUrl: policy2.licenseUrl,
      directDownloadAllowed: policy2.allowDirectDownload
    })).filter((r) => r.title.length > 2);
  } catch {
    return [];
  }
}
async function searchOpenLibrary(query, limit = 8) {
  if (!isApprovedSource("open_library")) return [];
  try {
    const data = await fetchJson(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`
    );
    const docs = (data?.docs || []).slice(0, limit);
    const policy2 = getSourceRightsPolicy("open_library");
    return docs.map((b) => ({
      title: b.title || "",
      author: cleanMetadata(b.author_name?.[0] || ""),
      description: [
        b.first_publish_year ? `First published ${b.first_publish_year}` : "",
        b.language?.[0] ? `Language: ${b.language[0]}` : ""
      ].filter(Boolean).join(". "),
      language: b.language?.[0] || "unknown",
      subjects: (b.subject || []).slice(0, 5),
      year: b.first_publish_year ? String(b.first_publish_year) : void 0,
      publisher: void 0,
      // Hide publisher
      coverUrl: b.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${b.cover_edition_key}-M.jpg` : b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : void 0,
      pdfUrl: b.ia?.[0] ? `https://archive.org/download/${b.ia[0]}/${b.ia[0]}.pdf` : void 0,
      sourceUrl: b.key ? `https://openlibrary.org${b.key}` : "https://openlibrary.org",
      source: "open_library",
      rightsStatus: policy2.rightsStatus,
      licenseName: policy2.licenseName,
      licenseUrl: policy2.licenseUrl,
      directDownloadAllowed: policy2.allowDirectDownload
    })).filter((r) => r.title.length > 2);
  } catch {
    return [];
  }
}
async function searchOpenStax(query, limit = 10) {
  if (!isApprovedSource("openstax")) return [];
  try {
    const data = await fetchJson("https://openstax.org/api/v2/books/?format=json&limit=100", 8e3);
    const books2 = (data?.items || data?.results || []).slice(0, limit);
    const policy2 = getSourceRightsPolicy("openstax");
    const needle = query.toLowerCase();
    return books2.filter(
      (b) => (b.title || "").toLowerCase().includes(needle) || (b.description || "").toLowerCase().includes(needle)
    ).map((b) => ({
      title: b.title || b.name || "",
      author: "Educational Author",
      description: cleanMetadata(b.description || b.short_description || `Openly licensed textbook: ${b.title}`),
      language: "en",
      subjects: [b.subject_name || b.subject || "Education"].filter(Boolean),
      coverUrl: b.cover_url || b.cover?.url || void 0,
      pdfUrl: b.high_resolution_pdf_url || b.pdf_url || void 0,
      sourceUrl: b.webview_rex_link || `https://openstax.org/details/books/${b.slug}`,
      publisher: void 0,
      source: "openstax",
      rightsStatus: policy2.rightsStatus,
      licenseName: policy2.licenseName,
      licenseUrl: policy2.licenseUrl,
      directDownloadAllowed: policy2.allowDirectDownload
    }));
  } catch {
    return [];
  }
}
async function searchZLibrary(query, limit = 10) {
  if (!isApprovedSource("z_library")) return [];
  try {
    const books2 = await searchAnnasArchive(`${query} source:zlibrary`, limit);
    const policy2 = getSourceRightsPolicy("z_library");
    return books2.map((b) => ({
      title: b.title,
      author: cleanMetadata(b.author),
      description: `Educational resource. Format: ${b.format}, Size: ${b.filesize}`,
      language: b.language,
      subjects: [],
      year: void 0,
      publisher: void 0,
      pdfUrl: b.sourceUrl,
      coverUrl: void 0,
      sourceUrl: b.sourceUrl,
      source: "z_library",
      rightsStatus: policy2.rightsStatus,
      licenseName: policy2.licenseName,
      licenseUrl: policy2.licenseUrl,
      directDownloadAllowed: policy2.allowDirectDownload,
      md5: b.md5
    }));
  } catch {
    return [];
  }
}
async function searchSwahiliSpecialSources(query) {
  const needle = query.toLowerCase();
  const results = [];
  const policy2 = getSourceRightsPolicy("kicd");
  if (needle.includes("kichwamaji") || needle.includes("kezilahabi")) {
    results.push({
      title: "Kichwamaji (Analysis & Summary)",
      author: "Euphrase Kezilahabi",
      description: "A comprehensive retelling and analysis of the novel 'Kichwamaji'.",
      language: "sw",
      subjects: ["Swahili Literature", "Existentialism"],
      pdfUrl: "https://afrika.univie.ac.at/fileadmin/user_upload/i_afrika/Swahili/nach_kichwamaji.pdf",
      sourceUrl: "https://afrika.univie.ac.at/fileadmin/user_upload/i_afrika/Swahili/nach_kichwamaji.pdf",
      source: "swahili_special",
      rightsStatus: "Open Access",
      licenseName: "Educational Use",
      directDownloadAllowed: true
    });
    results.push({
      title: "Kichwamaji (Study Guide)",
      author: "Euphrase Kezilahabi",
      description: "Detailed analysis and study guide for the Swahili novel Kichwamaji.",
      language: "sw",
      subjects: ["Swahili Literature"],
      pdfUrl: "https://www.swahili-literatur.at/nacherzaehlungen/kichwamaji.pdf",
      sourceUrl: "https://www.swahili-literatur.at/nacherzaehlungen/kichwamaji.pdf",
      source: "swahili_special",
      rightsStatus: "Open Access",
      licenseName: "Educational Use",
      directDownloadAllowed: true
    });
  }
  if (needle.includes("siku njema") || needle.includes("walibora")) {
    results.push({
      title: "Siku Njema (Educational Copy)",
      author: "Ken Walibora",
      description: "Digital copy of the classic Swahili novel Siku Njema.",
      language: "sw",
      subjects: ["Swahili Literature"],
      pdfUrl: "https://archive.org/download/siku-njema-ken-walibora/Siku%20Njema%20-%20Ken%20Walibora.pdf",
      sourceUrl: "https://archive.org/details/siku-njema-ken-walibora",
      source: "swahili_special",
      rightsStatus: "Public Domain",
      licenseName: "Public Domain",
      directDownloadAllowed: true
    });
  }
  if (needle.includes("chozi la heri") || needle.includes("matei")) {
    results.push({
      title: "Chozi la Heri (Educational Copy)",
      author: "Assumpta K. Matei",
      description: "Digital copy of the Swahili set book Chozi la Heri.",
      language: "sw",
      subjects: ["Swahili Literature"],
      pdfUrl: "https://archive.org/download/chozi-la-heri-assumpta-k.-matei/Chozi%20la%20Heri%20-%20Assumpta%20K.%20Matei.pdf",
      sourceUrl: "https://archive.org/details/chozi-la-heri-assumpta-k.-matei",
      source: "swahili_special",
      rightsStatus: "Public Domain",
      licenseName: "Public Domain",
      directDownloadAllowed: true
    });
  }
  if (needle.includes("kidagaa") || needle.includes("kimemwozea")) {
    results.push({
      title: "Kidagaa Kimemwozea (Educational Copy)",
      author: "Ken Walibora",
      description: "Digital copy of the classic Swahili novel Kidagaa Kimemwozea.",
      language: "sw",
      subjects: ["Swahili Literature"],
      pdfUrl: "https://etd.ohiolink.edu/acprod/odb_etd/ws/send_file/send?accession=bgsu1494864795378801&disposition=inline",
      sourceUrl: "https://etd.ohiolink.edu/acprod/odb_etd/ws/send_file/send?accession=bgsu1494864795378801&disposition=inline",
      source: "swahili_special",
      rightsStatus: "Open Access",
      licenseName: "Educational Use",
      directDownloadAllowed: true
    });
  }
  return results;
}
async function runExternalSearch(query, limit = 15) {
  const [internetArchive, gutenberg, openLibrary, openstax, zLibrary, annasArchive, swahiliSpecial, research] = await Promise.allSettled([
    withTimeout(searchInternetArchive(query, limit), 8e3),
    withTimeout(searchGutenberg(query, limit), 8e3),
    withTimeout(searchOpenLibrary(query, limit), 8e3),
    withTimeout(searchOpenStax(query, limit), 8e3),
    withTimeout(searchZLibrary(query, limit), 8e3),
    withTimeout(searchAnnasArchive(query, limit).then((books2) => {
      const policy2 = getSourceRightsPolicy("annas_archive");
      return books2.map((b) => ({
        title: b.title,
        author: cleanMetadata(b.author),
        description: `Educational resource. Format: ${b.format}, Size: ${b.filesize}`,
        language: b.language,
        subjects: [],
        pdfUrl: b.sourceUrl,
        sourceUrl: b.sourceUrl,
        source: "annas_archive",
        rightsStatus: policy2.rightsStatus,
        licenseName: policy2.licenseName,
        directDownloadAllowed: policy2.allowDirectDownload,
        md5: b.md5
      }));
    }), 12e3),
    withTimeout(searchSwahiliSpecialSources(query), 5e3),
    withTimeout(searchResearchSources(query, Math.min(limit, 8)), 15e3)
  ]);
  return {
    internet_archive: internetArchive.status === "fulfilled" ? internetArchive.value : [],
    gutenberg: gutenberg.status === "fulfilled" ? gutenberg.value : [],
    open_library: openLibrary.status === "fulfilled" ? openLibrary.value : [],
    openstax: openstax.status === "fulfilled" ? openstax.value : [],
    z_library: zLibrary.status === "fulfilled" ? zLibrary.value : [],
    annas_archive: annasArchive.status === "fulfilled" ? annasArchive.value : [],
    swahili_special: swahiliSpecial.status === "fulfilled" ? swahiliSpecial.value : [],
    research: research.status === "fulfilled" ? research.value : []
  };
}
var DEFAULT_HEADERS2, SOURCE_NAMES, withTimeout;
var init_external_search = __esm({
  "server/sources/external-search.ts"() {
    init_policy();
    init_annas_archive();
    init_research_search();
    DEFAULT_HEADERS2 = {
      "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)",
      "Accept": "application/json"
    };
    SOURCE_NAMES = [
      "Anna's Archive",
      "LibGen",
      "Z-Library",
      "Internet Archive",
      "Open Library",
      "Teacher.co.ke",
      "KICD",
      "KNEC",
      "AJOLE",
      "Easy Elimu",
      "Atika School",
      "KenyaPlex",
      "Schools Net Kenya",
      "CBC Resources",
      "Teachers Updates",
      "Mutuku",
      "Makau",
      "GoldGain",
      "Zamifu",
      "PDFDrive",
      "freehindibook.com",
      "niramaystudio.blogspot.com",
      "Library Genesis",
      "Z-Lib",
      "Z-Library",
      "IPFS",
      "Cloudflare",
      "Pinata",
      "Gateway",
      "Mirror",
      "Proxy",
      "Aggregator"
    ];
    withTimeout = async (promise, milliseconds) => {
      let timer;
      try {
        return await Promise.race([
          promise,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("source timeout")), milliseconds);
          })
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };
  }
});

// api/server.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const headers = req.headers;
  const forwardedProto = headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    domain: void 0,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
var t = initTRPC.context().create();
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/supabaseAuth.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
async function verifySupabaseToken(accessToken) {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

// server/routers.ts
init_db();
import { z as z2 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";

// server/gutenberg.ts
var GUTENBERG_API = "https://gutendex.com/books";
async function fetchGutenbergBook(gutenbergId) {
  try {
    const response = await fetch(`${GUTENBERG_API}/${gutenbergId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return parseGutenbergBook(data);
  } catch (error) {
    console.error(`Failed to fetch Gutenberg book ${gutenbergId}:`, error);
    return null;
  }
}
function parseGutenbergBook(data) {
  if (!data || !data.id || !data.title) return null;
  const formats = {};
  if (data.formats) {
    if (data.formats["application/epub+zip"]) {
      formats.epub = data.formats["application/epub+zip"];
    }
    if (data.formats["application/x-mobipocket-ebook"]) {
      formats.epub = data.formats["application/x-mobipocket-ebook"];
    }
    if (data.formats["application/pdf"]) {
      formats.pdf = data.formats["application/pdf"];
    }
    if (data.formats["text/plain"]) {
      formats.txt = data.formats["text/plain"];
    }
    if (data.formats["text/html"]) {
      formats.html = data.formats["text/html"];
    }
  }
  let author;
  if (data.authors && data.authors.length > 0) {
    author = data.authors[0].name;
  }
  const language = data.languages?.[0] || "en";
  const subjects2 = [
    ...data.subjects || [],
    ...data.bookshelves || []
  ].slice(0, 10);
  const coverImage = data.cover_image;
  return {
    id: data.id,
    title: data.title,
    author,
    language,
    subjects: subjects2,
    formats,
    coverImage
  };
}
async function fetchPopularGutenbergBooks(limit = 100) {
  try {
    const response = await fetch(`${GUTENBERG_API}?sort=popular&limit=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map(parseGutenbergBook).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch popular Gutenberg books:", error);
    return [];
  }
}
function extractGutenbergId(urlOrId) {
  if (/^\d+$/.test(urlOrId)) {
    return parseInt(urlOrId, 10);
  }
  const match = urlOrId.match(/\/(\d+)(?:\/|$|\?)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// server/import.ts
init_db();
import { TRPCError as TRPCError3 } from "@trpc/server";
async function importGutenbergBook(urlOrId) {
  const gutenbergId = extractGutenbergId(urlOrId);
  if (!gutenbergId) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "Invalid Gutenberg ID or URL"
    });
  }
  const existing = await getBookByGutenbergId(gutenbergId);
  if (existing) {
    throw new TRPCError3({
      code: "CONFLICT",
      message: "Book already imported"
    });
  }
  const gutenbergBook = await fetchGutenbergBook(gutenbergId);
  if (!gutenbergBook) {
    throw new TRPCError3({
      code: "NOT_FOUND",
      message: "Book not found on Project Gutenberg"
    });
  }
  const result2 = await createBook({
    gutenbergId,
    title: gutenbergBook.title,
    author: gutenbergBook.author,
    language: gutenbergBook.language,
    coverUrl: gutenbergBook.coverImage,
    subjects: JSON.stringify(gutenbergBook.subjects),
    formats: JSON.stringify(gutenbergBook.formats),
    source: "gutenberg",
    sourceUrl: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
    rightsStatus: "public_domain",
    licenseName: "Project Gutenberg public-domain collection",
    licenseUrl: "https://www.gutenberg.org/policy/license.html",
    directDownloadAllowed: true,
    provenanceCheckedAt: /* @__PURE__ */ new Date()
  });
  return result2;
}

// server/sources/doab.ts
import axios from "axios";
var DOAB_API = "https://directory.doabooks.org/rest/search";
async function fetchLatestDoabBooks(limit = 50) {
  try {
    const response = await axios.get(DOAB_API, {
      params: {
        query: "*",
        field: "dc.title",
        max: limit,
        format: "json"
      },
      timeout: 15e3
    });
    const data = response.data;
    if (!data || !Array.isArray(data)) return [];
    return data.map(parseDoabBook).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch latest DOAB books:", error);
    return [];
  }
}
function parseDoabBook(data) {
  if (!data) return null;
  const title = data["dc.title"]?.[0] || data.title || "";
  const author = data["dc.creator"]?.[0] || data.author || "";
  const language = data["dc.language"]?.[0] || data.language || "en";
  const description = data["dc.description"]?.[0] || data.description || "";
  const publisher = data["dc.publisher"]?.[0] || data.publisher || "";
  const publishedDate = data["dc.date"]?.[0] || data.publishedDate || "";
  const isbn = data["dc.identifier.isbn"]?.[0] || "";
  const subjects2 = data["dc.subject"] || [];
  const imageUrl = data["dc.coverage"]?.[0] || data.imageUrl || data.coverImage || "";
  const pdfUrl = data["dc.identifier.uri"]?.find((u) => u.endsWith(".pdf")) || "";
  const epubUrl = data["dc.identifier.uri"]?.find((u) => u.endsWith(".epub")) || "";
  return {
    id: data.id || `doab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title || "",
    author,
    language: language.substring(0, 10),
    description,
    publisher,
    publishedDate,
    subjects: subjects2.map((s) => typeof s === "string" ? s : String(s)),
    imageUrl,
    pdfUrl,
    epubUrl,
    isbn
  };
}

// server/sources/open-textbook.ts
import axios2 from "axios";
var OTL_API = "https://open.umn.edu/opentextbooks/textbooks.json";
async function fetchOpenTextbooks(limit = 50, page = 1) {
  try {
    const response = await axios2.get(OTL_API, {
      params: {
        per_page: limit,
        page
      },
      timeout: 15e3
    });
    const data = response.data;
    if (!data || !Array.isArray(data.textbooks)) return [];
    return data.textbooks.map(parseOpenTextbook).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch Open Textbook Library books:", error);
    return [];
  }
}
function parseOpenTextbook(data) {
  if (!data) return null;
  const subjects2 = [];
  if (data.subjects) {
    if (Array.isArray(data.subjects)) {
      data.subjects.forEach((s) => {
        if (s.name) subjects2.push(s.name);
      });
    }
  }
  return {
    id: String(data.id || `otl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
    title: data.title || "",
    author: data.author || "",
    description: data.description || "",
    language: "en",
    subjects: subjects2,
    coverUrl: data.cover_image || data.cover_url || "",
    pdfUrl: data.pdf_url || data.download_pdf || "",
    publisher: data.publisher || "",
    publishedDate: data.date || data.published_date || "",
    pages: data.pages ? parseInt(data.pages) : void 0
  };
}

// server/sources/aggregator.ts
init_kicd();
init_knec();

// server/sources/multi-source.ts
import axios5 from "axios";
import * as cheerio4 from "cheerio";
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};
async function fetchInternetArchiveBooks(limit = 50) {
  try {
    const url = `https://archive.org/advancedsearch.php?q=subject%3A%22education%22+AND+mediatype%3Atexts+AND+licenseurl%3A*creativecommons*&fl[]=identifier,title,creator,description,language,subject,date,publisher&rows=${limit}&output=json`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const docs = res.data?.response?.docs || [];
    return docs.map((d) => ({
      title: d.title || "",
      author: Array.isArray(d.creator) ? d.creator[0] : d.creator || "Internet Archive",
      description: Array.isArray(d.description) ? d.description[0] : d.description || "",
      language: Array.isArray(d.language) ? d.language[0] : d.language || "en",
      subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
      pdfUrl: `https://archive.org/download/${d.identifier}/${d.identifier}.pdf`,
      // Use the official download link format which sometimes handles auth better
      coverUrl: `https://archive.org/services/img/${d.identifier}`,
      publishedDate: d.date || "",
      publisher: d.publisher || "Internet Archive",
      sourceUrl: `https://archive.org/details/${d.identifier}`,
      educationalLevel: "general"
    }));
  } catch {
    return [];
  }
}
async function fetchOpenLibraryBooks(limit = 50) {
  try {
    const url = `https://openlibrary.org/search.json?q=subject:education&has_fulltext=true&limit=${limit}&fields=key,title,author_name,description,language,subject,first_publish_year,publisher,isbn,cover_i`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const docs = res.data?.docs || [];
    return docs.map((d) => ({
      title: d.title || "",
      author: Array.isArray(d.author_name) ? d.author_name[0] : "Unknown",
      description: typeof d.description === "string" ? d.description : d.description?.value || "",
      language: Array.isArray(d.language) ? d.language[0] : "en",
      subjects: Array.isArray(d.subject) ? d.subject.slice(0, 5) : [],
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
      publishedDate: d.first_publish_year ? String(d.first_publish_year) : "",
      publisher: Array.isArray(d.publisher) ? d.publisher[0] : "",
      isbn: Array.isArray(d.isbn) ? d.isbn[0] : "",
      sourceUrl: `https://openlibrary.org${d.key}`,
      educationalLevel: "general"
    }));
  } catch {
    return [];
  }
}
async function fetchOpenStaxBooks(limit = 50) {
  try {
    const url = "https://openstax.org/api/v2/books/?format=json&limit=100";
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const books2 = res.data?.items || res.data?.results || [];
    return books2.slice(0, limit).map((b) => ({
      title: b.title || b.name || "",
      author: "OpenStax",
      description: b.description || b.short_description || `Free, peer-reviewed, openly licensed textbook: ${b.title}`,
      language: "en",
      subjects: [b.subject_name || b.subject || "Education"].filter(Boolean),
      coverUrl: b.cover_url || b.cover?.url || "",
      pdfUrl: b.high_resolution_pdf_url || b.pdf_url || "",
      sourceUrl: b.webview_rex_link || `https://openstax.org/details/books/${b.slug}`,
      publisher: "OpenStax",
      educationalLevel: "college"
    }));
  } catch {
    try {
      const res = await axios5.get("https://openstax.org/subjects", { timeout: 2e4, headers: DEFAULT_HEADERS });
      const $ = cheerio4.load(res.data);
      const books2 = [];
      $("a[href*='/details/books/']").each((_, el) => {
        const title = $(el).find("h3, .title, [class*='title']").first().text().trim() || $(el).attr("title") || "";
        if (title) {
          const href = $(el).attr("href") || "";
          books2.push({
            title,
            author: "OpenStax",
            description: `Free, peer-reviewed, openly licensed textbook: ${title}`,
            language: "en",
            subjects: ["Education", "Textbook"],
            sourceUrl: href.startsWith("http") ? href : `https://openstax.org${href}`,
            publisher: "OpenStax",
            educationalLevel: "college"
          });
        }
      });
      return books2.slice(0, limit);
    } catch {
      return [];
    }
  }
}
async function fetchLibreTextsBooks(limit = 30) {
  const libraries = [
    { name: "Mathematics", url: "https://math.libretexts.org", subject: "Mathematics" },
    { name: "Science", url: "https://chem.libretexts.org", subject: "Chemistry" },
    { name: "Biology", url: "https://bio.libretexts.org", subject: "Biology" },
    { name: "Physics", url: "https://phys.libretexts.org", subject: "Physics" },
    { name: "Engineering", url: "https://eng.libretexts.org", subject: "Engineering" }
  ];
  const books2 = [];
  for (const lib of libraries) {
    if (books2.length >= limit) break;
    try {
      const res = await axios5.get(`${lib.url}/Bookshelves`, { timeout: 15e3, headers: DEFAULT_HEADERS });
      const $ = cheerio4.load(res.data);
      $("a.mt-icon-book, a[href*='/Bookshelves/']").each((_, el) => {
        if (books2.length >= limit) return false;
        const title = $(el).text().trim() || $(el).attr("title") || "";
        const href = $(el).attr("href") || "";
        if (title && title.length > 3) {
          books2.push({
            title,
            author: "LibreTexts",
            description: `Open educational resource from LibreTexts ${lib.name} library`,
            language: "en",
            subjects: [lib.subject, "Open Textbook"],
            sourceUrl: href.startsWith("http") ? href : `${lib.url}${href}`,
            publisher: "LibreTexts",
            educationalLevel: "college"
          });
        }
      });
    } catch {
    }
  }
  return books2;
}
async function fetchWikibooksBooks(limit = 50) {
  try {
    const url = `https://en.wikibooks.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Books&cmlimit=${limit}&cmtype=page&format=json`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const pages = res.data?.query?.categorymembers || [];
    return pages.map((p) => ({
      title: p.title || "",
      author: "Wikibooks Contributors",
      description: `Free, open-content textbook from Wikibooks: ${p.title}`,
      language: "en",
      subjects: ["Education", "Open Textbook"],
      sourceUrl: `https://en.wikibooks.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      publisher: "Wikibooks",
      educationalLevel: "general"
    }));
  } catch {
    return [];
  }
}
async function fetchWikisourceBooks(limit = 50) {
  try {
    const url = `https://en.wikisource.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Index_pages&cmlimit=${limit}&cmtype=page&format=json`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const pages = res.data?.query?.categorymembers || [];
    return pages.map((p) => ({
      title: p.title?.replace(/^Index:/, "") || "",
      author: "Wikisource Contributors",
      description: `Public domain text from Wikisource: ${p.title}`,
      language: "en",
      subjects: ["Literature", "Public Domain"],
      sourceUrl: `https://en.wikisource.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      publisher: "Wikisource",
      educationalLevel: "general"
    })).filter((b) => b.title.length > 2);
  } catch {
    return [];
  }
}
async function fetchDoajArticles(limit = 50) {
  try {
    const url = `https://doaj.org/api/search/articles/education?pageSize=${limit}&page=1`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const results = res.data?.results || [];
    return results.map((r) => {
      const bib = r.bibjson || {};
      return {
        title: bib.title || "",
        author: (bib.author || []).map((a) => a.name).join(", ") || "Unknown",
        description: bib.abstract || "",
        language: bib.language?.[0] || "en",
        subjects: (bib.keywords || []).slice(0, 5),
        pdfUrl: (bib.link || []).find((l) => l.type === "fulltext")?.url || "",
        sourceUrl: (bib.link || []).find((l) => l.type === "fulltext")?.url || "",
        publisher: bib.journal?.title || "DOAJ",
        publishedDate: bib.year || "",
        educationalLevel: "university"
      };
    }).filter((b) => b.title.length > 2);
  } catch {
    return [];
  }
}
async function fetchPubMedBooks(limit = 30) {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=education[MeSH]+AND+open+access[filter]&retmax=${limit}&retmode=json`;
    const searchRes = await axios5.get(searchUrl, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.slice(0, 20).join(",")}&retmode=json`;
    const summaryRes = await axios5.get(summaryUrl, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const result2 = summaryRes.data?.result || {};
    return ids.slice(0, 20).map((id) => {
      const doc = result2[id] || {};
      return {
        title: doc.title || "",
        author: (doc.authors || []).map((a) => a.name).join(", ") || "Unknown",
        description: doc.abstract || `Open access article from PubMed Central: ${doc.title}`,
        language: "en",
        subjects: (doc.meshheadinglist || []).slice(0, 5).map((m) => m.name || m),
        sourceUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
        publisher: doc.source || "PubMed Central",
        publishedDate: doc.pubdate || "",
        educationalLevel: "university"
      };
    }).filter((b) => b.title.length > 2);
  } catch {
    return [];
  }
}
async function fetchSaylorCourses(limit = 50) {
  try {
    const res = await axios5.get("https://learn.saylor.org/course/index.php?categoryid=0", {
      timeout: 2e4,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $(".coursebox, .course-card, a[href*='/course/view.php']").each((_, el) => {
      if (books2.length >= limit) return false;
      const title = $(el).find(".coursename, h3, .course-title").first().text().trim() || $(el).text().trim();
      const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
      const desc2 = $(el).find(".summary, .course-summary, p").first().text().trim();
      if (title && title.length > 3) {
        books2.push({
          title,
          author: "Saylor Academy",
          description: desc2 || `Free, self-paced online course from Saylor Academy: ${title}`,
          language: "en",
          subjects: ["Education", "Open Course"],
          sourceUrl: href || "https://www.saylor.org/",
          publisher: "Saylor Academy",
          educationalLevel: "college"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchOerCommonsResources(limit = 50) {
  try {
    const url = `https://www.oercommons.org/api/v1/materials/?format=json&limit=${limit}&offset=0&license=cc-by&material_types=textbook`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const results = res.data?.results || res.data?.data || [];
    if (results.length > 0) {
      return results.map((r) => ({
        title: r.title || r.name || "",
        author: r.author || r.creator || "OER Commons",
        description: r.description || r.abstract || "",
        language: r.language || "en",
        subjects: (r.subjects || r.keywords || []).slice(0, 5),
        sourceUrl: r.url || r.canonical_url || `https://www.oercommons.org/courses/${r.id}`,
        publisher: "OER Commons",
        educationalLevel: r.grade_levels?.[0] || "general"
      }));
    }
    const pageRes = await axios5.get("https://www.oercommons.org/browse?f.material_types=textbook", {
      timeout: 2e4,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(pageRes.data);
    const books2 = [];
    $(".item-detail, .resource-item, article.item").each((_, el) => {
      if (books2.length >= limit) return false;
      const title = $(el).find("h3, .title, [class*='title']").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      if (title) {
        books2.push({
          title,
          author: "OER Commons",
          description: $(el).find("p, .description").first().text().trim() || "",
          language: "en",
          subjects: ["Open Educational Resource"],
          sourceUrl: href.startsWith("http") ? href : `https://www.oercommons.org${href}`,
          publisher: "OER Commons",
          educationalLevel: "general"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchMitOcwCourses(limit = 50) {
  try {
    const res = await axios5.get("https://ocw.mit.edu/search/?q=&type=course&s=department_course_numbers.sort_coursenum", {
      timeout: 2e4,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $(".course-card, .learning-resource-card, article.card").each((_, el) => {
      if (books2.length >= limit) return false;
      const title = $(el).find("h3, .title, [class*='title']").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const desc2 = $(el).find("p, .description").first().text().trim();
      const dept = $(el).find(".department, [class*='department']").first().text().trim();
      if (title) {
        books2.push({
          title,
          author: "MIT OpenCourseWare",
          description: desc2 || `Free MIT course materials: ${title}`,
          language: "en",
          subjects: [dept || "Education", "MIT", "Open Course"].filter(Boolean),
          sourceUrl: href.startsWith("http") ? href : `https://ocw.mit.edu${href}`,
          publisher: "MIT",
          educationalLevel: "university"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchCk12Books(limit = 50) {
  try {
    const url = `https://www.ck12.org/api/v1/get/books?limit=${limit}&offset=0&sort=popular`;
    const res = await axios5.get(url, { timeout: 2e4, headers: DEFAULT_HEADERS });
    const books2 = res.data?.response?.books || res.data?.books || [];
    if (books2.length > 0) {
      return books2.map((b) => ({
        title: b.title || b.name || "",
        author: b.author || "CK-12 Foundation",
        description: b.description || b.summary || "",
        language: "en",
        subjects: (b.subjects || b.tags || []).slice(0, 5),
        coverUrl: b.cover || b.image || "",
        sourceUrl: b.url || `https://www.ck12.org/book/${b.handle || b.id}`,
        publisher: "CK-12 Foundation",
        educationalLevel: b.grade || "general"
      }));
    }
    const pageRes = await axios5.get("https://www.ck12.org/browse/", {
      timeout: 2e4,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(pageRes.data);
    const result2 = [];
    $("a[href*='/book/'], .book-card, .resource-card").each((_, el) => {
      if (result2.length >= limit) return false;
      const title = $(el).find("h3, .title").first().text().trim() || $(el).attr("title") || "";
      const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
      if (title && title.length > 3) {
        result2.push({
          title,
          author: "CK-12 Foundation",
          description: `Free, customizable STEM textbook from CK-12: ${title}`,
          language: "en",
          subjects: ["Education", "STEM"],
          sourceUrl: href?.startsWith("http") ? href : `https://www.ck12.org${href}`,
          publisher: "CK-12 Foundation",
          educationalLevel: "high_school"
        });
      }
    });
    return result2;
  } catch {
    return [];
  }
}
async function fetchOpenLearnCourses(limit = 50) {
  try {
    const res = await axios5.get("https://www.open.edu/openlearn/free-courses/full-catalogue", {
      timeout: 2e4,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $(".course-card, .oucontent-item, article.course").each((_, el) => {
      if (books2.length >= limit) return false;
      const title = $(el).find("h3, h2, .title").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const desc2 = $(el).find("p, .description, .summary").first().text().trim();
      if (title && title.length > 3) {
        books2.push({
          title,
          author: "The Open University",
          description: desc2 || `Free course from The Open University OpenLearn: ${title}`,
          language: "en",
          subjects: ["Education", "Open Course"],
          sourceUrl: href.startsWith("http") ? href : `https://www.open.edu${href}`,
          publisher: "The Open University",
          educationalLevel: "college"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchEasyElimuResources(limit = 50) {
  try {
    const pages = [
      "https://www.easyelimu.com/kenya-primary-school-papers",
      "https://www.easyelimu.com/high-school-notes",
      "https://www.easyelimu.com/kenya-secondary-school-papers"
    ];
    const books2 = [];
    for (const pageUrl of pages) {
      if (books2.length >= limit) break;
      try {
        const res = await axios5.get(pageUrl, { timeout: 15e3, headers: DEFAULT_HEADERS });
        const $ = cheerio4.load(res.data);
        $("a[href*='.pdf'], a[href*='download'], .resource-item, article, .post").each((_, el) => {
          if (books2.length >= limit) return false;
          const title = $(el).find("h2, h3, h4, .title").first().text().trim() || $(el).text().trim().substring(0, 100);
          const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
          if (title && title.length > 5) {
            const level = pageUrl.includes("primary") ? "primary" : pageUrl.includes("secondary") || pageUrl.includes("high-school") ? "high_school" : "general";
            books2.push({
              title,
              author: "Easy Elimu",
              description: `Kenyan educational resource from Easy Elimu: ${title}`,
              language: "en",
              subjects: ["Kenya Education", "CBC", "Examinations"],
              pdfUrl: href?.includes(".pdf") ? href : void 0,
              sourceUrl: href?.startsWith("http") ? href : href ? `https://www.easyelimu.com${href}` : pageUrl,
              publisher: "Easy Elimu",
              educationalLevel: level
            });
          }
        });
      } catch {
      }
    }
    return books2;
  } catch {
    return [];
  }
}
async function fetchAtikaSchoolResources(limit = 50) {
  try {
    const pages = [
      "https://www.atikaschool.org/kcsepastpapers",
      "https://www.atikaschool.org/kcpepastpapers",
      "https://www.atikaschool.org/notes"
    ];
    const books2 = [];
    for (const pageUrl of pages) {
      if (books2.length >= limit) break;
      try {
        const res = await axios5.get(pageUrl, { timeout: 15e3, headers: DEFAULT_HEADERS });
        const $ = cheerio4.load(res.data);
        $("a, .resource-item, article, li").each((_, el) => {
          if (books2.length >= limit) return false;
          const $el = $(el);
          const title = $el.find("h2, h3, h4").first().text().trim() || ($el.is("a") ? $el.text().trim() : "");
          const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
          if (title && title.length > 8 && (href?.includes(".pdf") || href?.includes("download") || href?.includes("paper"))) {
            const level = pageUrl.includes("kcse") ? "high_school" : pageUrl.includes("kcpe") ? "primary" : "general";
            books2.push({
              title,
              author: "Atika School",
              description: `Kenyan exam resource from Atika School: ${title}`,
              language: "en",
              subjects: ["Kenya Education", "KCSE", "KCPE", "Past Papers"],
              pdfUrl: href?.includes(".pdf") ? href.startsWith("http") ? href : `https://www.atikaschool.org${href}` : void 0,
              sourceUrl: href?.startsWith("http") ? href : href ? `https://www.atikaschool.org${href}` : pageUrl,
              publisher: "Atika School",
              educationalLevel: level
            });
          }
        });
      } catch {
      }
    }
    return books2;
  } catch {
    return [];
  }
}
async function fetchKenyaplexResources(limit = 50) {
  try {
    const res = await axios5.get("https://www.kenyaplex.com/resources/", {
      timeout: 15e3,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $("a, .resource, article, .post").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4").first().text().trim() || ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 8) {
        books2.push({
          title,
          author: "KenyaPlex",
          description: `Kenyan educational resource from KenyaPlex: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "KCSE", "Study Materials"],
          sourceUrl: href?.startsWith("http") ? href : href ? `https://www.kenyaplex.com${href}` : "https://www.kenyaplex.com",
          publisher: "KenyaPlex",
          educationalLevel: "high_school"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchSchoolsNetResources(limit = 50) {
  try {
    const res = await axios5.get("https://www.schoolsnetkenya.com/", {
      timeout: 15e3,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $("article, .post, .resource-item, a[href*='.pdf']").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4, .title").first().text().trim() || ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books2.push({
          title,
          author: "Schools Net Kenya",
          description: `Kenyan educational resource: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "CBC", "Curriculum"],
          pdfUrl: href?.includes(".pdf") ? href.startsWith("http") ? href : `https://www.schoolsnetkenya.com${href}` : void 0,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://www.schoolsnetkenya.com${href}` : "https://www.schoolsnetkenya.com",
          publisher: "Schools Net Kenya",
          educationalLevel: "primary"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchCbcResourcesKe(limit = 50) {
  try {
    const res = await axios5.get("https://cbcresources.co.ke/", {
      timeout: 15e3,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $("article, .post, a[href*='.pdf'], .resource").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, h4, .entry-title").first().text().trim() || ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books2.push({
          title,
          author: "CBC Resources Kenya",
          description: `CBC curriculum resource from Kenya: ${title}`,
          language: "en",
          subjects: ["Kenya CBC", "Competency Based Curriculum", "Kenya Education"],
          pdfUrl: href?.includes(".pdf") ? href.startsWith("http") ? href : `https://cbcresources.co.ke${href}` : void 0,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://cbcresources.co.ke${href}` : "https://cbcresources.co.ke",
          publisher: "CBC Resources Kenya",
          educationalLevel: "primary"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}
async function fetchTeachersUpdatesResources(limit = 50) {
  try {
    const res = await axios5.get("https://teachersupdates.net/", {
      timeout: 15e3,
      headers: DEFAULT_HEADERS
    });
    const $ = cheerio4.load(res.data);
    const books2 = [];
    $("article, .post, a[href*='.pdf']").each((_, el) => {
      if (books2.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("h2, h3, .entry-title").first().text().trim() || ($el.is("a") ? $el.text().trim() : "");
      const href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (title && title.length > 5) {
        books2.push({
          title,
          author: "Teachers Updates",
          description: `Educational resource from Teachers Updates Kenya: ${title}`,
          language: "en",
          subjects: ["Kenya Education", "Teacher Resources", "KNEC"],
          pdfUrl: href?.includes(".pdf") ? href.startsWith("http") ? href : `https://teachersupdates.net${href}` : void 0,
          sourceUrl: href?.startsWith("http") ? href : href ? `https://teachersupdates.net${href}` : "https://teachersupdates.net",
          publisher: "Teachers Updates",
          educationalLevel: "high_school"
        });
      }
    });
    return books2;
  } catch {
    return [];
  }
}

// server/sources/aggregator.ts
init_policy();
init_db();
var DEFAULT_SOURCES = [
  // Core open-access sources (reliable JSON APIs - fast)
  { name: "Project Gutenberg", slug: "gutenberg", enabled: true },
  { name: "Internet Archive", slug: "internet_archive", enabled: true },
  { name: "Open Library", slug: "open_library", enabled: true },
  { name: "LibreTexts", slug: "libretexts", enabled: true },
  { name: "Wikibooks", slug: "wikibooks", enabled: true },
  { name: "Wikisource", slug: "wikisource", enabled: true },
  { name: "DOAJ", slug: "doaj", enabled: true },
  { name: "OpenStax", slug: "openstax", enabled: true },
  { name: "DOAB", slug: "doab", enabled: true },
  { name: "Open Textbook Library", slug: "open_textbook", enabled: true },
  { name: "Saylor Academy", slug: "saylor", enabled: true },
  { name: "MIT OpenCourseWare", slug: "mit_ocw", enabled: true },
  { name: "CK-12", slug: "ck12", enabled: true },
  // Slower sources - disabled in scheduled run, use Admin panel to run manually
  { name: "PubMed Central", slug: "pubmed", enabled: false },
  { name: "OER Commons", slug: "oer_commons", enabled: false },
  { name: "OpenLearn", slug: "openlearn", enabled: false },
  // Kenyan web-scraping sources - disabled in scheduled run
  { name: "KICD", slug: "kicd", enabled: true },
  { name: "KNEC", slug: "knec", enabled: true },
  { name: "AJOL", slug: "ajol", enabled: false },
  { name: "Easy Elimu", slug: "easy_elimu", enabled: false },
  { name: "Atika School", slug: "atika_school", enabled: false },
  { name: "KenyaPlex", slug: "kenyaplex", enabled: false },
  { name: "Schools Net Kenya", slug: "schools_net", enabled: false },
  { name: "CBC Resources", slug: "cbc_resources", enabled: false },
  { name: "Teachers Updates", slug: "teachers_updates", enabled: false }
];
var AGGREGATOR_TIMEOUT_MS = 25e3;
async function runAggregator(sourceConfigs) {
  const requestedSources = sourceConfigs ?? DEFAULT_SOURCES.filter((source) => isApprovedSource(source.slug));
  const unsupportedSource = requestedSources.find((source) => source.enabled && !isApprovedSource(source.slug));
  if (unsupportedSource) {
    throw new Error(`Source '${unsupportedSource.slug}' is not approved for automated ingestion`);
  }
  const sources = requestedSources.filter((source) => source.enabled);
  const results = {};
  const masterLog = await createAggregatorLog({
    source: "all",
    status: "running"
  });
  if (!masterLog) {
    throw new Error("Failed to create aggregator log");
  }
  const masterLogId = masterLog.id;
  let totalAdded = 0;
  let totalUpdated = 0;
  const startTime = Date.now();
  try {
    for (const source of sources) {
      if (!source.enabled) continue;
      if (Date.now() - startTime > AGGREGATOR_TIMEOUT_MS) {
        console.warn(`[Aggregator] Timeout reached after ${Date.now() - startTime}ms, stopping early`);
        break;
      }
      try {
        const sourceResult = await aggregateSource(source);
        results[source.slug] = sourceResult;
        totalAdded += sourceResult.added;
        totalUpdated += sourceResult.updated;
        await createAggregatorLog({
          source: source.slug,
          status: "success",
          booksAdded: sourceResult.added,
          booksUpdated: sourceResult.updated
        });
        try {
          const allSources = await getAggregatorSources();
          const dbSource = allSources.find((s) => s.slug === source.slug);
          if (dbSource) {
            await updateAggregatorSource(dbSource.id, {
              lastRunAt: /* @__PURE__ */ new Date(),
              booksFetched: (dbSource.booksFetched || 0) + sourceResult.added
            });
          }
        } catch {
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results[source.slug] = { added: 0, updated: 0, errors: 1 };
        await createAggregatorLog({
          source: source.slug,
          status: "failed",
          errorMessage
        });
      }
    }
    await updateAggregatorLog(masterLogId, {
      status: "success",
      booksAdded: totalAdded,
      booksUpdated: totalUpdated,
      completedAt: /* @__PURE__ */ new Date()
    });
    return {
      success: true,
      totalAdded,
      totalUpdated,
      results,
      masterLogId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await updateAggregatorLog(masterLogId, {
      status: "failed",
      errorMessage,
      completedAt: /* @__PURE__ */ new Date()
    });
    throw error;
  }
}
async function runScheduledAggregator(now = /* @__PURE__ */ new Date()) {
  const scheduledSlug = selectScheduledSource(now);
  const source = DEFAULT_SOURCES.find((candidate) => candidate.slug === scheduledSlug);
  if (!source) {
    throw new Error(`Scheduled source '${scheduledSlug}' is not configured`);
  }
  return runAggregator([{ ...source, enabled: true }]);
}
async function aggregateSource(source) {
  const rightsPolicy = getSourceRightsPolicy(source.slug);
  if (!rightsPolicy) {
    throw new Error(`Source '${source.slug}' is not approved for automated ingestion`);
  }
  switch (source.slug) {
    case "gutenberg":
      return aggregateGutenberg();
    case "doab":
      return aggregateDoab();
    case "open_textbook":
      return aggregateOpenTextbook();
    case "kicd":
      return aggregateKicd();
    case "knec":
      return aggregateKnec();
    case "ajol":
      return aggregateAjol();
    case "internet_archive":
      return aggregateGenericSource(fetchInternetArchiveBooks, "internet_archive", "general");
    case "open_library":
      return aggregateGenericSource(fetchOpenLibraryBooks, "open_library", "general");
    case "openstax":
      return aggregateGenericSource(fetchOpenStaxBooks, "openstax", "college");
    case "libretexts":
      return aggregateGenericSource(fetchLibreTextsBooks, "libretexts", "college");
    case "wikibooks":
      return aggregateGenericSource(fetchWikibooksBooks, "wikibooks", "general");
    case "wikisource":
      return aggregateGenericSource(fetchWikisourceBooks, "wikisource", "general");
    case "doaj":
      return aggregateGenericSource(fetchDoajArticles, "doaj", "university");
    case "pubmed":
      return aggregateGenericSource(fetchPubMedBooks, "pubmed", "university");
    case "saylor":
      return aggregateGenericSource(fetchSaylorCourses, "saylor", "college");
    case "oer_commons":
      return aggregateGenericSource(fetchOerCommonsResources, "oer_commons", "general");
    case "mit_ocw":
      return aggregateGenericSource(fetchMitOcwCourses, "mit_ocw", "university");
    case "ck12":
      return aggregateGenericSource(fetchCk12Books, "ck12", "high_school");
    case "openlearn":
      return aggregateGenericSource(fetchOpenLearnCourses, "openlearn", "college");
    case "easy_elimu":
      return aggregateGenericSource(fetchEasyElimuResources, "easy_elimu", "primary");
    case "atika_school":
      return aggregateGenericSource(fetchAtikaSchoolResources, "atika_school", "high_school");
    case "kenyaplex":
      return aggregateGenericSource(fetchKenyaplexResources, "kenyaplex", "high_school");
    case "schools_net":
      return aggregateGenericSource(fetchSchoolsNetResources, "schools_net", "primary");
    case "cbc_resources":
      return aggregateGenericSource(fetchCbcResourcesKe, "cbc_resources", "primary");
    case "teachers_updates":
      return aggregateGenericSource(fetchTeachersUpdatesResources, "teachers_updates", "high_school");
    default:
      return { added: 0, updated: 0, errors: 0 };
  }
}
async function aggregateGenericSource(fetchFn, sourceSlug, defaultLevel) {
  const rightsPolicy = getSourceRightsPolicy(sourceSlug);
  if (!rightsPolicy) {
    throw new Error(`Source '${sourceSlug}' is not approved for automated ingestion`);
  }
  const books2 = await fetchFn(25);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    if (!book.title || book.title.length < 3) continue;
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats = {};
        if (rightsPolicy.allowDirectDownload && book.pdfUrl) formats.pdf = book.pdfUrl;
        const bookId = await createBook({
          title: book.title.substring(0, 255),
          author: (book.author || "Unknown").substring(0, 255),
          description: book.description || "",
          language: (book.language || "en").substring(0, 10),
          coverUrl: book.coverUrl || "",
          subjects: JSON.stringify((book.subjects || []).slice(0, 10)),
          formats: JSON.stringify(formats),
          source: sourceSlug,
          sourceUrl: book.sourceUrl || "",
          publisher: book.publisher || "",
          publishedDate: book.publishedDate || "",
          isbn: book.isbn || void 0,
          pages: book.pages || void 0,
          educationalLevel: book.educationalLevel || defaultLevel,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            if (subject && subject.length > 1) {
              const subjectId = await getOrCreateSubject(subject);
              if (subjectId && typeof bookId === "number") {
                await linkBookToSubject(bookId, subjectId);
              }
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateGutenberg() {
  const rightsPolicy = getSourceRightsPolicy("gutenberg");
  if (!rightsPolicy) throw new Error("Missing Gutenberg rights policy");
  const books2 = await fetchPopularGutenbergBooks(32);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    try {
      const existing = await getBookByGutenbergId(book.id);
      if (existing) {
        updated++;
      } else {
        const bookId = await createBook({
          gutenbergId: book.id,
          title: book.title,
          author: book.author,
          language: book.language,
          coverUrl: book.coverImage,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(book.formats ? { pdf: book.formats.pdf || book.formats["application/pdf"] } : {}),
          source: "gutenberg",
          sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateDoab() {
  const rightsPolicy = getSourceRightsPolicy("doab");
  if (!rightsPolicy) throw new Error("Missing DOAB rights policy");
  const books2 = await fetchLatestDoabBooks(25);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats = {};
        if (book.pdfUrl) formats.pdf = book.pdfUrl;
        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.imageUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "doab",
          sourceUrl: `https://directory.doabooks.org/rest/search?query=${encodeURIComponent(book.title)}`,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          isbn: book.isbn || void 0,
          educationalLevel: "university",
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateOpenTextbook() {
  const rightsPolicy = getSourceRightsPolicy("open_textbook");
  if (!rightsPolicy) throw new Error("Missing Open Textbook rights policy");
  const books2 = await fetchOpenTextbooks(25);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats = {};
        if (book.pdfUrl) formats.pdf = book.pdfUrl;
        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "open_textbook",
          sourceUrl: `https://open.umn.edu/opentextbooks/textbooks/${book.id}`,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pages: book.pages,
          educationalLevel: "college",
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateKicd() {
  const rightsPolicy = getSourceRightsPolicy("kicd");
  if (!rightsPolicy) throw new Error("Missing KICD rights policy");
  const books2 = await fetchKicdResources(30);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats = {};
        if (book.downloadUrl) formats.pdf = book.downloadUrl;
        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "kicd",
          sourceUrl: book.sourceUrl,
          publishedDate: book.publishedDate,
          educationalLevel: book.educationalLevel,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateKnec() {
  const rightsPolicy = getSourceRightsPolicy("knec");
  if (!rightsPolicy) throw new Error("Missing KNEC rights policy");
  const books2 = await fetchKnecResources(30);
  let added = 0;
  let updated = 0;
  let errors = 0;
  for (const book of books2) {
    try {
      const existing = await getBookByTitleAuthor(book.title, book.author);
      if (existing) {
        updated++;
      } else {
        const formats = {};
        if (book.downloadUrl) formats.pdf = book.downloadUrl;
        const bookId = await createBook({
          title: book.title,
          author: book.author,
          description: book.description,
          language: book.language,
          coverUrl: book.coverUrl,
          subjects: JSON.stringify(book.subjects),
          formats: JSON.stringify(formats),
          source: "knec",
          sourceUrl: book.sourceUrl,
          educationalLevel: book.educationalLevel,
          rightsStatus: rightsPolicy.rightsStatus,
          licenseName: rightsPolicy.licenseName,
          licenseUrl: rightsPolicy.licenseUrl || "",
          directDownloadAllowed: rightsPolicy.allowDirectDownload,
          provenanceCheckedAt: /* @__PURE__ */ new Date()
        });
        if (book.subjects && bookId) {
          for (const subject of book.subjects.slice(0, 5)) {
            const subjectId = await getOrCreateSubject(subject);
            if (subjectId && typeof bookId === "number") {
              await linkBookToSubject(bookId, subjectId);
            }
          }
        }
        added++;
      }
    } catch (error) {
      errors++;
    }
  }
  return { added, updated, errors };
}
async function aggregateAjol() {
  try {
    const { fetchAjolBooks: fetchAjolBooks2 } = await Promise.resolve().then(() => (init_ajol(), ajol_exports));
    return aggregateGenericSource(fetchAjolBooks2, "ajol", "university");
  } catch {
    return { added: 0, updated: 0, errors: 0 };
  }
}

// server/routers.ts
init_policy();
init_db();
init_external_search();
import { sql as sql2 } from "drizzle-orm";
var cleanBook = (book) => {
  if (!book) return book;
  return {
    ...book,
    title: cleanMetadata(book.title || ""),
    author: cleanMetadata(book.author || ""),
    description: cleanMetadata(book.description || ""),
    publisher: void 0,
    source: void 0,
    sourceUrl: void 0,
    annaUrl: void 0
  };
};
var appRouter = router({
  system: systemRouter,
  // Auth
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    /** Sign up with email + password via Supabase Auth */
    signUp: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(6),
      name: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name ?? "" }
      });
      if (error) throw new TRPCError4({ code: "BAD_REQUEST", message: error.message });
      const { data: signInData, error: signInError } = await supabasePublic.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });
      if (signInError || !signInData.session) {
        throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: signInError?.message ?? "Sign-in after sign-up failed" });
      }
      return {
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: input.name ?? ""
        }
      };
    }),
    /** Sign in with email + password via Supabase Auth */
    signIn: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(1)
    })).mutation(async ({ input }) => {
      const { data, error } = await supabasePublic.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });
      if (error || !data.session) {
        throw new TRPCError4({ code: "UNAUTHORIZED", message: error?.message ?? "Invalid credentials" });
      }
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name ?? ""
        }
      };
    }),
    /** Refresh an access token using a refresh token */
    refreshToken: publicProcedure.input(z2.object({ refreshToken: z2.string() })).mutation(async ({ input }) => {
      const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token: input.refreshToken });
      if (error || !data.session) {
        throw new TRPCError4({ code: "UNAUTHORIZED", message: error?.message ?? "Token refresh failed" });
      }
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie?.(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // Import procedures
  import: router({
    gutenberg: protectedProcedure.input(z2.object({ urlOrId: z2.string().min(1) })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return importGutenbergBook(input.urlOrId);
    })
  }),
  // Books procedures
  books: router({
    list: publicProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0),
        genre: z2.string().optional(),
        language: z2.string().optional(),
        educationalLevel: z2.string().optional(),
        source: z2.string().optional(),
        search: z2.string().optional(),
        sort: z2.enum(["newest", "downloads", "title", "author"]).default("newest"),
        pdfOnly: z2.boolean().default(false)
      })
    ).query(async ({ input }) => {
      const results = await listBooks(input);
      return results.map(cleanBook);
    }),
    recent: publicProcedure.input(z2.object({ limit: z2.number().int().min(1).max(50).default(12) })).query(async ({ input }) => {
      const results = await getRecentBooks(input.limit);
      return results.map(cleanBook);
    }),
    popular: publicProcedure.input(z2.object({ limit: z2.number().int().min(1).max(50).default(12) })).query(async ({ input }) => {
      const results = await getPopularBooks(input.limit);
      return results.map(cleanBook);
    }),
    byEducationalLevel: publicProcedure.input(
      z2.object({
        level: z2.string(),
        limit: z2.number().int().min(1).max(50).default(20)
      })
    ).query(async ({ input }) => {
      return getBooksByEducationalLevel(input.level, input.limit);
    }),
    bySource: publicProcedure.input(
      z2.object({
        source: z2.string(),
        limit: z2.number().int().min(1).max(50).default(20)
      })
    ).query(async ({ input }) => {
      return getBooksBySource(input.source, input.limit);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number().int() })).query(async ({ input }) => {
      const book = await getBookById(input.id);
      if (!book) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Book not found" });
      }
      return cleanBook(book);
    }),
    getByGutenbergId: publicProcedure.input(z2.object({ gutenbergId: z2.number().int() })).query(async ({ input }) => {
      return getBookByGutenbergId(input.gutenbergId);
    }),
    search: publicProcedure.input(
      z2.object({
        query: z2.string().max(200).default(""),
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0),
        source: z2.string().optional(),
        educationalLevel: z2.string().optional(),
        genre: z2.string().optional(),
        language: z2.string().optional(),
        sort: z2.enum(["newest", "downloads", "title", "author"]).optional()
      })
    ).query(async ({ input }) => {
      let results;
      if (input.source || input.educationalLevel || input.genre || input.language || input.sort) {
        results = await listBooks({
          limit: input.limit,
          offset: input.offset,
          search: input.query || void 0,
          source: input.source,
          educationalLevel: input.educationalLevel,
          genre: input.genre,
          language: input.language,
          sort: input.sort
        });
      } else {
        results = input.query ? await searchBooks(input.query, input.limit, input.offset) : [];
      }
      return results.map(cleanBook);
    }),
    autocomplete: publicProcedure.input(
      z2.object({
        query: z2.string().min(1).max(100),
        limit: z2.number().int().min(1).max(10).default(5)
      })
    ).query(async ({ input }) => {
      const results = await searchBooks(input.query, input.limit, 0);
      return results.map((b) => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl }));
    }),
    getSimilar: publicProcedure.input(
      z2.object({
        bookId: z2.number().int(),
        limit: z2.number().int().min(1).max(12).default(6)
      })
    ).query(async ({ input }) => {
      const book = await getBookById(input.bookId);
      if (!book) return [];
      const subjectKeyword = (() => {
        try {
          const s = JSON.parse(book.subjects || "[]");
          return s[0] || "";
        } catch {
          return "";
        }
      })();
      if (subjectKeyword) {
        const related = await searchBooks(subjectKeyword, input.limit + 1, 0);
        return related.filter((b) => b.id !== input.bookId).slice(0, input.limit);
      }
      const popular = await getPopularBooks(input.limit + 1);
      return popular.filter((b) => b.id !== input.bookId).slice(0, input.limit);
    }),
    languages: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rawResult = await db.execute(
        sql2`SELECT language, COUNT(*) as cnt FROM books WHERE language IS NOT NULL AND language != '' GROUP BY language ORDER BY cnt DESC LIMIT 20`
      );
      const rows = Array.isArray(rawResult) ? rawResult : rawResult.rows ?? [];
      return rows;
    }),
    byGenre: publicProcedure.input(
      z2.object({
        genreId: z2.number().int(),
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input }) => {
      return getBooksByGenre(input.genreId, input.limit, input.offset);
    }),
    byLanguage: publicProcedure.input(
      z2.object({
        language: z2.string().length(2),
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input }) => {
      return getBooksByLanguage(input.language, input.limit, input.offset);
    }),
    getSubjects: publicProcedure.input(z2.object({ bookId: z2.number().int() })).query(async ({ input }) => {
      return getSubjectsByBookId(input.bookId);
    }),
    create: protectedProcedure.input(
      z2.object({
        title: z2.string().min(1).max(255),
        author: z2.string().optional(),
        description: z2.string().optional(),
        language: z2.string().default("en"),
        coverUrl: z2.string().url().optional(),
        subjects: z2.string().optional(),
        formats: z2.string().optional(),
        gutenbergId: z2.number().int().optional(),
        genreId: z2.number().int().optional(),
        educationalLevel: z2.enum(["primary", "middle_school", "high_school", "college", "university", "professional", "general"]).optional(),
        source: z2.enum(["gutenberg", "kicd", "knec", "doab", "open_textbook", "internet_archive", "open_library", "openstax", "libretexts", "wikibooks", "wikisource", "doaj", "pubmed", "ssrn", "saylor", "oer_commons", "mit_ocw", "ck12", "openlearn", "ajol", "easy_elimu", "atika_school", "kenyaplex", "schools_net", "cbc_resources", "teachers_updates", "merlot", "unesco", "worldbank", "google_books", "other"]).optional(),
        sourceUrl: z2.string().optional(),
        isbn: z2.string().optional(),
        pages: z2.number().int().optional(),
        publisher: z2.string().optional(),
        publishedDate: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return createBook(input);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number().int(),
        title: z2.string().optional(),
        author: z2.string().optional(),
        description: z2.string().optional(),
        language: z2.string().optional(),
        coverUrl: z2.string().url().optional(),
        subjects: z2.string().optional(),
        formats: z2.string().optional(),
        genreId: z2.number().int().optional(),
        educationalLevel: z2.enum(["primary", "middle_school", "high_school", "college", "university", "professional", "general"]).optional(),
        downloadCount: z2.number().int().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      const { id, ...updates } = input;
      return updateBook(id, updates);
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return deleteBook(input.id);
    }),
    count: publicProcedure.query(async () => {
      return getBookCount();
    })
  }),
  // Genres procedures
  genres: router({
    list: publicProcedure.query(async () => {
      return getGenres();
    }),
    getBySlug: publicProcedure.input(z2.object({ slug: z2.string() })).query(async ({ input }) => {
      return getGenreBySlug(input.slug);
    }),
    create: protectedProcedure.input(
      z2.object({
        name: z2.string().min(1).max(128),
        slug: z2.string().min(1).max(128),
        description: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return createGenre(input);
    })
  }),
  // Subjects procedures
  subjects: router({
    list: publicProcedure.query(async () => {
      return getAllSubjects();
    })
  }),
  // Bookshelf procedures
  bookshelf: router({
    list: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(50),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input, ctx }) => {
      return getUserBookshelf(ctx.user.id, input.limit, input.offset);
    }),
    add: protectedProcedure.input(z2.object({ bookId: z2.number().int() })).mutation(async ({ input, ctx }) => {
      const isAlreadyAdded = await isBookInBookshelf(ctx.user.id, input.bookId);
      if (isAlreadyAdded) {
        throw new TRPCError4({ code: "CONFLICT", message: "Book already in bookshelf" });
      }
      return addToBookshelf(ctx.user.id, input.bookId);
    }),
    remove: protectedProcedure.input(z2.object({ bookId: z2.number().int() })).mutation(async ({ input, ctx }) => {
      return removeFromBookshelf(ctx.user.id, input.bookId);
    }),
    isInBookshelf: protectedProcedure.input(z2.object({ bookId: z2.number().int() })).query(async ({ input, ctx }) => {
      return isBookInBookshelf(ctx.user.id, input.bookId);
    })
  }),
  // Download history procedures
  downloads: router({
    history: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(50),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input, ctx }) => {
      return getUserDownloadHistory(ctx.user.id, input.limit, input.offset);
    }),
    record: protectedProcedure.input(
      z2.object({
        bookId: z2.number().int(),
        format: z2.enum(["epub", "pdf", "txt", "html", "mobi"])
      })
    ).mutation(async ({ input, ctx }) => {
      return recordDownload(ctx.user.id, input.bookId, input.format);
    }),
    count: protectedProcedure.query(async ({ ctx }) => {
      return getUserDownloads(ctx.user.id);
    })
  }),
  // Reading progress procedures
  reading: router({
    get: protectedProcedure.input(z2.object({ bookId: z2.number().int() })).query(async ({ input, ctx }) => {
      return getReadingProgress(ctx.user.id, input.bookId);
    }),
    all: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input, ctx }) => {
      return getAllReadingProgress(ctx.user.id, input.limit, input.offset);
    }),
    currentlyReading: protectedProcedure.query(async ({ ctx }) => {
      return getCurrentlyReading(ctx.user.id);
    }),
    update: protectedProcedure.input(
      z2.object({
        bookId: z2.number().int(),
        currentPage: z2.number().int().optional(),
        totalPages: z2.number().int().optional(),
        percentage: z2.number().int().min(0).max(100).optional()
      })
    ).mutation(async ({ input, ctx }) => {
      await updateReadingProgress(ctx.user.id, input.bookId, {
        currentPage: input.currentPage,
        totalPages: input.totalPages,
        percentage: input.percentage
      });
      return { success: true };
    })
  }),
  // Recommendations procedures
  recommendations: router({
    list: protectedProcedure.input(z2.object({ limit: z2.number().int().min(1).max(50).default(12) })).query(async ({ input, ctx }) => {
      return getRecommendationsForUser(ctx.user.id, input.limit);
    }),
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      await generateRecommendations(ctx.user.id);
      return getRecommendationsForUser(ctx.user.id, 12);
    })
  }),
  // Admin procedures
  admin: router({
    // Aggregator logs
    aggregatorLogs: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(20),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getAggregatorLogs(input.limit, input.offset);
    }),
    // Trigger aggregator run
    runAggregator: protectedProcedure.input(
      z2.object({
        sources: z2.array(
          z2.object({
            name: z2.string(),
            slug: z2.string(),
            enabled: z2.boolean()
          })
        ).optional()
      }).optional()
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      const requestedSources = input?.sources;
      const unsupportedSource = requestedSources?.find((source) => source.enabled && !isApprovedSource(source.slug));
      if (unsupportedSource) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: `Source '${unsupportedSource.slug}' has not been approved for automated ingestion`
        });
      }
      return runAggregator(requestedSources);
    }),
    createAggregatorLog: protectedProcedure.input(
      z2.object({
        status: z2.enum(["pending", "running", "success", "failed"]),
        booksAdded: z2.number().int().optional(),
        booksUpdated: z2.number().int().optional(),
        errorMessage: z2.string().optional(),
        source: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return createAggregatorLog(input);
    }),
    updateAggregatorLog: protectedProcedure.input(
      z2.object({
        id: z2.number().int(),
        status: z2.enum(["pending", "running", "success", "failed"]).optional(),
        booksAdded: z2.number().int().optional(),
        booksUpdated: z2.number().int().optional(),
        errorMessage: z2.string().optional(),
        completedAt: z2.date().optional(),
        source: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      const { id, ...updates } = input;
      return updateAggregatorLog(id, updates);
    }),
    // Dashboard stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getDashboardStats();
    }),
    // User management
    users: protectedProcedure.input(
      z2.object({
        limit: z2.number().int().min(1).max(100).default(50),
        offset: z2.number().int().min(0).default(0)
      })
    ).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getAllUsers(input.limit, input.offset);
    }),
    getUser: protectedProcedure.input(z2.object({ id: z2.number().int() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getUserById(input.id);
    }),
    updateUserRole: protectedProcedure.input(
      z2.object({
        id: z2.number().int(),
        role: z2.enum(["user", "admin"])
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return updateUserRole(input.id, input.role);
    }),
    userCount: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getUserCount();
    }),
    // Source management
    sources: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getAggregatorSources();
    }),
    updateSource: protectedProcedure.input(
      z2.object({
        id: z2.number().int(),
        isActive: z2.enum(["yes", "no"]).optional(),
        url: z2.string().optional(),
        config: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Admin only" });
      }
      const source = (await getAggregatorSources()).find((item) => item.id === input.id);
      if (!source) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Catalog source not found" });
      }
      if (input.isActive === "yes" && !isApprovedSource(source.slug)) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: `Source '${source.slug}' has not been approved for automated ingestion`
        });
      }
      return updateAggregatorSource(input.id, input);
    })
  })
});

// server/_core/context.ts
init_db();
function extractToken(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers["cookie"] ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}
async function createContext(opts) {
  let user = null;
  try {
    const token = extractToken(opts.req);
    if (token) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        await upsertUser({
          openId: supabaseUser.id,
          email: supabaseUser.email ?? null,
          loginMethod: "supabase",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        const dbUser = await getUserByOpenId(supabaseUser.id);
        user = dbUser ?? null;
      }
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/server.ts
var app = express();
var DOWNLOAD_HOST_ALLOWLIST = /* @__PURE__ */ new Set([
  "archive.org",
  "www.archive.org",
  "afrika.univie.ac.at",
  "www.swahili-literatur.at",
  "swahili-literatur.at",
  "etd.ohiolink.edu",
  "www.gutenberg.org",
  "openstax.org",
  "www.openstax.org",
  "kicd.ac.ke",
  "cba.knec.ac.ke",
  "arxiv.org",
  "export.arxiv.org",
  "europepmc.org",
  "www.ebi.ac.uk",
  "pmc.ncbi.nlm.nih.gov",
  "zenodo.org",
  "api.zenodo.org"
]);
function decodeDownloadToken(token) {
  if (typeof token !== "string" || token.length < 8 || token.length > 4096) return void 0;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const url = new URL(decoded);
    if (url.protocol !== "https:" || !DOWNLOAD_HOST_ALLOWLIST.has(url.hostname.toLowerCase())) return void 0;
    return url.toString();
  } catch {
    return void 0;
  }
}
function isAllowedDownloadUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && DOWNLOAD_HOST_ALLOWLIST.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
function encodeDownloadToken(rawUrl) {
  if (typeof rawUrl !== "string" || !isAllowedDownloadUrl(rawUrl)) return void 0;
  return Buffer.from(rawUrl, "utf8").toString("base64url");
}
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
app.get("/api/scheduled/aggregator", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result2 = await runScheduledAggregator();
    res.json({ ok: true, ...result2 });
  } catch (error) {
    console.error("Scheduled aggregator error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.get("/api/debug-env", (req, res) => {
  return res.json({
    hasDbUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    appId: process.env.VITE_APP_ID,
    // Do not leak the full URL for security
    dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.split("@")[1] : null
  });
});
app.get("/api/check-url", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url param required" });
  try {
    const axios8 = await import("axios");
    const response = await axios8.default.head(url, {
      timeout: 8e3,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0)" }
    });
    return res.json({ ok: true, status: response.status, url });
  } catch (error) {
    const status = error?.response?.status ?? 0;
    return res.json({ ok: false, status, url });
  }
});
app.get("/api/libgen", async (req, res) => {
  const q = req.query.q;
  const limit = parseInt(req.query.limit || "50", 10);
  const language = req.query.lang;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query parameter "q" is required (min 2 chars)' });
  }
  try {
    const encodedQuery = encodeURIComponent(q);
    const langParam = language ? `&lang=${encodeURIComponent(language)}` : "";
    const url = `https://libgen.li/index.php?req=${encodedQuery}&lg_topic=libgen&open=0&view=simple&res=100&phrase=1&column=def${langParam}`;
    const axios8 = await import("axios");
    const cheerioModule = await import("cheerio");
    const cheerio7 = cheerioModule.default || cheerioModule;
    const response = await axios8.default.get(url, {
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)"
      }
    });
    const $ = cheerio7.load(response.data);
    const books2 = [];
    $("#tablelibgen tr").each((_i, row) => {
      const cells = $(row).find("td");
      if (cells.length < 9) return;
      const editionLinks = cells.eq(0).find('a[href*="edition.php"]');
      const titleLink = editionLinks.length > 1 ? editionLinks.last() : editionLinks.first();
      if (!titleLink.length) return;
      const title = titleLink.text().trim();
      const author = cells.eq(1).text().trim();
      const publisher = cells.eq(2).text().trim();
      const year = cells.eq(3).text().trim();
      const language2 = cells.eq(4).text().trim();
      const pages = cells.eq(5).text().trim();
      const filesize = cells.eq(6).text().trim();
      const format = cells.eq(7).text().trim();
      if (format.toLowerCase() !== "pdf") return;
      const libgenLink = cells.eq(8).find('a[title="libgen"], a[href*="/get.php"]').first();
      const annaLink = cells.eq(8).find('a[href*="annas-archive"]').first();
      const md5Href = libgenLink.attr("href") || annaLink.attr("href") || "";
      const md5Match = md5Href.match(/md5=([a-f0-9]{32})/);
      const md5 = md5Match ? md5Match[1] : "";
      const annaUrl = annaLink.attr("href") || "";
      if (!title || !md5) return;
      if (/^[\d\s;:.,-]+$/.test(title) || /^DOI:\s/i.test(title) || /^10\.\d{4}\//i.test(title)) return;
      if (title.length < 3) return;
      if (true) {
        books2.push({
          title,
          author: author || "Unknown",
          year: year || "",
          publisher: publisher || "",
          language: language2 || "",
          pages: pages || "",
          format: format || "",
          filesize: filesize || "",
          md5,
          source: "libgen",
          // Primary: Anna's Archive (most reliable); fallback to libgen mirrors
          sourceUrl: annaUrl || `https://libgen.li/get.php?md5=${md5}`,
          // @ts-ignore
          annaUrl: annaUrl || `https://annas-archive.gd/md5/${md5}`,
          mirrors: [
            annaUrl || `https://annas-archive.gd/md5/${md5}`,
            `https://libgen.li/get.php?md5=${md5}`,
            `https://libgen.rs/get.php?md5=${md5}`
          ],
          formats: {
            pdf: annaUrl || `https://annas-archive.gd/md5/${md5}`
          }
        });
      }
    });
    const limitedBooks = books2.slice(0, limit);
    return res.status(200).json({
      success: true,
      source: "libgen",
      query: q,
      total: limitedBooks.length,
      books: limitedBooks
    });
  } catch (error) {
    console.error("LibGen search error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search LibGen",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
app.all("/api/download", async (req, res) => {
  let md5;
  let format = "pdf";
  let directUrl;
  if (req.method === "GET") {
    md5 = req.query.md5;
    directUrl = decodeDownloadToken(req.query.token) || req.query.url;
    format = req.query.format || "pdf";
  } else if (req.method === "POST") {
    const body = req.body || {};
    md5 = body.md5;
    directUrl = decodeDownloadToken(body.token) || body.url;
    format = body.format || "pdf";
  }
  if (directUrl && /^https?:\/\//i.test(directUrl)) {
    if (!isAllowedDownloadUrl(directUrl)) {
      return res.status(403).json({ success: false, error: "Download source not approved", message: "This file can only be downloaded from an approved open-access source." });
    }
    try {
      const axios9 = await import("axios");
      const r = await axios9.default.get(directUrl, {
        responseType: "arraybuffer",
        timeout: 2e4,
        maxRedirects: 8,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "*/*"
        },
        validateStatus: (s) => s < 500
      });
      const buf = Buffer.from(r.data);
      const ct = r.headers["content-type"] || "";
      if (buf.length > 5e3 && !/text\/html|text\/xml|application\/json/i.test(ct)) {
        const magic = buf.slice(0, 4).toString("hex");
        const isPdf = magic === "25504446" || magic === "41542654" || magic === "0000001c" || /pdf/i.test(ct);
        const isEpub = magic === "504b0304" || /epub/i.test(ct);
        if (isPdf || isEpub || buf.length > 2e5 && !buf.slice(0, 500).toString().toLowerCase().includes("<html")) {
          const ext = isEpub ? "epub" : "pdf";
          res.setHeader("Content-Type", isPdf ? "application/pdf" : isEpub ? "application/epub+zip" : ct || "application/octet-stream");
          res.setHeader("Content-Disposition", `attachment; filename="document.${ext}"`);
          res.setHeader("Content-Length", buf.length.toString());
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
          return res.send(buf);
        }
      }
    } catch {
    }
    const urlMd5 = directUrl.match(/(?:md5=|\/md5\/)([a-f0-9]{32})/i)?.[1];
    md5 = md5 || urlMd5;
  }
  if (!md5 || typeof md5 !== "string" || !/^[a-f0-9]{32}$/i.test(md5)) {
    return res.status(404).json({ success: false, error: "Download unavailable", message: "This document is not available right now. Try another result." });
  }
  const annaDomains = ["annas-archive.gd", "annas-archive.li", "annas-archive.gl", "annas-archive.pk", "annas-archive.se", "annas-archive.org"];
  const annaHtmlUrls = annaDomains.map((d) => `https://${d}/md5/${md5}`);
  const annaJsonUrls = annaDomains.map((d) => `https://${d}/md5/${md5}.json`);
  const axios8 = await import("axios");
  const https = await import("https");
  const UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const TIMEOUT = 15e3;
  const isBinaryCt = (ct) => /application\/pdf|application\/octet-stream|application\/epub|djvu|binary/i.test(ct || "");
  const insecureAgent = new https.Agent({ rejectUnauthorized: false });
  const tryDownload = async (url, referer) => {
    console.log(`[download] Trying: ${url}`);
    try {
      const head = await axios8.default.head(url, {
        timeout: 2e4,
        maxRedirects: 8,
        httpsAgent: insecureAgent,
        headers: { "User-Agent": UA2, "Referer": referer || "https://annas-archive.gd/", "Accept": "*/*" },
        validateStatus: (s) => s < 500
      });
      const ct = head.headers["content-type"] || "";
      const cl = parseInt(head.headers["content-length"] || "0", 10);
      if (/text\/html|application\/json/i.test(ct)) {
        if (!cl || cl < 1e5) {
          const check = await axios8.default.get(url, {
            timeout: 1e4,
            maxRedirects: 8,
            httpsAgent: insecureAgent,
            headers: { "User-Agent": UA2, "Referer": referer || "https://annas-archive.gd/", "Accept": "*/*" }
          });
          const checkCt = check.headers["content-type"] || "";
          const checkData = check.data instanceof Buffer ? check.data : Buffer.from(check.data);
          if (/text\/html|application\/json/i.test(checkCt) || checkData.slice(0, 500).toString().toLowerCase().includes("<html")) {
            return false;
          }
        } else {
          return false;
        }
      }
      const response = await axios8.default.get(url, {
        responseType: "stream",
        timeout: 12e4,
        maxRedirects: 8,
        httpsAgent: insecureAgent,
        headers: { "User-Agent": UA2, "Referer": referer || "https://annas-archive.gd/", "Accept": "*/*" }
      });
      const finalCt = response.headers["content-type"] || ct || "application/pdf";
      const finalCl = response.headers["content-length"] || cl;
      const ext = (format || "pdf").toLowerCase();
      res.setHeader("Content-Type", isBinaryCt(finalCt) ? finalCt : "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="book.${ext}"`);
      if (finalCl) res.setHeader("Content-Length", finalCl);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
      response.data.pipe(res);
      return new Promise((resolve, reject) => {
        response.data.on("end", () => resolve(true));
        response.data.on("error", (err) => reject(err));
      });
    } catch (err) {
      console.error(`[download] Failed ${url}: ${err.message}`);
    }
    return false;
  };
  console.log(`[download] Attempt 0: Anna's Archive JSON for ${md5}`);
  for (let i = 0; i < annaJsonUrls.length; i++) {
    try {
      const jsonResp = await axios8.default.get(annaJsonUrls[i], {
        timeout: 5e3,
        maxRedirects: 5,
        headers: { "User-Agent": UA2, "Referer": annaHtmlUrls[i], Accept: "application/json" }
      });
      if (jsonResp.data && jsonResp.data?.mirrors?.length) {
        const mirrors = jsonResp.data.mirrors;
        for (const m of mirrors) {
          const url = typeof m === "string" ? m : m?.url;
          if (url && await tryDownload(url, annaHtmlUrls[i])) return;
        }
      }
    } catch {
    }
  }
  console.log(`[download] Attempt 0.5: Anna's Archive HTML scraping for ${md5}`);
  for (let i = 0; i < annaHtmlUrls.length; i++) {
    try {
      const htmlResp = await axios8.default.get(annaHtmlUrls[i], {
        timeout: 5e3,
        headers: { "User-Agent": UA2 }
      });
      const $ = cheerio.load(htmlResp.data);
      const downloadLinks = [];
      $("a.js-download-link").each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.startsWith("http")) {
          downloadLinks.push(href);
        } else if (href && href.startsWith("/")) {
          downloadLinks.push(`https://${annaDomains[i]}${href}`);
        }
      });
      for (const url of downloadLinks) {
        if (await tryDownload(url, annaHtmlUrls[i])) return;
      }
    } catch {
    }
  }
  console.log(`[download] Attempt 1: library.lol for ${md5}`);
  try {
    const lolResp = await axios8.default.get(`https://library.lol/main/${md5}`, {
      timeout: TIMEOUT,
      maxRedirects: 3,
      headers: { "User-Agent": UA2, "Referer": "https://library.lol/", "Accept": "text/html" }
    });
    const lolHtml = typeof lolResp.data === "string" ? lolResp.data : lolResp.data.toString();
    const dlMatch = lolHtml.match(/id=["']download["'][\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
    if (dlMatch && dlMatch[1] && !dlMatch[1].includes("library.lol")) {
      if (await tryDownload(dlMatch[1], "https://library.lol/")) return;
    }
    const libMatch = lolHtml.match(/href=["'](https?:\/\/(?:libgen\.[a-z]+|books\.ms)[^\"']*\.(?:pdf|epub|djvu|fb2)[^"']*)["']/i);
    if (libMatch && libMatch[1]) {
      if (await tryDownload(libMatch[1], "https://library.lol/")) return;
    }
  } catch {
  }
  console.log(`[download] Attempt 2: libgen.li ads.php for ${md5}`);
  try {
    const adsResp = await axios8.default.get(`https://libgen.li/ads.php?md5=${md5}`, {
      timeout: TIMEOUT,
      maxRedirects: 5,
      headers: { "User-Agent": UA2 }
    });
    const html = typeof adsResp.data === "string" ? adsResp.data : adsResp.data.toString();
    const keyMatch = html.match(new RegExp("get\\.php\\?md5=" + md5 + "&key=([A-Za-z0-9]+)"));
    if (keyMatch) {
      const key = keyMatch[1];
      if (await tryDownload(`https://libgen.li/get.php?md5=${md5}&key=${key}`, `https://libgen.li/ads.php?md5=${md5}`)) return;
    }
  } catch {
  }
  const directUrls = [
    `https://libgen.rs/get.php?md5=${md5}`,
    `https://libgen.is/get.php?md5=${md5}`,
    `https://libgen.st/get.php?md5=${md5}`,
    `https://libgen.rocks/get.php?md5=${md5}`,
    `https://libgen.li/get.php?md5=${md5}`,
    `https://z-lib.is/get.php?md5=${md5}`,
    `https://z-lib.io/get.php?md5=${md5}`,
    `https://z-lib.id/get.php?md5=${md5}`
  ];
  for (const url of directUrls) {
    if (await tryDownload(url)) return;
  }
  return res.status(200).json({
    success: false,
    error: "Download unavailable",
    message: "Could not fetch this file from any source. The file may have been removed or is temporarily unavailable. Please try again later."
  });
});
app.options("/api/download", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});
app.get("/api/kicd", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const limit = parseInt(req.query.limit || "50", 10);
  try {
    const { fetchKicdResources: fetchKicdResources2 } = await Promise.resolve().then(() => (init_kicd(), kicd_exports));
    const { fetchKnecResources: fetchKnecResources2 } = await Promise.resolve().then(() => (init_knec(), knec_exports));
    const [kicdResults, knecResults] = await Promise.allSettled([
      fetchKicdResources2(limit),
      fetchKnecResources2(limit)
    ]);
    let allResources = [];
    if (kicdResults.status === "fulfilled") allResources.push(...kicdResults.value);
    if (knecResults.status === "fulfilled") allResources.push(...knecResults.value);
    if (q && q.length >= 2) {
      allResources = allResources.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.subjects.some((s) => s.toLowerCase().includes(q))
      );
    }
    return res.status(200).json({
      success: true,
      source: "kicd_knec",
      query: q || null,
      total: allResources.length,
      books: allResources.slice(0, limit)
    });
  } catch (error) {
    console.error("KICD/KNEC search error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch KICD/KNEC materials",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  const rawLimit = Number(req.query.limit || 20);
  const rawOffset = Number(req.query.offset || 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 20;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  const level = String(req.query.level || "").trim().toLowerCase();
  const source = String(req.query.source || "").trim().toLowerCase();
  const language = String(req.query.language || "").trim().toLowerCase();
  const genre = String(req.query.genre || "").trim();
  const sort = String(req.query.sort || "relevance").trim().toLowerCase();
  if (q.length < 2 && !level && !source && !language && !genre) {
    return res.status(400).json({ error: 'Query parameter "q" or a catalog filter is required' });
  }
  try {
    const axios8 = await import("axios");
    const cheerioModule = await import("cheerio");
    const cheerio7 = cheerioModule.default || cheerioModule;
    const queryTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const requestedLimit = Math.min(100, Math.max(50, offset + limit));
    const matchesQuery = (book) => {
      if (queryTokens.length === 0) return true;
      const subjects2 = Array.isArray(book.subjects) ? book.subjects : book.subjects ? [book.subjects] : [];
      const searchable = [book.title, book.author, book.description, ...subjects2].filter(Boolean).join(" ").toLowerCase();
      return queryTokens.every((token) => searchable.includes(token));
    };
    const matchesFilters = (book) => (!source || String(book.source || "").toLowerCase() === source) && (!level || String(book.educationalLevel || "").toLowerCase() === level) && (!language || String(book.language || "").toLowerCase() === language) && matchesQuery(book);
    const withTimeout2 = async (promise, milliseconds) => {
      let timer;
      try {
        return await Promise.race([
          promise,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("source timeout")), milliseconds);
          })
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };
    const libgenPromise = (async () => {
      const books3 = [];
      if (q.length < 2) return books3;
      try {
        const url = `https://libgen.li/index.php?req=${encodeURIComponent(q)}&lg_topic=libgen&open=0&view=simple&res=100&phrase=1&column=def`;
        const response = await axios8.default.get(url, {
          timeout: 2e4,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)" }
        });
        const $ = cheerio7.load(response.data);
        $("#tablelibgen tr").each((_i, row) => {
          const cells = $(row).find("td");
          if (cells.length < 9) return;
          const editionLinks = cells.eq(0).find('a[href*="edition.php"]');
          const titleLink = editionLinks.length > 1 ? editionLinks.last() : editionLinks.first();
          const title = titleLink.text().trim();
          const format = cells.eq(7).text().trim().toLowerCase();
          const annaLink = cells.eq(8).find('a[href*="annas-archive"]').first();
          const libgenLink = cells.eq(8).find('a[title="libgen"], a[href*="/get.php"]').first();
          const md5Href = libgenLink.attr("href") || annaLink.attr("href") || "";
          const md5Match = md5Href.match(/md5=([a-f0-9]{32})/i);
          const md5 = md5Match ? md5Match[1] : "";
          if (!title || !md5 || format !== "pdf" || /^[\d\s;:.,-]+$/.test(title)) return;
          const sourceUrl = annaLink.attr("href") || `https://annas-archive.gd/md5/${md5}`;
          books3.push({
            title: title.slice(0, 255),
            author: cells.eq(1).text().trim() || "Unknown",
            publisher: cells.eq(2).text().trim(),
            year: cells.eq(3).text().trim(),
            language: cells.eq(4).text().trim() || "en",
            pages: cells.eq(5).text().trim(),
            filesize: cells.eq(6).text().trim(),
            format,
            md5,
            source: "libgen",
            sourceUrl,
            downloadUrl: "",
            annaUrl: sourceUrl,
            formats: { pdf: sourceUrl }
          });
        });
      } catch {
      }
      return books3;
    })();
    const externalPromise = (async () => {
      if (q.length < 2) return { internet_archive: [], gutenberg: [], open_library: [], openstax: [], z_library: [], annas_archive: [], research: [] };
      try {
        const { runExternalSearch: runExternalSearch2 } = await Promise.resolve().then(() => (init_external_search(), external_search_exports));
        return await withTimeout2(runExternalSearch2(q, 30), 2e4);
      } catch (err) {
        console.error("External search error:", err);
        return { internet_archive: [], gutenberg: [], open_library: [], openstax: [], z_library: [], annas_archive: [], research: [] };
      }
    })();
    const [localResult, libgenResult, externalResult, kicdResult, knecResult] = await Promise.allSettled([
      Promise.resolve().then(() => (init_db(), db_exports)).then(({ listBooks: listBooks2 }) => listBooks2({
        limit: requestedLimit,
        offset: 0,
        search: q || void 0,
        genre: genre || void 0,
        language: language || void 0,
        educationalLevel: level || void 0,
        source: source || void 0
      })),
      libgenPromise,
      externalPromise,
      Promise.resolve().then(() => (init_kicd(), kicd_exports)).then(async ({ fetchKicdResources: fetchKicdResources2 }) => {
        const rows = await withTimeout2(fetchKicdResources2(Math.min(50, requestedLimit)), 8e3);
        return rows.filter(matchesFilters).map((book) => ({ ...book, source: "kicd", year: book.publishedDate ? String(book.publishedDate).slice(0, 4) : "", format: "pdf", formats: { pdf: book.downloadUrl || book.sourceUrl || "" } }));
      }),
      Promise.resolve().then(() => (init_knec(), knec_exports)).then(async ({ fetchKnecResources: fetchKnecResources2 }) => {
        const rows = await withTimeout2(fetchKnecResources2(Math.min(50, requestedLimit)), 8e3);
        return rows.filter(matchesFilters).map((book) => ({ ...book, source: "knec", year: book.publishedDate ? String(book.publishedDate).slice(0, 4) : "", format: "pdf", formats: { pdf: book.downloadUrl || book.sourceUrl || "" } }));
      })
    ]);
    const parseFormats = (value) => {
      if (value && typeof value === "object") return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return {};
    };
    const localBooks = localResult.status === "fulfilled" ? localResult.value.map((book) => {
      const formats = parseFormats(book.formats);
      return {
        ...book,
        formats,
        downloadUrl: book.downloadUrl || formats.pdf || book.sourceUrl || "",
        format: "pdf",
        year: book.publishedDate || "",
        md5: book.md5 || ""
      };
    }) : [];
    const localError = localResult.status === "rejected" ? localResult.reason : null;
    const libgenBooks = libgenResult.status === "fulfilled" ? libgenResult.value : [];
    const externalData = externalResult.status === "fulfilled" ? externalResult.value : { internet_archive: [], gutenberg: [], open_library: [], openstax: [], z_library: [], annas_archive: [], swahili_special: [], research: [] };
    const iaBooks = externalData.internet_archive || [];
    const olBooks = externalData.open_library || [];
    const zLibBooks = externalData.z_library || [];
    const annaBooks = externalData.annas_archive || [];
    const swahiliSpecialBooks = externalData.swahili_special || [];
    const researchBooks = externalData.research || [];
    const kicdBooks = kicdResult.status === "fulfilled" ? kicdResult.value : [];
    const knecBooks = knecResult.status === "fulfilled" ? knecResult.value : [];
    const candidates = [
      ...swahiliSpecialBooks,
      ...researchBooks,
      ...annaBooks,
      ...zLibBooks,
      ...localBooks,
      ...libgenBooks,
      ...iaBooks,
      ...olBooks,
      ...kicdBooks,
      ...knecBooks
    ].filter(matchesFilters);
    const merged = /* @__PURE__ */ new Map();
    for (const book of candidates) {
      const title = String(book.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const author = String(book.author || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const key = book.md5 ? `md5:${String(book.md5).toLowerCase()}` : `title:${title}|author:${author}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, book);
        continue;
      }
      const combined = { ...existing, ...book, id: typeof existing.id === "number" ? existing.id : book.id };
      combined.md5 = existing.md5 || book.md5 || "";
      combined.downloadUrl = existing.downloadUrl || book.downloadUrl || "";
      combined.sourceUrl = existing.sourceUrl || book.sourceUrl || "";
      combined.formats = { ...book.formats || {}, ...existing.formats || {} };
      merged.set(key, combined);
    }
    const relevance = (book) => {
      if (!q) return 0;
      const needle = q.toLowerCase();
      const title = String(book.title || "").toLowerCase();
      const author = String(book.author || "").toLowerCase();
      const description = String(book.description || "").toLowerCase();
      let score = title === needle ? 1e3 : title.includes(needle) ? 500 : 0;
      if (author.includes(needle)) score += 300;
      if (description.includes(needle)) score += 100;
      for (const token of queryTokens) {
        if (title.includes(token)) score += 40;
        if (author.includes(token)) score += 20;
      }
      return score;
    };
    const books2 = Array.from(merged.values()).sort((a, b) => {
      if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      if (sort === "author") return String(a.author || "").localeCompare(String(b.author || ""));
      if (sort === "downloads") return Number(b.downloadCount || 0) - Number(a.downloadCount || 0);
      if (sort === "newest") return String(b.publishedDate || b.year || b.importedAt || "").localeCompare(String(a.publishedDate || a.year || a.importedAt || ""));
      return relevance(b) - relevance(a) || String(a.title || "").localeCompare(String(b.title || ""));
    });
    const { cleanMetadata: cleanMetadata2 } = await Promise.resolve().then(() => (init_external_search(), external_search_exports));
    const finalBooks = books2.slice(offset, offset + limit).map((book) => {
      const formats = parseFormats(book.formats);
      const directUrl = book.directDownloadAllowed === false ? "" : book.downloadUrl || book.pdfUrl || formats.pdf || "";
      const token = encodeDownloadToken(directUrl);
      const inSiteDownloadUrl = token ? `/api/download?token=${token}` : "";
      return {
        ...book,
        formats: token ? { ...formats, pdf: inSiteDownloadUrl } : formats,
        downloadUrl: inSiteDownloadUrl,
        author: cleanMetadata2(book.author || ""),
        description: cleanMetadata2(book.description || ""),
        publisher: void 0,
        source: void 0,
        sourceUrl: void 0,
        // Hide source URL
        pdfUrl: void 0,
        annaUrl: void 0
      };
    });
    return res.status(200).json({
      success: true,
      query: q,
      total: books2.length,
      localError: localError ? localError instanceof Error ? localError.message : String(localError) : null,
      books: finalBooks
    });
  } catch (error) {
    console.error("Unified search error:", error);
    return res.status(500).json({ success: false, error: "Unified search failed", message: error instanceof Error ? error.message : "Unknown error" });
  }
});
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
