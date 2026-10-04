CREATE TABLE `dm_messages` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`text` text,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dm_thread` ON `dm_messages` (`owner_id`,`thread_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `dm_threads` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`last_activity_at` integer NOT NULL,
	`unread` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `ig_sessions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`ig_user_id` text NOT NULL,
	`cipher` text NOT NULL,
	`iv` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mutuals` (
	`owner_id` text NOT NULL,
	`ig_user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	PRIMARY KEY(`owner_id`, `ig_user_id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_username` text NOT NULL,
	`caption` text,
	`taken_at` integer NOT NULL,
	`media_json` text NOT NULL,
	`seen` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `posts_feed` ON `posts` (`owner_id`,`taken_at`);--> statement-breakpoint
CREATE TABLE `saved` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`author_username` text NOT NULL,
	`caption` text,
	`media_json` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`total` integer NOT NULL,
	`completed` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`last_refresh_at` integer,
	`mutuals_refreshed_at` integer
);
