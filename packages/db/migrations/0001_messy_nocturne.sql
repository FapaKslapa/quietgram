CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `pairing_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`created_at` integer,
	`aaguid` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passkey_userId_idx` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE INDEX `passkey_credentialID_idx` ON `passkey` (`credential_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_dm_messages` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`text` text,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_dm_messages`("id", "owner_id", "thread_id", "sender_id", "text", "sent_at") SELECT "id", "owner_id", "thread_id", "sender_id", "text", "sent_at" FROM `dm_messages`;--> statement-breakpoint
DROP TABLE `dm_messages`;--> statement-breakpoint
ALTER TABLE `__new_dm_messages` RENAME TO `dm_messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `dm_thread` ON `dm_messages` (`owner_id`,`thread_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `__new_dm_threads` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`last_activity_at` integer NOT NULL,
	`unread` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_dm_threads`("id", "owner_id", "title", "last_activity_at", "unread") SELECT "id", "owner_id", "title", "last_activity_at", "unread" FROM `dm_threads`;--> statement-breakpoint
DROP TABLE `dm_threads`;--> statement-breakpoint
ALTER TABLE `__new_dm_threads` RENAME TO `dm_threads`;--> statement-breakpoint
CREATE TABLE `__new_ig_sessions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`ig_user_id` text NOT NULL,
	`cipher` text NOT NULL,
	`iv` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ig_sessions`("owner_id", "ig_user_id", "cipher", "iv", "status", "updated_at") SELECT "owner_id", "ig_user_id", "cipher", "iv", "status", "updated_at" FROM `ig_sessions`;--> statement-breakpoint
DROP TABLE `ig_sessions`;--> statement-breakpoint
ALTER TABLE `__new_ig_sessions` RENAME TO `ig_sessions`;--> statement-breakpoint
CREATE TABLE `__new_mutuals` (
	`owner_id` text NOT NULL,
	`ig_user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	PRIMARY KEY(`owner_id`, `ig_user_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_mutuals`("owner_id", "ig_user_id", "username", "avatar_url") SELECT "owner_id", "ig_user_id", "username", "avatar_url" FROM `mutuals`;--> statement-breakpoint
DROP TABLE `mutuals`;--> statement-breakpoint
ALTER TABLE `__new_mutuals` RENAME TO `mutuals`;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_username` text NOT NULL,
	`caption` text,
	`taken_at` integer NOT NULL,
	`media_json` text NOT NULL,
	`seen` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "owner_id", "author_id", "author_username", "caption", "taken_at", "media_json", "seen") SELECT "id", "owner_id", "author_id", "author_username", "caption", "taken_at", "media_json", "seen" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
CREATE INDEX `posts_feed` ON `posts` (`owner_id`,`taken_at`);--> statement-breakpoint
CREATE TABLE `__new_saved` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`author_username` text NOT NULL,
	`caption` text,
	`media_json` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_saved`("id", "owner_id", "author_username", "caption", "media_json", "position") SELECT "id", "owner_id", "author_username", "caption", "media_json", "position" FROM `saved`;--> statement-breakpoint
DROP TABLE `saved`;--> statement-breakpoint
ALTER TABLE `__new_saved` RENAME TO `saved`;--> statement-breakpoint
CREATE TABLE `__new_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`total` integer NOT NULL,
	`completed` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sync_runs`("id", "owner_id", "started_at", "finished_at", "status", "total", "completed") SELECT "id", "owner_id", "started_at", "finished_at", "status", "total", "completed" FROM `sync_runs`;--> statement-breakpoint
DROP TABLE `sync_runs`;--> statement-breakpoint
ALTER TABLE `__new_sync_runs` RENAME TO `sync_runs`;--> statement-breakpoint
CREATE TABLE `__new_sync_state` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`last_refresh_at` integer,
	`mutuals_refreshed_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sync_state`("owner_id", "last_refresh_at", "mutuals_refreshed_at") SELECT "owner_id", "last_refresh_at", "mutuals_refreshed_at" FROM `sync_state`;--> statement-breakpoint
DROP TABLE `sync_state`;--> statement-breakpoint
ALTER TABLE `__new_sync_state` RENAME TO `sync_state`;