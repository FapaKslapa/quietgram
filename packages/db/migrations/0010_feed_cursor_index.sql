DROP INDEX `posts_feed`;--> statement-breakpoint
CREATE INDEX `posts_feed` ON `posts` (`owner_id`,`taken_at`,`id`);