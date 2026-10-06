ALTER TABLE `user_settings` ADD `grayscale_media` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `session_budget_minutes` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `budget_locked_until` integer;