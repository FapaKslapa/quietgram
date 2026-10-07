ALTER TABLE `ig_sessions` ADD `source` text DEFAULT 'extension' NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_state` ADD `fast_backoff_until` integer;