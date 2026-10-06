CREATE TABLE `post_state` (
	`owner_id` text NOT NULL,
	`media_id` text NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	`saved` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `media_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile_cache` (
	`owner_id` text NOT NULL,
	`user_id` text NOT NULL,
	`json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `user_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `story_tray` (
	`owner_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	`latest_reel_media` integer,
	`seen` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `user_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `following` ADD `avatar_refreshed_at` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `interactions_enabled` integer DEFAULT false NOT NULL;