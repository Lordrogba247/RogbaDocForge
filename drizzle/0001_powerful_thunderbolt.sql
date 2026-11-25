CREATE TABLE `brandKits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`logoUrl` text,
	`primaryColor` varchar(16) DEFAULT '#6d28d9',
	`headingColor` varchar(16) DEFAULT '#1e1b4b',
	`font` varchar(64) DEFAULT 'Calibri',
	`watermark` varchar(128) DEFAULT '',
	`signatureName` varchar(128) DEFAULT '',
	`signatureTitle` varchar(128) DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandKits_id` PRIMARY KEY(`id`),
	CONSTRAINT `brandKits_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `customTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`optionsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `docVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`docKey` varchar(128) NOT NULL DEFAULT 'main',
	`text` text NOT NULL,
	`label` varchar(128) DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `docVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversions` MODIFY COLUMN `format` varchar(16) NOT NULL;