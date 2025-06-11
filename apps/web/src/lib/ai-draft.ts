import OpenAI from "openai";

// Define response type for draft generation
export interface DraftResponse {
  draft: string;
  success: boolean;
  error?: string;
}

export interface EmailData {
  sender: string;
  subject: string;
  content: string;
  time?: string;
}

/**
 * Generate an email draft response using OpenAI
 */
export async function generateEmailDraft(
  email: EmailData,
  instructions?: string
): Promise<DraftResponse> {
  try {
    // Get API key from environment variables
    let apiKey: string | undefined
    let apiKeySource = "unknown"
    
    // Try to use Vite environment variables first (for client-side)
    if (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
      apiKey = import.meta.env.VITE_OPENAI_API_KEY
      apiKeySource = "VITE_OPENAI_API_KEY"
      console.log("Using API key from Vite environment: VITE_OPENAI_API_KEY")
    }
    // Fallback to Node.js process.env (for server-side)
    else if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY
      apiKeySource = "process.env.OPENAI_API_KEY"
      console.log("Using API key from Node.js environment: process.env.OPENAI_API_KEY")
    }

    if (!apiKey) {
      return {
        draft: "",
        success: false,
        error: "OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file or OPENAI_API_KEY in your environment variables."
      }
    }

    // Verify API key format (simple check)
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      return {
        draft: "",
        success: false,
        error: `Invalid OpenAI API key format. API keys typically start with 'sk-' and are longer. Source: ${apiKeySource}`
      }
    }

    console.log(`OpenAI API key found (${apiKeySource}). Initializing client...`)
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // For client-side usage
    })

    // Construct the prompt
    const basePrompt = `You are an AI assistant helping to draft email responses.
Generate a professional and appropriate response to the following email:

FROM: ${email.sender}
SUBJECT: ${email.subject}
DATE: ${email.time || "Recently"}

CONTENT:
${email.content}

${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ""}

Please draft a concise, professional response that:
1. Addresses the key points in the email
2. Maintains appropriate tone
3. Is clear and concise
4. Includes a greeting and sign-off
5. Is formatted for easy reading
`;

    try {
      console.log("Sending request to OpenAI API...");
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",  // Using the latest GPT-4o model
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that helps draft email responses. Your responses should be professional, concise, and directly address the content of the original email."
          },
          {
            role: "user",
            content: basePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 700
      });

      console.log("Received response from OpenAI API:", completion);
      
      // Extract the generated text
      const draft = completion.choices[0]?.message?.content || "";
      
      if (!draft) {
        console.error("No content in OpenAI response:", completion);
        return {
          draft: "",
          success: false,
          error: "OpenAI returned an empty response. Please try again."
        };
      }

      return {
        draft,
        success: true
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      
      // Try to extract more specific error information
      let errorMessage = "Unknown error occurred when calling OpenAI API";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for common OpenAI API errors
        if (errorMessage.includes("401")) {
          errorMessage = "Authentication error: Invalid API key or token (401)";
        } else if (errorMessage.includes("429")) {
          errorMessage = "Rate limit exceeded or quota exceeded (429)";
        } else if (errorMessage.includes("500")) {
          errorMessage = "OpenAI server error (500)";
        } else if (errorMessage.includes("503")) {
          errorMessage = "OpenAI service unavailable (503)";
        } else if (errorMessage.includes("timeout")) {
          errorMessage = "Request to OpenAI API timed out";
        } else if (errorMessage.includes("network")) {
          errorMessage = "Network error when connecting to OpenAI API";
        }
      }
      
      return {
        draft: "",
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error("Error in generateEmailDraft function:", error);
    return {
      draft: "",
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred"
    };
  }
} 