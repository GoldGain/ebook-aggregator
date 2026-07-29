# Lumina Books - Ebook Aggregator - Build Context

## Project Stack
- Vite + React + TypeScript + TailwindCSS + tRPC + Drizzle ORM + PostgreSQL (Supabase)
- Deployed on Vercel, repo at github.com/GoldGain/ebook-aggregator
- Supabase project: syohxjnbumfllsyqmexa (eu-west-3)

## What Was Done (Phases 1-3 in progress)

### Phase 2: Database (DONE)
- Added 23 new source enum values to `source` pgEnum in DB
- Added `search_vector` tsvector column with GIN index + trigger for auto-update
- Added pg_trgm extension + trigram indexes on title and author
- Seeded 49 aggregator sources (all 50+ sources from brief)
- Seeded 20 default genres

### Phase 3: Backend (IN PROGRESS)
- Created `/server/sources/multi-source.ts` with connectors for:
  Internet Archive, Open Library, OpenStax, LibreTexts, Wikibooks, Wikisource,
  DOAJ, PubMed, Saylor, OER Commons, MIT OCW, CK-12, OpenLearn,
  Easy Elimu, Atika School, KenyaPlex, Schools Net Kenya, CBC Resources, Teachers Updates
- Rewrote `/server/sources/aggregator.ts` to include all 50+ sources
- Rewrote `/server/sources/ajol.ts` with OAI-PMH integration
- Updated `drizzle/schema.ts` sourceEnum to include all new sources
- Updated `server/db.ts` searchBooks to use PostgreSQL FTS (tsvector) with ILIKE fallback

### Still TODO in Phase 3:
- Update `server/routers.ts` books.search to support genre/language/subject filters + autocomplete
- Add `books.autocomplete` procedure for instant search suggestions
- Add `books.getSimilar` procedure for related books on book detail page
- Update `books.create` source enum in routers.ts to include all new sources

### Phase 4: Frontend (TODO)
- Enhanced Home page: hero, featured carousel, categories grid, new arrivals, popular, testimonials
- Enhanced Search page: instant search with debounce, filters sidebar (genre/level/subject/language), sort
- Enhanced Book Detail: related books, share buttons, source badge
- Enhanced Admin panel: stats dashboard, source management with enable/disable, aggregator trigger
- User Dashboard: profile, reading progress, recommendations

### Phase 5: Deploy (TODO)
- Push to GitHub
- Deploy to Vercel
- Test live site

## Key File Locations
- Schema: /home/ubuntu/ebook-aggregator/drizzle/schema.ts
- DB helpers: /home/ubuntu/ebook-aggregator/server/db.ts
- tRPC routers: /home/ubuntu/ebook-aggregator/server/routers.ts
- Aggregator: /home/ubuntu/ebook-aggregator/server/sources/aggregator.ts
- Multi-source connectors: /home/ubuntu/ebook-aggregator/server/sources/multi-source.ts
- Pages: /home/ubuntu/ebook-aggregator/client/src/pages/
- Components: /home/ubuntu/ebook-aggregator/client/src/components/

## Key tRPC Procedures (existing)
- books.list, books.recent, books.popular, books.byEducationalLevel, books.bySource
- books.getById, books.search, books.byGenre, books.byLanguage, books.getSubjects
- books.create, books.update, books.delete, books.count
- genres.list, genres.getBySlug, genres.create
- subjects.list
- bookshelf.list, bookshelf.add, bookshelf.remove, bookshelf.isInBookshelf
- downloads.history, downloads.record, downloads.count
- reading.get, reading.all, reading.currentlyReading, reading.update
- recommendations.list, recommendations.generate
- admin.aggregatorLogs, admin.runAggregator, admin.stats, admin.users, admin.sources, admin.updateSource
- auth.me, auth.logout
- import.gutenberg
