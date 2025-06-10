import { categorizeEmail } from "./openai-client"
import { Email, CategorizationResponse } from "./types"
import "dotenv/config"
import { randomUUID } from "crypto"

// Function to read multiline input from the user
async function readMultilineInput(prompt: string): Promise<string> {
  console.log(prompt)
  console.log("(Type 'END' on a new line when finished)")
  
  let input = ""
  let line = ""
  
  while (true) {
    line = await new Promise<string>(resolve => {
      process.stdin.once("data", data => {
        resolve(data.toString().trim())
      })
    })
    
    if (line === "END") break
    
    input += line + "\n"
  }
  
  return input.trim()
}

async function main() {
  console.log("Manual Email Categorization Test")
  console.log("===============================\n")
  console.log("Enter email details below:\n")
  
  // Get email details from user
  const from = await readMultilineInput("From (email address):")
  const to = await readMultilineInput("To (email address):")
  const subject = await readMultilineInput("Subject:")
  const body = await readMultilineInput("Body:")
  
  // Create email object
  const email: Email = {
    id: randomUUID(),
    from,
    to,
    subject,
    body,
    date: new Date().toISOString()
  }
  
  console.log("\nProcessing email...")
  
  try {
    const result: CategorizationResponse = await categorizeEmail(email)
    
    console.log("\nResult:")
    console.log(`Category: ${result.category}`)
    console.log(`Confidence: ${result.confidence}`)
    
    if (result.explanation) {
      console.log(`\nExplanation: ${result.explanation}`)
    }
    
    if (result.category === "reply" && result.suggestedReply) {
      console.log("\nSuggested Reply:")
      console.log("================")
      console.log(result.suggestedReply)
    }
  } catch (error) {
    console.error("Error processing email:", error)
  }
}

// Run the main function
main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
}) 