# Zamifu E-Materials diagnosis

## Reproduced behavior

The live `GET /api/search?q=Chozi%20la%20Heri&limit=20` endpoint returned HTTP 200 with `total: 0`, including zero results from local, LibGen, Anna's Archive, KICD, and KNEC. Supabase contains no title or author containing `chozi`, so an approved-catalog-only search cannot return that title until a rights-cleared record is ingested.

## Findings

1. `api/server.ts` still scrapes LibGen and Anna's Archive in `/api/libgen` and `/api/search` and uses `/api/download` to probe Anna's Archive, Library.lol, and LibGen mirrors by MD5 or arbitrary URL. This conflicts with `server/sources/policy.ts`, which only approves public-domain, open-access, or discovery-only providers.
2. `client/src/components/DownloadButton.tsx` retries by MD5, arbitrary URL, and a second `/api/search` call, and `BookDetail.tsx` falls back to `sourceUrl` while rendering a download CTA even when `directDownloadAllowed` is false or `rightsStatus` is metadata-only.
3. `server/db.ts` uses English full-text search and only falls back to a single substring ILIKE query. It does not normalize language codes (`eng`/`en`, etc.) or match all searchable fields consistently. The live catalog has no Swahili records and 2,212 Open Library records are metadata-only/discovery records.
4. The frontend claims “millions of free ebooks from 50+ open-access sources” but the connected catalog has 5,? records in the audited source groups and only some have authorized direct files. Search counts are page counts, not totals.
5. The baseline type-check passes after installing the lockfile dependencies. The baseline test suite fails before collecting tests because `server/supabaseAuth.ts` constructs a Supabase client without test environment variables.
6. Supabase audit found row-level security disabled on `public.books`, `public.genres`, `public.subjects`, and `public.aggregatorSources`. This is a security gate to present to the user; no RLS change should be applied without explicit approval.

## Safe implementation boundary

Remove all unapproved-source scraping and MD5/mirror fallback behavior. Make `/api/search` query the local catalog and, where needed, only approved query-aware providers using the normalized rights fields. Make `/api/download` accept only catalog book IDs and formats where `directDownloadAllowed=true`, validate the stored URL against an approved source policy, and fail closed for metadata-only records. Preserve provenance and license links in the detail view; do not disguise source identity or access terms.
