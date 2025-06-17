PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_labeled_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`label_ids` text NOT NULL,
	`labeled_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_labeled_emails`("id", "message_id", "label_ids", "labeled_at") SELECT "id", "message_id", "label_ids", "labeled_at" FROM `labeled_emails`;--> statement-breakpoint
DROP TABLE `labeled_emails`;--> statement-breakpoint
ALTER TABLE `__new_labeled_emails` RENAME TO `labeled_emails`;--> statement-breakpoint
PRAGMA foreign_keys=ON;