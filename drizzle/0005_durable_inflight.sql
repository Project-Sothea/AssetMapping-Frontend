CREATE TABLE `sync_inflight` (
	`key` text PRIMARY KEY NOT NULL,
	`queueId` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`operation` text NOT NULL,
	`status` text NOT NULL
);
