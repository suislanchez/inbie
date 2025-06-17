import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"

export const labeledEmails = sqliteTable(
	"labeled_emails",
	{
		id: text("id").primaryKey(),
		gmailId: text("gmail_id").notNull(), // Gmail message ID
		userId: text("user_id").notNull(), // User who owns the email
		labels: text("labels").notNull(), // JSON array of applied labels
		labeledAt: integer("labeled_at", { mode: "timestamp" }).notNull(),
		confidence: text("confidence"), // AI confidence score
		reasoning: text("reasoning"), // AI reasoning for the labels
	},
	(table) => {
		return {
			userGmailIdx: uniqueIndex("labeled_emails_user_gmail_idx").on(table.userId, table.gmailId),
		}
	}
) 