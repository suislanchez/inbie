import { trpc } from "./trpc";
import { debugEvents } from "../components/debug-overlay";

export interface GmailEmail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labelIds: string[];
}

export async function fetchGmailEmails(
  accessToken: string,
  refreshToken: string,
  maxResults?: number
): Promise<GmailEmail[]> {
  try {
    debugEvents.addEntry("Fetching emails using API utility...", "info");
    
    const data = await trpc.google.getRecentEmails.query({
      accessToken,
      refreshToken,
      maxResults: maxResults || 300
    });
    
    if (data && Array.isArray(data)) {
      debugEvents.addEntry(`Successfully fetched ${data.length} emails`, "success");
      return data;
    } else {
      debugEvents.addEntry("API returned invalid data format", "warning");
      return [];
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    debugEvents.addEntry(`API error: ${errorMessage}`, "error");
    console.error("Failed to fetch emails from API:", error);
    throw error;
  }
} 