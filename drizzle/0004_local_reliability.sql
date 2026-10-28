CREATE TABLE IF NOT EXISTS `sync_inflight` (
	`key` text PRIMARY KEY NOT NULL,
	`queueId` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`operation` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sync_queue` ADD `writeOrigin` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `queue_entity_status_idx` ON `sync_queue` (`entityType`,`entityId`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `queue_pending_order_idx` ON `sync_queue` (`status`,`sequenceNumber`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `forms_pin_id_idx` ON `forms` (`pinId`);
