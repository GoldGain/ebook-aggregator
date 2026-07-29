# Lumina Books - Ebook Aggregator TODO

## Design & Styling
- [x] Implement neon-noir aesthetic (midnight navy, hot pink, electric blue, cyan, magenta)
- [x] Create glowing headline effect (hot pink fill + electric blue outer glow)
- [x] Add vertical accent lines (cyan/magenta) as structural layout elements
- [x] Update global CSS variables and theme in index.css
- [x] Add Google Fonts for bold sans-serif headlines

## Database Schema & Backend
- [x] Design and create books table (title, author, language, subjects, cover_url, formats)
- [x] Design and create categories/genres table
- [x] Design and create user_bookshelves table (saved books)
- [x] Design and create download_history table
- [x] Design and create aggregator_logs table
- [x] Create database query helpers in server/db.ts
- [x] Create tRPC procedures for books, search, bookshelf, downloads, admin

## Homepage
- [x] Hero section with search bar
- [x] Featured books carousel
- [x] Genre categories section
- [x] Responsive layout with neon-noir styling

## Book Catalog Page
- [x] Grid view with book cards
- [x] List view toggle
- [x] Filtering by genre, language, subject
- [x] Pagination or infinite scroll
- [x] Sorting options (newest, most downloaded, alphabetical)
- [x] Responsive design

## Book Detail Page
- [x] Display book cover image
- [x] Show metadata (title, author, language, subjects)
- [x] Display description/synopsis
- [x] Download links (EPUB, PDF, plain text)
- [x] Add to bookshelf button
- [ ] Related books section

## Full-Text Search
- [x] Implement search across title, author, subject
- [ ] Instant search results with debouncing
- [ ] Search results page with filtering

## User Accounts & Bookshelf
- [x] User registration/login (via Manus OAuth)
- [x] Personal bookshelf page
- [x] Save/unsave books functionality
- [x] Download history tracking
- [ ] User profile page

## Admin Panel
- [x] Admin-only access control
- [x] Book catalog management (add/edit/delete)
- [ ] Manual aggregator trigger
- [x] View import logs
- [ ] Statistics dashboard

## Project Gutenberg Integration
- [x] On-demand ebook fetcher (paste book ID or URL)
- [x] Fetch book metadata from Gutenberg API
- [x] Store book data in database
- [x] Automated bulk aggregator (periodic crawling)
- [x] Heartbeat job for scheduled aggregation
- [x] Handle multiple formats (EPUB, PDF, plain text)

## Testing & Polish
- [ ] Write vitest tests for backend procedures
- [ ] Test search functionality
- [ ] Test bookshelf operations
- [ ] Test admin operations
- [ ] Mobile responsiveness check
- [ ] Performance optimization

## Deployment
- [ ] Create checkpoint
- [ ] Deploy to production
