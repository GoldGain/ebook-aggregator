# Implementation Notes

## Current State
- Home.tsx exists and is functional but needs enhancement
- All pages (Catalog, BookDetail, Bookshelf, Admin, Search, DownloadHistory, Import) exist
- CSS (index.css) has neon-noir theme with all utility classes
- Auth uses startLogin from const.ts
- trpc client is at @/lib/trpc
- wouter for routing (useLocation)

## Files to Rewrite/Update
1. Home.tsx - Enhanced with multi-source, educational levels, sources section
2. Catalog.tsx - Add advanced filters (level, source, educational level)
3. BookDetail.tsx - Add reading progress, recommendations section, source badge
4. Bookshelf.tsx - Show book details, add reading progress display
5. Admin.tsx - Dashboard stats, user management, source management, real aggregator trigger
6. App.tsx - Add recommendations route

## Key tRPC procedures available
- books.list with filters: genre, language, educationalLevel, source, search, sort
- books.recent, books.popular, books.byEducationalLevel, books.bySource
- books.getSubjects, books.count
- subjects.list
- reading.get, reading.all, reading.currentlyReading, reading.update
- recommendations.list, recommendations.generate
- admin.stats, admin.users, admin.getUser, admin.updateUserRole, admin.sources, admin.updateSource, admin.runAggregator
- downloads.count
- auth.logout (mutation)

## Auth
- useAuth hook from @/_core/hooks/useAuth
- startLogin from @/const
- trpc.auth.logout.useMutation for logout
