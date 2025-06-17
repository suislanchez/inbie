CREATE TABLE `labeled_emails` (
	`id` integer PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`label_ids` text NOT NULL,
	`labeled_at` integer NOT NULL
);
