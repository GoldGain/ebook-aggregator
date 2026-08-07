import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { supabaseAdmin, supabasePublic } from "./supabaseAuth";
import { z } from "zod";
import {
  getBooks,
  getBookById,
  getBookByGutenbergId,
  searchBooks,
  listBooks,
  getBooksByGenre,
  getBooksByLanguage,
  getBooksByEducationalLevel,
  getBooksBySource,
  getRecentBooks,
  getPopularBooks,
  createBook,
  updateBook,
  deleteBook,
  getBookCount,
  getGenres,
  getGenreBySlug,
  createGenre,
  getAllSubjects,
  getOrCreateSubject,
  linkBookToSubject,
  getSubjectsByBookId,
  getUserBookshelf,
  addToBookshelf,
  removeFromBookshelf,
  isBookInBookshelf,
  getBookshelfBookIds,
  getUserDownloadHistory,
  recordDownload,
  getUserDownloads,
  getTotalDownloadCount,
  getReadingProgress,
  updateReadingProgress,
  getAllReadingProgress,
  getCurrentlyReading,
  getRecommendationsForUser,
  generateRecommendations,
  getAggregatorLogs,
  createAggregatorLog,
  updateAggregatorLog,
  getAllUsers,
  getUserById,
  updateUserRole,
  getUserCount,
  getDashboardStats,
  getAggregatorSources,
  updateAggregatorSource,
} from "./db";
import { TRPCError } from "@trpc/server";
import { importGutenbergBook } from "./import";
import { runAggregator } from "./sources/aggregator";
import { isApprovedSource } from "./sources/policy";
import { getDb } from "./db";
import { sql, eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  // Auth
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    /** Sign up with email + password via Supabase Auth */
    signUp: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { data, error } = await (supabaseAdmin.auth as any).admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: { name: input.name ?? "" },
        });
        if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        // Sign in immediately to get an access token
        const { data: signInData, error: signInError } = await (supabasePublic.auth as any).signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (signInError || !signInData.session) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: signInError?.message ?? "Sign-in after sign-up failed" });
        }
        return {
          accessToken: signInData.session.access_token,
          refreshToken: signInData.session.refresh_token,
          user: {
            id: data.user!.id,
            email: data.user!.email,
            name: input.name ?? "",
          },
        };
      }),

    /** Sign in with email + password via Supabase Auth */
    signIn: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { data, error } = await (supabasePublic.auth as any).signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (error || !data.session) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: error?.message ?? "Invalid credentials" });
        }
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: (data.user.user_metadata?.name as string) ?? "",
          },
        };
      }),

    /** Refresh an access token using a refresh token */
    refreshToken: publicProcedure
      .input(z.object({ refreshToken: z.string() }))
      .mutation(async ({ input }) => {
        const { data, error } = await (supabasePublic.auth as any).refreshSession({ refresh_token: input.refreshToken });
        if (error || !data.session) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: error?.message ?? "Token refresh failed" });
        }
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).clearCookie?.(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Import procedures
  import: router({
    gutenberg: protectedProcedure
      .input(z.object({ urlOrId: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return importGutenbergBook(input.urlOrId);
      }),
  }),

  // Books procedures
  books: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
          genre: z.string().optional(),
          language: z.string().optional(),
          educationalLevel: z.string().optional(),
          source: z.string().optional(),
          search: z.string().optional(),
          sort: z.enum(["newest", "downloads", "title", "author"]).default("newest"),
          pdfOnly: z.boolean().default(false),
        })
      )
      .query(async ({ input }) => {
        return listBooks(input);
      }),

    recent: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(12) }))
      .query(async ({ input }) => {
        return getRecentBooks(input.limit);
      }),

    popular: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(12) }))
      .query(async ({ input }) => {
        return getPopularBooks(input.limit);
      }),

    byEducationalLevel: publicProcedure
      .input(
        z.object({
          level: z.string(),
          limit: z.number().int().min(1).max(50).default(20),
        })
      )
      .query(async ({ input }) => {
        return getBooksByEducationalLevel(input.level, input.limit);
      }),

    bySource: publicProcedure
      .input(
        z.object({
          source: z.string(),
          limit: z.number().int().min(1).max(50).default(20),
        })
      )
      .query(async ({ input }) => {
        return getBooksBySource(input.source, input.limit);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const book = await getBookById(input.id);
        if (!book) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
        }
        return book;
      }),

    getByGutenbergId: publicProcedure
      .input(z.object({ gutenbergId: z.number().int() }))
      .query(async ({ input }) => {
        return getBookByGutenbergId(input.gutenbergId);
      }),

    search: publicProcedure
      .input(
        z.object({
          query: z.string().max(200).default(""),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
          source: z.string().optional(),
          educationalLevel: z.string().optional(),
          genre: z.string().optional(),
          language: z.string().optional(),
          sort: z.enum(["newest", "downloads", "title", "author"]).optional(),
        })
      )
      .query(async ({ input }) => {
        // Use listBooks with search for filtered results
        if (input.source || input.educationalLevel || input.genre || input.language || input.sort) {
          return listBooks({
            limit: input.limit,
            offset: input.offset,
            search: input.query || undefined,
            source: input.source,
            educationalLevel: input.educationalLevel,
            genre: input.genre,
            language: input.language,
            sort: input.sort,
          });
        }
        return input.query ? searchBooks(input.query, input.limit, input.offset) : [];
      }),

    autocomplete: publicProcedure
      .input(
        z.object({
          query: z.string().min(1).max(100),
          limit: z.number().int().min(1).max(10).default(5),
        })
      )
      .query(async ({ input }) => {
        const results = await searchBooks(input.query, input.limit, 0);
        return results.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl }));
      }),

    getSimilar: publicProcedure
      .input(
        z.object({
          bookId: z.number().int(),
          limit: z.number().int().min(1).max(12).default(6),
        })
      )
      .query(async ({ input }) => {
        const book = await getBookById(input.bookId);
        if (!book) return [];
        // Search by first subject keyword for related books
        const subjectKeyword = (() => {
          try { const s = JSON.parse(book.subjects || "[]"); return s[0] || ""; } catch { return ""; }
        })();
        if (subjectKeyword) {
          const related = await searchBooks(subjectKeyword, input.limit + 1, 0);
          return related.filter(b => b.id !== input.bookId).slice(0, input.limit);
        }
        const popular = await getPopularBooks(input.limit + 1);
        return popular.filter(b => b.id !== input.bookId).slice(0, input.limit);
      }),

    languages: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rawResult = await db.execute(
        sql`SELECT language, COUNT(*) as cnt FROM books WHERE language IS NOT NULL AND language != '' GROUP BY language ORDER BY cnt DESC LIMIT 20`
      );
      const rows = (Array.isArray(rawResult) ? rawResult : (rawResult as any).rows ?? []) as { language: string; cnt: number }[];
      return rows;
    }),

    byGenre: publicProcedure
      .input(
        z.object({
          genreId: z.number().int(),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return getBooksByGenre(input.genreId, input.limit, input.offset);
      }),

    byLanguage: publicProcedure
      .input(
        z.object({
          language: z.string().length(2),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return getBooksByLanguage(input.language, input.limit, input.offset);
      }),

    getSubjects: publicProcedure
      .input(z.object({ bookId: z.number().int() }))
      .query(async ({ input }) => {
        return getSubjectsByBookId(input.bookId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          author: z.string().optional(),
          description: z.string().optional(),
          language: z.string().default("en"),
          coverUrl: z.string().url().optional(),
          subjects: z.string().optional(),
          formats: z.string().optional(),
          gutenbergId: z.number().int().optional(),
          genreId: z.number().int().optional(),
          educationalLevel: z.enum(["primary", "middle_school", "high_school", "college", "university", "professional", "general"]).optional(),
          source: z.enum(["gutenberg", "kicd", "knec", "doab", "open_textbook", "internet_archive", "open_library", "openstax", "libretexts", "wikibooks", "wikisource", "doaj", "pubmed", "ssrn", "saylor", "oer_commons", "mit_ocw", "ck12", "openlearn", "ajol", "easy_elimu", "atika_school", "kenyaplex", "schools_net", "cbc_resources", "teachers_updates", "merlot", "unesco", "worldbank", "google_books", "other"]).optional(),
          sourceUrl: z.string().optional(),
          isbn: z.string().optional(),
          pages: z.number().int().optional(),
          publisher: z.string().optional(),
          publishedDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return createBook(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          title: z.string().optional(),
          author: z.string().optional(),
          description: z.string().optional(),
          language: z.string().optional(),
          coverUrl: z.string().url().optional(),
          subjects: z.string().optional(),
          formats: z.string().optional(),
          genreId: z.number().int().optional(),
          educationalLevel: z.enum(["primary", "middle_school", "high_school", "college", "university", "professional", "general"]).optional(),
          downloadCount: z.number().int().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...updates } = input;
        return updateBook(id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return deleteBook(input.id);
      }),

    count: publicProcedure.query(async () => {
      return getBookCount();
    }),
  }),

  // Genres procedures
  genres: router({
    list: publicProcedure.query(async () => {
      return getGenres();
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getGenreBySlug(input.slug);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          slug: z.string().min(1).max(128),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return createGenre(input);
      }),
  }),

  // Subjects procedures
  subjects: router({
    list: publicProcedure.query(async () => {
      return getAllSubjects();
    }),
  }),

  // Bookshelf procedures
  bookshelf: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        return getUserBookshelf(ctx.user.id, input.limit, input.offset);
      }),

    add: protectedProcedure
      .input(z.object({ bookId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const isAlreadyAdded = await isBookInBookshelf(ctx.user.id, input.bookId);
        if (isAlreadyAdded) {
          throw new TRPCError({ code: "CONFLICT", message: "Book already in bookshelf" });
        }
        return addToBookshelf(ctx.user.id, input.bookId);
      }),

    remove: protectedProcedure
      .input(z.object({ bookId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        return removeFromBookshelf(ctx.user.id, input.bookId);
      }),

    isInBookshelf: protectedProcedure
      .input(z.object({ bookId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        return isBookInBookshelf(ctx.user.id, input.bookId);
      }),
  }),

  // Download history procedures
  downloads: router({
    history: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        return getUserDownloadHistory(ctx.user.id, input.limit, input.offset);
      }),

    record: protectedProcedure
      .input(
        z.object({
          bookId: z.number().int(),
          format: z.enum(["epub", "pdf", "txt", "html", "mobi"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return recordDownload(ctx.user.id, input.bookId, input.format);
      }),

    count: protectedProcedure.query(async ({ ctx }) => {
      return getUserDownloads(ctx.user.id);
    }),
  }),

  // Reading progress procedures
  reading: router({
    get: protectedProcedure
      .input(z.object({ bookId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        return getReadingProgress(ctx.user.id, input.bookId);
      }),

    all: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        return getAllReadingProgress(ctx.user.id, input.limit, input.offset);
      }),

    currentlyReading: protectedProcedure.query(async ({ ctx }) => {
      return getCurrentlyReading(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          bookId: z.number().int(),
          currentPage: z.number().int().optional(),
          totalPages: z.number().int().optional(),
          percentage: z.number().int().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateReadingProgress(ctx.user.id, input.bookId, {
          currentPage: input.currentPage,
          totalPages: input.totalPages,
          percentage: input.percentage,
        });
        return { success: true };
      }),
  }),

  // Recommendations procedures
  recommendations: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(12) }))
      .query(async ({ input, ctx }) => {
        return getRecommendationsForUser(ctx.user.id, input.limit);
      }),

    generate: protectedProcedure.mutation(async ({ ctx }) => {
      await generateRecommendations(ctx.user.id);
      return getRecommendationsForUser(ctx.user.id, 12);
    }),
  }),

  // Admin procedures
  admin: router({
    // Aggregator logs
    aggregatorLogs: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return getAggregatorLogs(input.limit, input.offset);
      }),

    // Trigger aggregator run
    runAggregator: protectedProcedure
      .input(
        z.object({
          sources: z.array(
            z.object({
              name: z.string(),
              slug: z.string(),
              enabled: z.boolean(),
            })
          ).optional(),
        }).optional()
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const requestedSources = input?.sources;
        const unsupportedSource = requestedSources?.find(source => source.enabled && !isApprovedSource(source.slug));
        if (unsupportedSource) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Source '${unsupportedSource.slug}' has not been approved for automated ingestion`,
          });
        }
        return runAggregator(requestedSources);
      }),

    createAggregatorLog: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "running", "success", "failed"]),
          booksAdded: z.number().int().optional(),
          booksUpdated: z.number().int().optional(),
          errorMessage: z.string().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return createAggregatorLog(input);
      }),

    updateAggregatorLog: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          status: z.enum(["pending", "running", "success", "failed"]).optional(),
          booksAdded: z.number().int().optional(),
          booksUpdated: z.number().int().optional(),
          errorMessage: z.string().optional(),
          completedAt: z.date().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...updates } = input;
        return updateAggregatorLog(id, updates);
      }),

    // Dashboard stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getDashboardStats();
    }),

    // User management
    users: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return getAllUsers(input.limit, input.offset);
      }),

    getUser: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return getUserById(input.id);
      }),

    updateUserRole: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          role: z.enum(["user", "admin"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return updateUserRole(input.id, input.role);
      }),

    userCount: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getUserCount();
    }),

    // Source management
    sources: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getAggregatorSources();
    }),

    updateSource: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          isActive: z.enum(["yes", "no"]).optional(),
          url: z.string().optional(),
          config: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const source = (await getAggregatorSources()).find(item => item.id === input.id);
        if (!source) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Catalog source not found" });
        }
        if (input.isActive === "yes" && !isApprovedSource(source.slug)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Source '${source.slug}' has not been approved for automated ingestion`,
          });
        }
        return updateAggregatorSource(input.id, input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
