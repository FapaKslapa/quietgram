ALTER TABLE `following` ADD `last_post_at` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `recency_days` integer DEFAULT 14 NOT NULL;