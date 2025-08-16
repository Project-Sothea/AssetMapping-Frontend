PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	`failure_reason` text,
	`status` text,
	`last_synced_at` text,
	`last_failed_sync_at` text,
	`pin_id` text,
	`village_id` text,
	`village` text,
	`brush_teeth` text,
	`can_attend` text,
	`cholesterol` text,
	`cholesterol_action` text,
	`cold_action` text,
	`cold_look_like` text,
	`condition_details` text,
	`diabetes` text,
	`diabetes_action` text,
	`diarrhoea` text,
	`diarrhoea_action` text,
	`eat_clean_food` text,
	`hand_after_toilet` text,
	`hand_before_meal` text,
	`have_toothbrush` text,
	`hypertension` text,
	`hypertension_action` text,
	`know_doctor` text,
	`know_water_filters` text,
	`long_term_conditions` text,
	`management_methods` text,
	`msk_action` text,
	`msk_injury` text,
	`not_using_water_filter` text,
	`other_brush_teeth` text,
	`other_buy_medicine` text,
	`other_condition` text,
	`other_learning` text,
	`other_management` text,
	`other_sick_action` text,
	`other_water_filter_reason` text,
	`other_water_source` text,
	`own_transport` text,
	`poverty_card` text,
	`unsafe_water` text,
	`water_sources` text,
	`what_do_when_sick` text,
	`where_buy_medicine` text
);
--> statement-breakpoint
INSERT INTO `__new_forms`("id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "pin_id", "village_id", "village", "brush_teeth", "can_attend", "cholesterol", "cholesterol_action", "cold_action", "cold_look_like", "condition_details", "diabetes", "diabetes_action", "diarrhoea", "diarrhoea_action", "eat_clean_food", "hand_after_toilet", "hand_before_meal", "have_toothbrush", "hypertension", "hypertension_action", "know_doctor", "know_water_filters", "long_term_conditions", "management_methods", "msk_action", "msk_injury", "not_using_water_filter", "other_brush_teeth", "other_buy_medicine", "other_condition", "other_learning", "other_management", "other_sick_action", "other_water_filter_reason", "other_water_source", "own_transport", "poverty_card", "unsafe_water", "water_sources", "what_do_when_sick", "where_buy_medicine") SELECT "id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "pin_id", "village_id", "village", "brush_teeth", "can_attend", "cholesterol", "cholesterol_action", "cold_action", "cold_look_like", "condition_details", "diabetes", "diabetes_action", "diarrhoea", "diarrhoea_action", "eat_clean_food", "hand_after_toilet", "hand_before_meal", "have_toothbrush", "hypertension", "hypertension_action", "know_doctor", "know_water_filters", "long_term_conditions", "management_methods", "msk_action", "msk_injury", "not_using_water_filter", "other_brush_teeth", "other_buy_medicine", "other_condition", "other_learning", "other_management", "other_sick_action", "other_water_filter_reason", "other_water_source", "own_transport", "poverty_card", "unsafe_water", "water_sources", "what_do_when_sick", "where_buy_medicine" FROM `forms`;--> statement-breakpoint
DROP TABLE `forms`;--> statement-breakpoint
ALTER TABLE `__new_forms` RENAME TO `forms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	`failure_reason` text,
	`status` text,
	`last_synced_at` text,
	`last_failed_sync_at` text,
	`lat` real,
	`lng` real,
	`type` text,
	`name` text,
	`address` text,
	`state_province` text,
	`postal_code` text,
	`description` text,
	`images` text,
	`local_images` text
);
--> statement-breakpoint
INSERT INTO `__new_pins`("id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "lat", "lng", "type", "name", "address", "state_province", "postal_code", "description", "images", "local_images") SELECT "id", "created_at", "updated_at", "deleted_at", "failure_reason", "status", "last_synced_at", "last_failed_sync_at", "lat", "lng", "type", "name", "address", "state_province", "postal_code", "description", "images", "local_images" FROM `pins`;--> statement-breakpoint
DROP TABLE `pins`;--> statement-breakpoint
ALTER TABLE `__new_pins` RENAME TO `pins`;