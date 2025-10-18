CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`operation` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`last_error` text,
	`last_attempt_at` text,
	`sequence_number` integer NOT NULL,
	`depends_on` text,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_queue_idempotency_key_unique` ON `sync_queue` (`idempotency_key`);