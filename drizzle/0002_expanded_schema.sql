-- New tables for expanded ebook aggregator

CREATE TABLE `subjects` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
  CONSTRAINT `subjects_name_unique` UNIQUE(`name`),
  CONSTRAINT `subjects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint

CREATE INDEX `subjects_name_idx` ON `subjects` (`name`);
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `educationalLevel` enum('primary','middle_school','high_school','college','university','professional','general');
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `source` enum('gutenberg','kicd','knec','doab','open_textbook','ajol','unesco','worldbank','google_books','other') NOT NULL DEFAULT 'gutenberg';
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `sourceUrl` text;
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `isbn` varchar(20);
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `pages` int;
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `publisher` varchar(255);
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `publishedDate` varchar(50);
--> statement-breakpoint

ALTER TABLE `books` ADD COLUMN `rating` int;
--> statement-breakpoint

CREATE INDEX `books_title_idx` ON `books` (`title`);
--> statement-breakpoint

CREATE INDEX `books_author_idx` ON `books` (`author`);
--> statement-breakpoint

CREATE INDEX `books_language_idx` ON `books` (`language`);
--> statement-breakpoint

CREATE INDEX `books_genre_idx` ON `books` (`genreId`);
--> statement-breakpoint

CREATE INDEX `books_source_idx` ON `books` (`source`);
--> statement-breakpoint

CREATE TABLE `bookSubjects` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bookId` int NOT NULL,
  `subjectId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `bookSubjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE UNIQUE INDEX `book_subjects_unique` ON `bookSubjects` (`bookId`, `subjectId`);
--> statement-breakpoint

ALTER TABLE `bookshelves` ADD CONSTRAINT `bookshelves_user_book_unique` UNIQUE(`userId`, `bookId`);
--> statement-breakpoint

CREATE INDEX `download_history_user_idx` ON `downloadHistory` (`userId`);
--> statement-breakpoint

CREATE INDEX `download_history_book_idx` ON `downloadHistory` (`bookId`);
--> statement-breakpoint

CREATE TABLE `readingProgress` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `bookId` int NOT NULL,
  `currentPage` int DEFAULT 0,
  `totalPages` int,
  `percentage` int DEFAULT 0,
  `lastReadAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `readingProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE UNIQUE INDEX `reading_progress_user_book_unique` ON `readingProgress` (`userId`, `bookId`);
--> statement-breakpoint

CREATE INDEX `reading_progress_user_idx` ON `readingProgress` (`userId`);
--> statement-breakpoint

CREATE TABLE `recommendations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `bookId` int NOT NULL,
  `score` int DEFAULT 0,
  `reason` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `recommendations_user_idx` ON `recommendations` (`userId`);
--> statement-breakpoint

CREATE INDEX `recommendations_score_idx` ON `recommendations` (`score`);
--> statement-breakpoint

ALTER TABLE `aggregatorLogs` ADD COLUMN `source` varchar(50) DEFAULT 'gutenberg';
--> statement-breakpoint

CREATE INDEX `aggregator_logs_status_idx` ON `aggregatorLogs` (`status`);
--> statement-breakpoint

CREATE TABLE `aggregatorSources` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(128) NOT NULL,
  `slug` varchar(128) NOT NULL,
  `url` text,
  `isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
  `lastRunAt` timestamp,
  `booksFetched` int DEFAULT 0,
  `config` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `aggregatorSources_id` PRIMARY KEY(`id`),
  CONSTRAINT `aggregatorSources_name_unique` UNIQUE(`name`),
  CONSTRAINT `aggregatorSources_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint

ALTER TABLE `bookSubjects` ADD CONSTRAINT `bookSubjects_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `bookSubjects` ADD CONSTRAINT `bookSubjects_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `readingProgress` ADD CONSTRAINT `readingProgress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `readingProgress` ADD CONSTRAINT `readingProgress_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;
