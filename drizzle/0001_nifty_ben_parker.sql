CREATE TABLE `aggregatorLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('pending','running','success','failed') NOT NULL DEFAULT 'pending',
	`booksAdded` int DEFAULT 0,
	`booksUpdated` int DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `aggregatorLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gutenbergId` int,
	`title` varchar(255) NOT NULL,
	`author` varchar(255),
	`description` text,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`coverUrl` text,
	`subjects` text,
	`formats` text,
	`downloadCount` int DEFAULT 0,
	`genreId` int,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`),
	CONSTRAINT `books_gutenbergId_unique` UNIQUE(`gutenbergId`)
);
--> statement-breakpoint
CREATE TABLE `bookshelves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookshelves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloadHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`format` varchar(50) NOT NULL,
	`downloadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downloadHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `genres_name_unique` UNIQUE(`name`),
	CONSTRAINT `genres_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_genreId_genres_id_fk` FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookshelves` ADD CONSTRAINT `bookshelves_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookshelves` ADD CONSTRAINT `bookshelves_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloadHistory` ADD CONSTRAINT `downloadHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloadHistory` ADD CONSTRAINT `downloadHistory_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;