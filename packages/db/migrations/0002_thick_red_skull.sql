CREATE TABLE `feed_exceptions` (
	`owner_id` text NOT NULL,
	`ig_user_id` text NOT NULL,
	PRIMARY KEY(`owner_id`, `ig_user_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `following` (
	`owner_id` text NOT NULL,
	`ig_user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	`follower_count` integer,
	`is_verified` integer DEFAULT false NOT NULL,
	`is_business` integer DEFAULT false NOT NULL,
	`counts_refreshed_at` integer,
	PRIMARY KEY(`owner_id`, `ig_user_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`feed_mode` text DEFAULT 'friends' NOT NULL,
	`creator_threshold` integer DEFAULT 10000 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `sync_runs` ADD `kind` text DEFAULT 'refresh' NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_runs` ADD `state` text;