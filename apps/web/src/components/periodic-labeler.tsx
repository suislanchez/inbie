import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { isTokenExpired, refreshAccessToken } from "@/lib/auth-client"

interface PeriodicLabelerProps {
  accessToken: string
  refreshToken: string
  disabled?: boolean
  interval?: number // in minutes
  onLabelApplied?: (labelId: string, labelName: string) => void
}

export function PeriodicLabeler({
  accessToken,
  refreshToken,
  disabled = false,
  interval = 5, // default 5 minutes
  onLabelApplied
}: PeriodicLabelerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout

  const runLabeling = async () => {
    if (!accessToken || disabled || isRunning) return
    
    try {
      setIsRunning(true)
      setStatus(null)

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

      // Fetch unlabeled emails
      toast.info('Fetching unlabeled emails...')
      const response = await fetch('/api/gmail/unlabeled', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch unlabeled emails:", errorText)
        throw new Error(`Failed to fetch unlabeled emails: ${response.statusText}`)
      }

      const { emails } = await response.json()
      
      if (!emails || emails.length === 0) {
        toast.info('No unlabeled emails found')
        return
      }

      setStatus({
        total: emails.length,
        current: 0,
      })
      
      // Get existing labels first
      const labelsResponse = await fetch('/api/gmail/labels', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      })

      if (!labelsResponse.ok) {
        throw new Error('Failed to fetch labels')
      }

      const labelsData = await labelsResponse.json()
      const existingLabels = labelsData.labels
        .filter((label: any) => label.type === 'user')
        .map((label: any) => label.name)
      
      // Process each email with AI labeling
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i]
        try {
          setStatus(prev => ({
            ...prev!,
            current: i + 1,
            currentEmail: {
              subject: email.subject,
              status: 'analyzing'
            }
          }))

          const analysisResponse = await fetch('/api/analyze-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: {
                subject: email.subject,
                from: email.from,
                content: email.content,
                date: email.date,
              },
              existingLabels,
            }),
          })

          if (!analysisResponse.ok) {
            setStatus(prev => ({
              ...prev!,
              currentEmail: {
                ...prev!.currentEmail!,
                status: 'error'
              }
            }))
            continue // Skip this email if analysis fails
          }

          const analysis = await analysisResponse.json()

          if (analysis.suggestedLabels.length > 0) {
            // Update status with suggested labels
            setStatus(prev => ({
              ...prev!,
              currentEmail: {
                ...prev!.currentEmail!,
                status: 'labeling',
                labels: analysis.suggestedLabels
              }
            }))

            // Find or create label IDs
            const labelIds: string[] = []
            for (const labelName of analysis.suggestedLabels) {
              const existingLabel = labelsData.labels.find(
                (label: any) => label.name.toLowerCase() === labelName.toLowerCase()
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
            const labelResponse = await fetch('/api/gmail/label-email', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messageId: email.id,
                labelIds,
              }),
            })

            if (!labelResponse.ok) {
              setStatus(prev => ({
                ...prev!,
                currentEmail: {
                  ...prev!.currentEmail!,
                  status: 'error'
                }
              }))
              continue
            }

            const result = await labelResponse.json()
            if (!result.success) {
              throw new Error(result.error || 'Failed to apply labels')
            }

            setStatus(prev => ({
              ...prev!,
              currentEmail: {
                ...prev!.currentEmail!,
                status: 'complete'
              }
            }))

            // Notify parent component
            for (let i = 0; i < labelIds.length; i++) {
              onLabelApplied?.(labelIds[i], analysis.suggestedLabels[i])
            }
          }
        } catch (error) {
          console.error('Error processing email:', error)
          setStatus(prev => ({
            ...prev!,
            currentEmail: {
              ...prev!.currentEmail!,
              status: 'error'
            }
          }))
        }
      }

      setLastRun(new Date())
      toast.success('Periodic labeling completed', {
        description: `Processed ${emails.length} emails`
      })
    } catch (error) {
      console.error('Error in periodic labeling:', error)
      toast.error('Failed to run periodic labeling', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!disabled && accessToken) {
      timer = setInterval(runLabeling, interval * 60 * 1000)
    }

    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [accessToken, disabled, interval])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !accessToken || isRunning}
          onClick={runLabeling}
          className="inline-flex items-center gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRunning && "animate-spin")} />
          Auto Label
        </Button>
        {lastRun && (
          <span className="text-sm text-muted-foreground">
            Last run: {lastRun.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Status Display */}
      {status && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing emails: {status.current} of {status.total}</span>
              <span>{Math.round((status.current / status.total) * 100)}%</span>
            </div>
            
            {status.currentEmail && (
              <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn(
                      "h-4 w-4",
                      status.currentEmail.status === 'analyzing' && "animate-spin text-blue-500",
                      status.currentEmail.status === 'labeling' && "animate-spin text-yellow-500",
                      status.currentEmail.status === 'complete' && "text-green-500",
                      status.currentEmail.status === 'error' && "text-red-500"
                    )} />
                    <span className="font-medium">{status.currentEmail.subject}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Status: {status.currentEmail.status}
                    {status.currentEmail.labels && (
                      <div className="mt-1">
                        Labels: {status.currentEmail.labels.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </Card>
      )}
    </div>
  )
} 