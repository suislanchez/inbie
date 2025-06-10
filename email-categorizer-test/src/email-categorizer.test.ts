import { describe, test, expect, beforeAll, afterEach, mock } from "bun:test"
import { categorizeEmail } from "./openai-client"
import { mockEmails } from "./mock-data"
import { CategorySchema } from "./types"
import * as config from "./config"

// Mock the OpenAI client
const mockResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          category: "reply",
          confidence: 0.95,
          explanation: "This email requires a response as it's asking about availability for a meeting.",
          suggestedReply: "Hi,\n\nThanks for reaching out. Yes, I'm available on Tuesday at 2 PM. Looking forward to discussing the project.\n\nBest regards,\nMe"
        })
      }
    }
  ]
}

mock.module("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mock(() => Promise.resolve(mockResponse))
        }
      }
    }
  }
})

// Mock the config to avoid needing env variables in tests
beforeAll(() => {
  mock.module("./config", () => {
    return {
      getConfig: () => ({ 
        OPENAI_API_KEY: "test-key", 
        MODEL_NAME: "gpt-test-model" 
      })
    }
  })
})

describe("Email Categorization", () => {
  test("should categorize an email correctly", async () => {
    const testEmail = mockEmails[0]
    const result = await categorizeEmail(testEmail)
    
    // Validate the response structure
    expect(result).toBeDefined()
    expect(CategorySchema.safeParse(result.category).success).toBe(true)
    expect(typeof result.confidence).toBe("number")
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    
    // For a reply category, we should have a suggested reply
    if (result.category === "reply") {
      expect(result.suggestedReply).toBeDefined()
    }
  })

  test("should handle errors gracefully", async () => {
    // Mock the OpenAI client to throw an error
    mock.module("openai", () => {
      return {
        default: class MockOpenAI {
          chat = {
            completions: {
              create: mock(() => Promise.reject(new Error("API Error")))
            }
          }
        }
      }
    })
    
    const testEmail = mockEmails[0]
    
    // The categorizeEmail function should throw the error
    await expect(categorizeEmail(testEmail)).rejects.toThrow()
  })
}) 