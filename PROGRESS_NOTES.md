# Fix Progress Notes

## Credentials
- GitHub Repo: https://github.com/GoldGain/ebook-aggregator.git
- Vercel Live: https://ebook-aggregator.vercel.app
- Supabase URL: https://syohxjnbumfllsyqmexa.supabase.co

## Files Modified So Far

### 1. client/src/components/DownloadButton.tsx
- FIXED: Always shows "Download PDF" (removed "Search & Download" label)
- Added `language` prop that is passed to /api/download

### 2. client/src/components/LibGenResults.tsx
- FIXED: Books are now clickable — clicking opens a BookDetailsModal
- Modal shows: title, author, year, publisher, pages, filesize, language, MD5, download button, mirrors
- Download button passes language to /api/download

### 3. client/src/pages/Search.tsx
- FIXED: BookCard now shows cursor-pointer for all clickable books
- DownloadButton now receives author, bookId, language props

### 4. client/src/pages/BookDetail.tsx
- FIXED: Added fetchFallbackCover() function (Open Library + Google Books)
- Cover image now uses resolvedCover state with fallback
- DownloadButton now passes language and md5 (extracted from formats.pdf if it starts with 'md5:')

### 5. api/download.ts (standalone Vercel function - NOT the main one)
- REWRITTEN: Full language detection, language filtering, download chain
- Priority: Anna's Archive → Internet Archive → Open Library → LibGen via Anna's Archive
- Language verification on MD5 pages before downloading
- fetchCoverUrl() function added

### 6. api/server.ts (MAIN download handler used in production)
- ADDED: Language helpers (LANG_MAP_SERVER, normalizeLang, langsMatch, extractLangFromHtml)
- ADDED: fetchBookCover() function
- ADDED: searchAnnasForMd5() function - searches Anna's Archive by title+language
- UPDATED: /api/download handler now accepts title, author, language, bookId, isbn
- ADDED: If no MD5, searches Anna's Archive for correct MD5 based on title+language
- ADDED: Language verification before downloading (checks Anna's Archive MD5 page)

## Remaining Tasks
- [ ] Test 8 books
- [ ] Deploy to GitHub and Vercel

## Test Books
1. Siku Njema - Ken Walibora - Swahili
2. Chozi la Heri - Assumpta Matei - Swahili
3. Kidagaa Kimemwozea - Ken Walibora - Swahili
4. Tumbo Lisiloshiba - Robert P. Tonui - Swahili
5. The 48 Laws of Power - Robert Greene - English
6. The Art of War - Sun Tzu - English
7. Psychology of Money - Morgan Housel - English
8. Any other book
