import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { labeledEmails } from "../db/schema/labeled-emails";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// Schema for checking labeled emails
const checkLabeledSchema = z.object({
	gmailIds: z.array(z.string()),
	userId: z.string(),
});

// Schema for storing labeled email
const storeLabeledSchema = z.object({
	gmailId: z.string(),
	userId: z.string(),
	labels: z.array(z.string()),
	confidence: z.string().optional(),
	reasoning: z.string().optional(),
});

// Check which emails have already been labeled
app.post("/check-labeled", async (c) => {
	try {
		const body = await c.req.json();
		const { gmailIds, userId } = checkLabeledSchema.parse(body);

		// Query database for already labeled emails
		const labeled = await db
			.select({
				gmailId: labeledEmails.gmailId,
				labels: labeledEmails.labels,
				labeledAt: labeledEmails.labeledAt,
				confidence: labeledEmails.confidence,
			})
			.from(labeledEmails)
			.where(
				and(
					eq(labeledEmails.userId, userId),
					inArray(labeledEmails.gmailId, gmailIds)
				)
			);

		// Create a map for easy lookup
		const labeledMap = new Map(
			labeled.map(item => [
				item.gmailId,
				{
					labels: JSON.parse(item.labels),
					labeledAt: item.labeledAt,
					confidence: item.confidence,
				}
			])
		);

		// Determine which emails are already labeled vs need labeling
		const alreadyLabeled = gmailIds.filter(id => labeledMap.has(id));
		const needsLabeling = gmailIds.filter(id => !labeledMap.has(id));

		return c.json({
			success: true,
			alreadyLabeled,
			needsLabeling,
			labeledDetails: Object.fromEntries(labeledMap),
		});
	} catch (error) {
		console.error("Error checking labeled emails:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

// Store a newly labeled email
app.post("/store-labeled", async (c) => {
	try {
		const body = await c.req.json();
		const { gmailId, userId, labels, confidence, reasoning } = storeLabeledSchema.parse(body);

		// Check if this email is already labeled for this user
		const existing = await db
			.select()
			.from(labeledEmails)
			.where(
				and(
					eq(labeledEmails.gmailId, gmailId),
					eq(labeledEmails.userId, userId)
				)
			)
			.limit(1);

		if (existing.length > 0) {
			// Update existing record
			await db
				.update(labeledEmails)
				.set({
					labels: JSON.stringify(labels),
					confidence,
					reasoning,
					labeledAt: Math.floor(Date.now() / 1000), // SQLite timestamp
				})
				.where(
					and(
						eq(labeledEmails.gmailId, gmailId),
						eq(labeledEmails.userId, userId)
					)
				);

			return c.json({
				success: true,
				action: "updated",
				gmailId,
			});
		} else {
			// Insert new record
			await db.insert(labeledEmails).values({
				id: nanoid(),
				gmailId,
				userId,
				labels: JSON.stringify(labels),
				labeledAt: Math.floor(Date.now() / 1000), // SQLite timestamp
				confidence,
				reasoning,
			});

			return c.json({
				success: true,
				action: "created",
				gmailId,
			});
		}
	} catch (error) {
		console.error("Error storing labeled email:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

// Get labeling history for a user
app.get("/history/:userId", async (c) => {
	try {
		const userId = c.req.param("userId");
		
		const history = await db
			.select()
			.from(labeledEmails)
			.where(eq(labeledEmails.userId, userId))
			.orderBy(labeledEmails.labeledAt);

		const formattedHistory = history.map(item => ({
			...item,
			labels: JSON.parse(item.labels),
		}));

		return c.json({
			success: true,
			history: formattedHistory,
		});
	} catch (error) {
		console.error("Error fetching labeling history:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

export default app; 