ALTER TABLE `completed_checklists` ADD `syncId` varchar(100);--> statement-breakpoint
ALTER TABLE `completed_checklists` ADD CONSTRAINT `completed_checklists_syncId_unique` UNIQUE(`syncId`);