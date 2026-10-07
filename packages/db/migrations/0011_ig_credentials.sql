CREATE TABLE `ig_credentials` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`cipher` text NOT NULL,
	`iv` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`last_attempt_at` integer,
	`window_started_at` integer,
	`window_attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
