CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entries_session` ON `entries` (`session_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`is_self` integer NOT NULL,
	`cashout` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_players_session` ON `players` (`session_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`venue` text NOT NULL,
	`game` text NOT NULL,
	`stakes` text NOT NULL,
	`notes` text NOT NULL,
	`currency` text NOT NULL,
	`start` text NOT NULL,
	`end` text,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`last_write` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `profiles`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_owner_start` ON `sessions` (`owner`,`start`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_one_active` ON `sessions` (`owner`) WHERE "sessions"."status" = 'active';