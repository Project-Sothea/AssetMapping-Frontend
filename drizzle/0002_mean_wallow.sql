PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`failure_reason` text,
	`status` text NOT NULL,
	`last_synced_at` text,
	`last_failed_sync_at` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`state_province` text,
	`postal_code` text,
	`country` text,
	`description` text,
	`images` text
);
--> statement-breakpoint
INSERT INTO `__new_pins`("id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "lat", "lng", "type", "name", "address", "state_province", "postal_code", "country", "description", "images") SELECT "id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "lat", "lng", "type", "name", "address", "state_province", "postal_code", "country", "description", "images" FROM `pins`;--> statement-breakpoint
DROP TABLE `pins`;--> statement-breakpoint
ALTER TABLE `__new_pins` RENAME TO `pins`;--> statement-breakpoint
PRAGMA foreign_keys=ON;