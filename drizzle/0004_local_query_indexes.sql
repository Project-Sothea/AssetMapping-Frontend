CREATE INDEX `forms_pin_id_idx` ON `forms` (`pinId`);--> statement-breakpoint
CREATE INDEX `queue_entity_status_idx` ON `sync_queue` (`entityType`,`entityId`,`status`);--> statement-breakpoint
CREATE INDEX `queue_pending_order_idx` ON `sync_queue` (`status`,`sequenceNumber`);