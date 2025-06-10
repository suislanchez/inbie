// Access environment variables
export function getConfig() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const MODEL_NAME = process.env.MODEL_NAME || "gpt-4-turbo"

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing from environment variables")
    console.error("Make sure you have created a .env file with your OpenAI API key")
    throw new Error("OPENAI_API_KEY is required in environment variables")
  }

  return {
    OPENAI_API_KEY,
    MODEL_NAME
  }
} 