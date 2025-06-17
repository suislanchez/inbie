CREATE TABLE `labeled_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`gmail_id` text NOT NULL,
	`user_id` text NOT NULL,
	`labels` text NOT NULL,
	`labeled_at` integer NOT NULL,
	`confidence` text,
	`reasoning` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labeled_emails_user_gmail_idx` ON `labeled_emails` (`user_id`,`gmail_id`);