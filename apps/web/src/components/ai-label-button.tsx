import { useState } from "react"
import { Button } from "./ui/button"
import { Tag, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { debugEvents } from "./debug-overlay"

interface Email {
  id: number
  gmailId: string
  subject: string
  sender: string
  content?: string
  date?: string
  labelIds?: string[]
}

interface GmailLabel {
  id: string
  name: string
  type: string
}

// Helper function to check if token is expired
function isTokenExpired(tokens: any): boolean {
  if (!tokens.expiry_date) return false
  return Date.now() >= tokens.expiry_date
}

// Helper function to refresh token using TRPC
async function refreshAccessToken(refreshToken: string): Promise<any> {
  console.log("🟡 TOKEN REFRESH: Starting token refresh...")
  
  try {
    const { trpc } = await import('../lib/trpc')
    
    const response = await trpc.google.refreshAccessToken.mutate({ 
      refreshToken 
    })
    
    const newTokens = response.credentials
    console.log("🟢 TOKEN REFRESH: Successfully refreshed token")
    
    // Update localStorage with new tokens
    localStorage.setItem("googleTokens", JSON.stringify(newTokens))
    
    // Dispatch event for other components
    window.dispatchEvent(new Event("googleTokensUpdated"))
    
    return newTokens
  } catch (error) {
    console.error("🔴 TOKEN REFRESH: Failed to refresh token:", error)
    throw error
  }
}

interface AILabelButtonProps {
  email: Email
  accessToken: string
  refreshToken: string
  disabled?: boolean
  onLabelApplied?: (labelId: string, labelName: string) => void
}

export function AILabelButton({
  email,
  accessToken,
  refreshToken,
  disabled = false,
  onLabelApplied
}: AILabelButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("")

  const handleAILabel = async () => {
    if (!email.gmailId || isProcessing) return
    setIsProcessing(true)
    setCurrentStep("Fetching labels...")

    try {
      debugEvents.addEntry("=== AI LABELING DEBUG START ===", "info")
      debugEvents.addEntry("📧 Processing email: " + email.subject, "info")

      // Check if token might be expired and refresh if needed
      const storedTokens = localStorage.getItem("googleTokens")
      let currentAccessToken = accessToken
      
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens)
        if (isTokenExpired(tokens)) {
          console.log("🟡 TOKEN: Access token appears expired, refreshing...")
          try {
            const newTokens = await refreshAccessToken(refreshToken)
            currentAccessToken = newTokens.access_token
            console.log("🟢 TOKEN: Successfully refreshed, using new token")
          } catch (refreshError) {
            console.error("🔴 TOKEN: Failed to refresh token:", refreshError)
            toast.error("Session expired. Please sign in again.")
            return
          }
        }
      }

      // Step 1: Fetch existing labels using the same endpoint as ManualLabelDropdown
      const labelsResponse = await fetch('/api/gmail/labels', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      })

      if (!labelsResponse.ok) {
        throw new Error(`Failed to fetch labels: ${labelsResponse.statusText}`)
      }

      const labelsData = await labelsResponse.json()
      if (!labelsData.success) {
        throw new Error(labelsData.error || 'Failed to fetch labels')
      }

      const existingLabels = labelsData.labels
        .filter((label: GmailLabel) => label.type === 'user')
        .map((label: GmailLabel) => label.name)

      debugEvents.addEntry(`📋 Found ${existingLabels.length} existing labels`, "info")
      setCurrentStep("Analyzing with AI...")

      // Step 2: Analyze email with OpenAI
      const analysisResponse = await fetch('/api/analyze-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            subject: email.subject,
            from: email.sender,
            content: email.content,
            date: email.date,
          },
          existingLabels,
        }),
      })

      if (!analysisResponse.ok) {
        throw new Error(`Failed to analyze email: ${analysisResponse.statusText}`)
      }

      const analysis = await analysisResponse.json()
      debugEvents.addEntry(`🤖 AI suggested labels: ${analysis.suggestedLabels.join(", ")}`, "success")
      debugEvents.addEntry(`📊 Confidence: ${Math.round(analysis.confidence * 100)}%`, "info")

      // Step 3: Apply suggested labels
      if (analysis.suggestedLabels.length > 0) {
        setCurrentStep("Applying labels...")
        
        // Find or create label IDs
        const labelIds: string[] = []
        for (const labelName of analysis.suggestedLabels) {
          const existingLabel = labelsData.labels.find(
            (label: GmailLabel) => label.name.toLowerCase() === labelName.toLowerCase()
          )
          
          if (existingLabel) {
            labelIds.push(existingLabel.id)
          } else {
            // Create new label using the Gmail API
            const createResponse = await fetch('/api/gmail/create-label', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: labelName,
              }),
            })
            
            if (!createResponse.ok) {
              throw new Error(`Failed to create label: ${createResponse.statusText}`)
            }
            
            const newLabel = await createResponse.json()
            if (!newLabel.success) {
              throw new Error(newLabel.error || 'Failed to create label')
            }
            
            labelIds.push(newLabel.label.id)
          }
        }

        // Apply labels to email
        const response = await fetch('/api/gmail/label-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId: email.gmailId,
            labelIds,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to apply labels: ${response.statusText}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply labels')
        }

        debugEvents.addEntry("✅ Successfully applied AI suggested labels", "success")
        toast.success("AI labeling completed!", {
          description: `Applied ${analysis.suggestedLabels.length} labels: ${analysis.suggestedLabels.join(", ")}`
        })

        // Notify parent component
        for (let i = 0; i < labelIds.length; i++) {
          onLabelApplied?.(labelIds[i], analysis.suggestedLabels[i])
        }
      } else {
        toast.info("No new labels suggested", {
          description: "Email already has appropriate labels or no suitable labels found"
        })
      }
    } catch (error) {
      console.error("AI labeling error:", error)
      debugEvents.addEntry(`❌ AI labeling failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      toast.error("AI labeling failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
    } finally {
      setIsProcessing(false)
      setCurrentStep("")
    }
  }

  return (
    <Button
      onClick={handleAILabel}
      disabled={disabled || isProcessing || !accessToken}
      variant="secondary"
      className="inline-flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
    >
      {isProcessing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          {currentStep || "Processing..."}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          AI Label
        </>
      )}
    </Button>
  )
} 