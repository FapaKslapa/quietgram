CREATE TABLE `dm_sync_marks` (
	`owner_id` text NOT NULL,
	`scope` text NOT NULL,
	`synced_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `scope`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `dm_messages` ADD `kind` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `shortcode` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `product_type` text;--> statement-breakpoint
ALTER TABLE `saved` ADD `shortcode` text;--> statement-breakpoint
ALTER TABLE `saved` ADD `product_type` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `dm_send_enabled` integer DEFAULT false NOT NULL;