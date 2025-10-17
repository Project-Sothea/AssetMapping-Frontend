ALTER TABLE `pins` RENAME COLUMN "state_province" TO "city/village";--> statement-breakpoint
ALTER TABLE `pins` DROP COLUMN `postal_code`;