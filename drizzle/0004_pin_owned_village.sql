CREATE TABLE `form_village_archive` (
	`formId` text PRIMARY KEY NOT NULL,
	`village` text,
	`otherVillage` text,
	`pinVillage` text
);
--> statement-breakpoint
INSERT INTO "form_village_archive" ("formId", "village", "otherVillage", "pinVillage")
SELECT f."id", f."village", f."otherVillage", p."cityVillage"
FROM "forms" f LEFT JOIN "pins" p ON p."id" = f."pinId";--> statement-breakpoint
ALTER TABLE `forms` DROP COLUMN `village`;--> statement-breakpoint
ALTER TABLE `forms` DROP COLUMN `otherVillage`;