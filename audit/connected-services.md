# Connected services audit

Date: 2026-08-08

## Supabase

Project: `syohxjnbumfllsyqmexa` (active/healthy; region `eu-west-3`; PostgreSQL 17).

The public schema contains 14 tables, including `books` (6,102 rows), `genres` (32), `subjects` (112), `bookSubjects` (157), `users` (2), `downloadHistory` (73), `aggregatorSources` (49), and related user/catalog tables. The `books` table has `search_vector`, `coverUrl`, `formats`, `source`, `sourceUrl`, `md5`, `rightsStatus`, `licenseName`, `licenseUrl`, and `directDownloadAllowed` fields.

Critical security finding: RLS is disabled on all 14 public tables, including `books`, user records, bookshelf/history tables, and aggregator configuration/logs. The Supabase advisory states that these tables are exposed to anon/authenticated client roles. Do not enable RLS blindly because policies are not yet defined; present the remediation SQL and policy design to the user before applying it.

## Vercel

Project: `ebook-aggregator`, project ID `prj_hVXSguxcYjQHQuTClkABiuRM9o9a`, team `team_hxUpiTU3c8DwOJJprzIRSxvG`.

The current latest READY production deployment is `dpl_EXnfqfSvgKjMEZTY9uzBGb3i2fYu`, associated with GitHub commit `ccebba501c791d482f35314fe3913ace73303697` and commit message `Fix query parsing for search and catalog links`.

The previous READY deployment is `dpl_6Goy3p5bAzJbsANW9qkR6QpYBdrw`, associated with commit `906f956f5dd425cbb46f5c8d4bc5d3168c5dcfff` and message `Fix unified ebook search and download displays`.

Several recent deployments show a history of search/download patches. A deployment from commit `181c741722b1b8050c34b924999520007b5df4e1` was once READY with message `Hide source completely from frontend UI - clean user experience`; a newer deployment from `cceb...` is now the latest production state. This likely explains why the live UI and current repository can differ.

The repository is public and the GitHub/Vercel/Supabase credentials pasted in the user-provided brief are intentionally not recorded here.

## Search reproduction

The live request `GET /api/search?q=Chozi%20la%20Heri&limit=20` returned HTTP 200 with `total: 0`; the response reported zero results from local, LibGen, Anna's Archive, KICD, and KNEC. A Supabase query found no catalog row containing `chozi` in title or author.

Catalog distribution from Supabase: Open Library has 2,212 records split between `directDownloadAllowed=true` (1,967) and false (245); Internet Archive has 1,880 authorized records; Project Gutenberg has 1,241 public-domain records; `teacher_co_ke` has 328 records; KICD 174; OpenStax 105; KNEC 51; DOAB 33; MIT OCW 3; and `other` has 75 metadata-only records. The live endpoint is still attempting unapproved LibGen/Anna’s Archive sources despite the database policy and does not search the approved local catalog effectively for this Kiswahili title.
