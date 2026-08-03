CREATE TABLE `checklist_pdfs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`s3Url` varchar(512) NOT NULL,
	`mimeType` varchar(50) NOT NULL DEFAULT 'application/pdf',
	`uploadStatus` enum('pending','uploaded','failed') NOT NULL DEFAULT 'pending',
	`uploadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklist_pdfs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`checklistId` int NOT NULL,
	`action` enum('create','update','delete','download') NOT NULL,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD `pdfUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD `deviceId` varchar(100);--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD `syncStatus` enum('pending','synced','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD `syncedAt` timestamp;