# Implementation state (improve-safe-catalog branch)

Working dir: /home/ubuntu/ebook-aggregator (git branch: improve-safe-catalog, main untouched). User asked for safe changes, no Supabase harm; all edits reversible via branch/PR.

## Done
- server/db.ts: extracted buildSearchCondition (matches title/author/subjects/description/publisher/isbn/publishedDate), added countBooks({genre?,language?,educationalLevel?,source?,search?}). Typecheck passes.
- server/sources/external-search.ts: NEW approved external search module with searchInternetArchive, searchGutenberg (gutendex), searchOpenStax, runExternalSearch; each result carries rightsStatus/licenseName/licenseUrl/directDownloadAllowed from policy.ts.

## USER DIRECTIVE (important)
User: "Don't restrict downloads, you'll be destroying my code by doing that." -> DO NOT modify /api/download, DownloadButton.tsx, or BookDetail download CTA. Leave all download logic untouched.

## Next (revised)
1. api/server.ts: ONLY replace the /api/search handler (line 440-641). New implementation: local catalog search via listBooks+buildSearchCondition+countBooks (already in db.ts), optionally enriched with approved external search results (internet_archive, gutenberg, openstax) from external-search.ts. Keep /api/download, /api/libgen, /api/check-url, /api/kicd, /api/scheduled/aggregator, /api/trpc ALL exactly as they are. /api/search must keep returning {success:true,query,total,books[]} so the frontend keeps working.
2. server/db.ts: countBooks + buildSearchCondition already done. Consider improving full-text search language config (check searchBooks implementation — currently uses 'english' ts_config which may drop Kiswahili tokens; keep simple configuration as-is if it already does).
3. client Search.tsx: use total counts for pagination, accurate empty state, better mobile filter UX. DownloadButton usage stays unchanged.
4. client BookDetail.tsx: minor polish only (license display, provenance), do not change download button behavior.
5. Validate via pnpm check, local build, curl tests. Deploy via git push (Vercel connected). Then give user Pro upgrade steps: https://manus.im/settings/billing or ask via /help (support goes to help.manus.im).

## Key facts
- Supabase project id: syohxjnbumfllsyqmexa. Catalog ~5,700 approved rows: open_library 2212, internet_archive 1880, gutenberg 1241, teacher_co_ke 328, kicd 174, openstax 105, other 75, knec 51, doab 33, mit_ocw 3.
- Live search endpoint returns /api/search with {success,query,total,sources:{local,libgen,annas_archive,kicd,knec},books[]}.
- Books schema has directDownloadAllowed boolean, rightsStatus enum, licenseName/licenseUrl, formats JSON text, sourceUrl.
- policy.ts exports getSourceRightsPolicy(slug), isApprovedSource(slug). teacher_co_ke NOT in policy; existing teacher_co_ke rows have rightsStatus open_access, directDownloadAllowed true - treat as authorized via stored flags.
- /api/download currently accepts GET ?md5/url/format or POST body md5/url/format. DownloadButton does POST /api/download {md5} then GET /api/download?url=..., plus a second /api/search pass.
- DownloadButton props: md5, title, format="pdf", url, query, onSuccess. BookDetail calls with md5=null, url=pdfUrl, query=book.title.
- Vercel project: ebook-aggregator.vercel.app; git repo cloned via gh from user's GitHub.
- pnpm install done (frozen lockfile). pnpm check passes. pnpm test fails at test collection due to supabaseAuth env; add SUPABASE_URL/ANON_KEY env stubs to .env.test or skip for now.
