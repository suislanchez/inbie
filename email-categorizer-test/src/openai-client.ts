import OpenAI from "openai"
import { Email, CategorizationResponse } from "./types"
import { getConfig } from "./config"

// Initialize OpenAI client
function createOpenAIClient() {
  const { OPENAI_API_KEY } = getConfig()
  return new OpenAI({ apiKey: OPENAI_API_KEY })
}

// Generate the prompt for email categorization
function generatePrompt(email: Email): string {
  return `
You are an AI assistant helping to categorize emails and generate responses.
Please analyze the following email and determine if it requires a reply.

From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.body}

Please categorize this email as either "reply" or "no_reply" and provide your reasoning.
If it requires a reply, please suggest an appropriate response.

Your response should be in JSON format with the following structure:
{
  "category": "reply" or "no_reply",
  "confidence": 0.0 to 1.0 (your confidence level),
  "explanation": "Your explanation for the categorization",
  "suggestedReply": "Your suggested reply if the category is 'reply'"
}
`
}

// Categorize an email using OpenAI
export async function categorizeEmail(email: Email): Promise<CategorizationResponse> {
  const client = createOpenAIClient()
  const { MODEL_NAME } = getConfig()
  
  try {
    const prompt = generatePrompt(email)
    
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0]?.message.content
    
    if (!content) {
      throw new Error("No content received from OpenAI")
    }
    
    // Parse the JSON response
    const result = JSON.parse(content) as CategorizationResponse
    
    return result
  } catch (error) {
    console.error("Error categorizing email:", error)
    throw error
  }
} 