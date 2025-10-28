ALTER TABLE `forms` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `forms` ADD `name` text;--> statement-breakpoint
ALTER TABLE `pins` ADD `version` integer DEFAULT 1 NOT NULL;