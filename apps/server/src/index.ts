import "dotenv/config";
import { google } from "@ai-sdk/google";
import { trpcServer } from "@hono/trpc-server";
import { streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stream } from "hono/streaming";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { getLabelList, labelEmail } from "./lib/gmail";

// Set default environment variables if not provided
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "680235656943-s6evnaejjbkppohtl764v3dtqg56p9uq.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";
process.env.GOOGLE_ENCRYPT_SECRET = process.env.GOOGLE_ENCRYPT_SECRET || "ec6543a05ae5546d7883733cf6061a7a9b73f87b6344d60d19ea9221069fd921";
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.post("/ai", async (c) => {
	const body = await c.req.json();
	const messages = body.messages || [];

	const result = streamText({
		model: google("gemini-1.5-flash"),
		messages,
	});

	c.header("X-Vercel-AI-Data-Stream", "v1");
	c.header("Content-Type", "text/plain; charset=utf-8");

	return stream(c, (stream) => stream.pipe(result.toDataStream()));
});

app.get("/api/gmail/labels", async (c) => {
	try {
		console.log("🟡 SERVER: GET /api/gmail/labels called");
		
		const authHeader = c.req.header("Authorization");
		console.log("🟡 SERVER: Auth header:", authHeader ? `${authHeader.substring(0, 20)}...` : "NOT_PRESENT");
		
		const accessToken = authHeader?.replace("Bearer ", "");
		console.log("🟡 SERVER: Extracted token:", accessToken ? `${accessToken.substring(0, 20)}...` : "NOT_PRESENT");
		console.log("🟡 SERVER: Token length:", accessToken?.length || 0);
		
		if (!accessToken) {
			console.error("🔴 SERVER: No access token provided");
			return c.json({ error: "Access token required" }, 401);
		}

		console.log("🟡 SERVER: Calling getLabelList...");
		const labels = await getLabelList(accessToken);
		console.log("🟢 SERVER: Labels fetched successfully, count:", labels?.length || 0);
		
		// Filter to show user-created labels and important system labels
		const filteredLabels = labels.filter((label: any) => {
			return (
				label.type === "user" || 
				["IMPORTANT", "STARRED", "UNREAD"].includes(label.id)
			);
		}).map((label: any) => ({
			id: label.id,
			name: label.name,
			type: label.type,
			color: label.color || null,
		}));

		return c.json({
			success: true,
			labels: filteredLabels,
		});
	} catch (error) {
		console.error("🔴 SERVER: Error fetching labels:", error?.message || error);
		console.error("🔴 SERVER: Error details:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

app.post("/api/gmail/label-email", async (c) => {
	try {
		const accessToken = c.req.header("Authorization")?.replace("Bearer ", "");
		
		if (!accessToken) {
			return c.json({ error: "Access token required" }, 401);
		}

		const body = await c.req.json();
		const { messageId, labelIds } = body;

		if (!messageId || !labelIds || !Array.isArray(labelIds)) {
			return c.json({ error: "messageId and labelIds (array) are required" }, 400);
		}

		const result = await labelEmail(accessToken, messageId, labelIds);

		return c.json({
			success: true,
			result,
		});
	} catch (error) {
		console.error("Error labeling email:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
