import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { getMcpToolsets } from "./mcp-client";

export interface ProcessEmailOptions {
  accessToken: string;
  enableDrafting?: boolean;
  enableLabeling?: boolean;
  userPreferences?: {
    responseStyle?: string;
    priorityKeywords?: string[];
    autoArchivePatterns?: string[];
  };
}

export interface ProcessedEmailResult {
  success: boolean;
  error?: string;
  labels?: string[];
  draft?: {
    subject: string;
    body: string;
    to: string;
  };
  analysis?: {
    category: string;
    priority: string;
    sentiment: string;
    suggestedActions: string[];
    keyTopics: string[];
  };
}

// Create email processing agent with MCP tools
async function createEmailAgent() {
  const toolsets = await getMcpToolsets();
  
  return new Agent({
    name: "Advanced Email Assistant",
    instructions: `You are an advanced email processing assistant with access to external tools. 
    
    Your capabilities include:
    - Sequential thinking for complex email analysis
    - Web content fetching for link analysis
    - Memory for context across email sessions
    
    When processing emails:
    1. Use sequential thinking to break down complex emails
    2. Fetch and analyze any important links mentioned
    3. Remember context from previous emails in the conversation
    4. Provide comprehensive analysis including categorization, priority, sentiment
    5. Generate appropriate labels and draft responses when requested
    
    Be thorough but concise in your analysis.`,
    model: openai("gpt-4o-mini"),
  });
}

export async function processEmailWithMcp(
  email: any,
  options: ProcessEmailOptions
): Promise<ProcessedEmailResult> {
  try {
    const agent = await createEmailAgent();
    const toolsets = await getMcpToolsets();

    // Prepare email context for analysis
    const emailContext = {
      subject: email.subject,
      from: email.from,
      to: email.to,
      body: email.body || email.snippet,
      date: email.date,
      existingLabels: email.labelIds || [],
    };

    // Create analysis prompt
    const analysisPrompt = `
    Analyze this email comprehensively using your available tools:
    
    Email Details:
    - Subject: ${emailContext.subject}
    - From: ${emailContext.from}
    - To: ${emailContext.to}
    - Date: ${emailContext.date}
    - Body: ${emailContext.body}
    - Existing Labels: ${emailContext.existingLabels.join(", ") || "None"}
    
    Please provide:
    1. Category classification (work, personal, marketing, support, etc.)
    2. Priority level (high, medium, low)
    3. Sentiment analysis (positive, neutral, negative)
    4. Suggested labels for organization
    5. Key topics and action items
    6. ${options.enableDrafting ? "A professional draft response if appropriate" : ""}
    
    Use sequential thinking to analyze complex aspects and fetch any important links mentioned.
    `;

    // Process with MCP tools
    const response = await agent.generate(analysisPrompt, {
      toolsets,
    });

    // Parse the response and extract structured data
    const analysis = parseAgentResponse(response.text);
    
    // Apply labels if enabled
    let appliedLabels: string[] = [];
    if (options.enableLabeling && analysis.suggestedLabels?.length > 0) {
      appliedLabels = await applyLabelsToEmail(
        email.id,
        analysis.suggestedLabels,
        options.accessToken
      );
    }

    // Create draft if enabled and suggested
    let draft = undefined;
    if (options.enableDrafting && analysis.draftResponse) {
      draft = {
        subject: `Re: ${emailContext.subject}`,
        body: analysis.draftResponse,
        to: emailContext.from,
      };
    }

    return {
      success: true,
      labels: appliedLabels,
      draft,
      analysis: {
        category: analysis.category || "uncategorized",
        priority: analysis.priority || "medium",
        sentiment: analysis.sentiment || "neutral",
        suggestedActions: analysis.suggestedActions || [],
        keyTopics: analysis.keyTopics || [],
      },
    };
  } catch (error) {
    console.error("Error processing email with MCP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Helper function to parse agent response into structured data
function parseAgentResponse(responseText: string) {
  // Basic parsing - in a real implementation, you'd want more sophisticated parsing
  const lines = responseText.split("\n").filter(line => line.trim());
  
  const analysis: any = {
    suggestedLabels: [],
    suggestedActions: [],
    keyTopics: [],
  };

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes("category:")) {
      analysis.category = line.split(":")[1]?.trim();
    } else if (lowerLine.includes("priority:")) {
      analysis.priority = line.split(":")[1]?.trim();
    } else if (lowerLine.includes("sentiment:")) {
      analysis.sentiment = line.split(":")[1]?.trim();
    } else if (lowerLine.includes("labels:")) {
      const labelsText = line.split(":")[1]?.trim();
      if (labelsText) {
        analysis.suggestedLabels = labelsText.split(",").map(l => l.trim()).filter(Boolean);
      }
    } else if (lowerLine.includes("draft response:")) {
      const draftIndex = lines.indexOf(line);
      analysis.draftResponse = lines.slice(draftIndex + 1).join("\n").trim();
    }
  });

  return analysis;
}

// Helper function to apply labels to email
async function applyLabelsToEmail(
  messageId: string,
  labelNames: string[],
  accessToken: string
): Promise<string[]> {
  try {
    // Get or create label IDs
    const labelIds = await getLabelIds(labelNames, accessToken);
    
    // Apply labels via Gmail API
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: labelIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to apply labels: ${response.statusText}`);
    }

    return labelNames;
  } catch (error) {
    console.error("Error applying labels:", error);
    return [];
  }
}

// Helper function to get or create label IDs
async function getLabelIds(labelNames: string[], accessToken: string): Promise<string[]> {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch labels");
  }

  const data = await response.json();
  const existingLabels = data.labels || [];
  const labelIds: string[] = [];

  for (const labelName of labelNames) {
    let label = existingLabels.find((l: any) => l.name === labelName);
    
    if (!label) {
      // Create the label if it doesn't exist
      label = await createLabel(labelName, accessToken);
    }
    
    if (label?.id) {
      labelIds.push(label.id);
    }
  }

  return labelIds;
}

// Helper function to create a new label
async function createLabel(name: string, accessToken: string) {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create label: ${response.statusText}`);
  }

  return await response.json();
} 