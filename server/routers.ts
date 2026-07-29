import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getBooks,
  getBookById,
  getBookByGutenbergId,
  searchBooks,
  getBooksByGenre,
  getBooksByLanguage,
  createBook,
  updateBook,
  getGenres,
  getGenreBySlug,
  createGenre,
  getUserBookshelf,
  addToBookshelf,
  removeFromBookshelf,
  isBookInBookshelf,
  getUserDownloadHistory,
  recordDownload,
  getAggregatorLogs,
  createAggregatorLog,
  updateAggregatorLog,
} from "./db";
import { TRPCError } from "@trpc/server";
import { importGutenbergBook } from "./import";

export const appRouter = router({
    system: systemRouter,
    
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
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Books procedures
  books: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return getBooks(input.limit, input.offset);
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
          query: z.string().min(1).max(200),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return searchBooks(input.query, input.limit, input.offset);
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...updates } = input;
        return updateBook(id, updates);
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
          format: z.enum(["epub", "pdf", "txt", "html"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return recordDownload(ctx.user.id, input.bookId, input.format);
      }),
  }),

  // Admin procedures
  admin: router({
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

    createAggregatorLog: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "running", "success", "failed"]),
          booksAdded: z.number().int().optional(),
          booksUpdated: z.number().int().optional(),
          errorMessage: z.string().optional(),
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...updates } = input;
        return updateAggregatorLog(id, updates);
      }),
  }),
});

export type AppRouter = typeof appRouter;
