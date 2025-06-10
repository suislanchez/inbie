import "dotenv/config"
import { categorizeEmail } from "./openai-client"
import { mockEmails } from "./mock-data"
import { CategorizationResponse } from "./types"

async function main() {
  console.log("Email Categorization Test")
  console.log("========================\n")

  for (const email of mockEmails) {
    console.log(`Processing email: ${email.id} - ${email.subject}`)
    console.log(`From: ${email.from}`)
    console.log(`Subject: ${email.subject}`)
    
    try {
      const result: CategorizationResponse = await categorizeEmail(email)
      
      console.log("\nResult:")
      console.log(`Category: ${result.category}`)
      console.log(`Confidence: ${result.confidence}`)
      
      if (result.explanation) {
        console.log(`Explanation: ${result.explanation}`)
      }
      
      if (result.category === "reply" && result.suggestedReply) {
        console.log("\nSuggested Reply:")
        console.log(result.suggestedReply)
      }
    } catch (error) {
      console.error(`Error processing email ${email.id}:`, error)
    }
    
    console.log("\n------------------------\n")
  }
}

// Run the main function
main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
}) 