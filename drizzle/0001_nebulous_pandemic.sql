CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`a` text NOT NULL,
	`b` text NOT NULL,
	`requested_by` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_friend_pair` ON `friendships` (`a`,`b`);--> statement-breakpoint
CREATE TABLE `social_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `players` ADD `account_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_player_account` ON `players` (`session_id`,`account_id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `invite_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invite_token` ON `sessions` (`invite_token`);