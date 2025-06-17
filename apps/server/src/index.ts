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
import { OpenAI } from "openai";
import { z } from "zod";

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

// Chat endpoint for OpenAI streaming
app.post("/api/chat", async (c) => {
	try {
		const body = await c.req.json();
		const { messages } = body;

		if (!messages || !Array.isArray(messages)) {
			return c.json({ error: "Messages array is required" }, 400);
		}

		// Initialize OpenAI client
		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});

		if (!process.env.OPENAI_API_KEY) {
			console.error("OPENAI_API_KEY is not set");
			return c.json({ error: "OpenAI API key not configured" }, 500);
		}

		console.log("Creating OpenAI streaming chat completion...");

		// Create streaming completion
		const stream = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{
					role: "system",
					content: "You are a helpful AI assistant for email management. You can help with general questions and email-related tasks."
				},
				...messages
			],
			stream: true,
			max_tokens: 500,
			temperature: 0.7
		});

		// Set headers for streaming
		c.header("Content-Type", "text/plain; charset=utf-8");
		c.header("Cache-Control", "no-cache");
		c.header("Connection", "keep-alive");

		// Return streaming response
		return new Response(
			new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of stream) {
							const content = chunk.choices[0]?.delta?.content || '';
							if (content) {
								// Send the content as SSE format
								const data = `data: ${JSON.stringify({ content })}\n\n`;
								controller.enqueue(new TextEncoder().encode(data));
							}
						}
						// Send done signal
						controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
						controller.close();
					} catch (error) {
						console.error("Streaming error:", error);
						controller.error(error);
					}
				}
			}),
			{
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "no-cache",
					"Connection": "keep-alive"
				}
			}
		);

	} catch (error) {
		console.error("Chat API error:", error);
		return c.json(
			{
				error: error instanceof Error ? error.message : "Unknown error occurred"
			},
			500
		);
	}
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
	} catch (error: unknown) {
		console.error("🔴 SERVER: Error fetching labels:", error instanceof Error ? error.message : error);
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

// Schema for email analysis request
const emailSchema = z.object({
	subject: z.string(),
	from: z.string(),
	content: z.string().optional(),
	date: z.string().optional(),
});

const requestSchema = z.object({
	email: emailSchema,
	existingLabels: z.array(z.string()),
});

app.post("/api/analyze-email", async (c) => {
	try {
		// Parse and validate request body
		const body = await c.req.json();
		const { email, existingLabels } = requestSchema.parse(body);

		// Initialize OpenAI client
		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});

		// Prepare the prompt
		const prompt = `Analyze this email and suggest appropriate labels from the existing labels. If no existing labels fit, suggest new ones.

Email Details:
Subject: ${email.subject}
From: ${email.from}
${email.date ? `Date: ${email.date}` : ''}
${email.content ? `Content: ${email.content}` : ''}

Existing Labels:
${existingLabels.join(', ')}

Please analyze the email and:
1. Suggest up to 3 most relevant labels from the existing labels
2. If no existing labels fit well, suggest new label names
3. Provide a confidence score (0-1) for your suggestions
4. Briefly explain your reasoning

Respond in this JSON format:
{
	"suggestedLabels": ["label1", "label2"],
	"confidence": 0.95,
	"reasoning": "Brief explanation of why these labels were chosen"
}`;

		// Call OpenAI API
		const completion = await openai.chat.completions.create({
			model: "gpt-4-turbo-preview",
			messages: [
				{
					role: "system",
					content: "You are an expert email organizer. Your task is to analyze emails and suggest appropriate labels based on their content and context. Be concise and precise in your suggestions."
				},
				{
					role: "user",
					content: prompt
				}
			],
			response_format: { type: "json_object" },
			temperature: 0.3,
		});

		// Parse OpenAI response
		const content = completion.choices[0].message.content
		if (!content) {
			throw new Error("OpenAI response content is null")
		}
		const analysis = JSON.parse(content)

		// Return the analysis
		return c.json({
			success: true,
			...analysis,
		});
	} catch (error) {
		console.error('Error analyzing email:', error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to analyze email',
			},
			error instanceof z.ZodError ? 400 : 500
		);
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
