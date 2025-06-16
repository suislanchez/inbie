import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import { 
  Tag, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  Star, 
  Mail,
  Check
} from "lucide-react"
import { toast } from "sonner"

interface GmailLabel {
  id: string
  name: string
  type: string
}

interface Email {
  id: string
  subject: string
  labelIds?: string[]
}

interface ManualLabelDropdownProps {
  email: Email
  accessToken: string
  refreshToken: string
  disabled?: boolean
  onLabelApplied?: (labelId: string, labelName: string) => void
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

export function ManualLabelDropdown({ 
  email, 
  accessToken, 
  refreshToken, 
  disabled = false,
  onLabelApplied 
}: ManualLabelDropdownProps) {
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null)

  const fetchLabels = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log("🟡 LABEL FETCH DEBUG: Starting label fetch")
      
      // Check if token might be expired and refresh if needed
      const storedTokens = localStorage.getItem("googleTokens")
      let currentAccessToken = accessToken
      
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens)
        console.log("🟡 TOKEN CHECK: Stored token expiry:", new Date(tokens.expiry_date || 0).toISOString())
        console.log("🟡 TOKEN CHECK: Current time:", new Date().toISOString())
        
        if (isTokenExpired(tokens)) {
          console.log("🟡 TOKEN: Access token appears expired, refreshing...")
          try {
            const newTokens = await refreshAccessToken(refreshToken)
            currentAccessToken = newTokens.access_token
            console.log("🟢 TOKEN: Successfully refreshed, using new token")
          } catch (refreshError) {
            console.error("🔴 TOKEN: Failed to refresh token:", refreshError)
            setError("Session expired. Please sign in again.")
            return
          }
        } else {
          console.log("🟢 TOKEN: Token is still valid")
        }
      }
      
      if (!currentAccessToken) {
        setError("No access token available")
        console.error("🔴 LABEL FETCH DEBUG: No access token available")
        return
      }
      
      console.log("🟡 Access token (first 20 chars):", currentAccessToken.substring(0, 20) + "...")
      console.log("🟡 Access token length:", currentAccessToken.length)
      console.log("🟡 Access token starts with:", currentAccessToken.substring(0, 5))
      console.log("🟡 Request URL:", '/api/gmail/labels')
      console.log("🟡 Current window location:", window.location.href)
      
      const response = await fetch('/api/gmail/labels', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      })

      console.log("🟡 LABEL FETCH DEBUG: Response received")
      console.log("🟡 Response status:", response.status)
      console.log("🟡 Response statusText:", response.statusText)
      console.log("🟡 Response headers:", Object.fromEntries(response.headers.entries()))
      console.log("🟡 Response URL:", response.url)

      // Get the response text first to see what we're actually getting
      const responseText = await response.text()
      console.log("🟡 LABEL FETCH DEBUG: Raw response text:")
      console.log("🟡 Response text (first 500 chars):", responseText.substring(0, 500))

      if (!response.ok) {
        console.error("🔴 LABEL FETCH DEBUG: Response not OK")
        console.error("🔴 Status:", response.status, response.statusText)
        console.error("🔴 Response body:", responseText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText}`)
      }

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log("🟢 LABEL FETCH DEBUG: Successfully parsed JSON")
        console.log("🟢 Parsed data:", data)
      } catch (parseError) {
        console.error("🔴 LABEL FETCH DEBUG: JSON parse error")
        console.error("🔴 Parse error:", parseError)
        console.error("🔴 Response that failed to parse:", responseText)
        throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}. Response: ${responseText}`)
      }
      
      if (!data.success) {
        console.error("🔴 LABEL FETCH DEBUG: API returned success=false")
        console.error("🔴 Error from API:", data.error)
        throw new Error(data.error || 'Failed to fetch labels')
      }

      console.log("🟢 LABEL FETCH DEBUG: Success! Got labels:", data.labels?.length || 0)
      setLabels(data.labels || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error("🔴 LABEL FETCH DEBUG: Final error:", err)
      console.error("🔴 Error message:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      console.log("🟡 LABEL FETCH DEBUG: Fetch completed")
    }
  }

  const applyLabel = async (labelId: string, labelName: string) => {
    if (!email.id || isApplyingLabel) return
    
    setIsApplyingLabel(labelId)
    
    try {
      // Check if token might be expired and refresh if needed
      const storedTokens = localStorage.getItem("googleTokens")
      let currentAccessToken = accessToken
      
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens)
        if (isTokenExpired(tokens)) {
          console.log("🟡 TOKEN: Access token appears expired, refreshing for label application...")
          try {
            const newTokens = await refreshAccessToken(refreshToken)
            currentAccessToken = newTokens.access_token
            console.log("🟢 TOKEN: Successfully refreshed for label application")
          } catch (refreshError) {
            console.error("🔴 TOKEN: Failed to refresh token for label application:", refreshError)
            toast.error("Session expired. Please sign in again.")
            return
          }
        }
      }
      
      const response = await fetch('/api/gmail/label-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: email.id,
          labelIds: [labelId],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        
        // If still unauthorized after token refresh, try one more refresh
        if (response.status === 401 && currentAccessToken === accessToken) {
          console.log("🟡 Still unauthorized for label application, attempting token refresh...")
          try {
            const newTokens = await refreshAccessToken(refreshToken)
            const retryResponse = await fetch('/api/gmail/label-email', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newTokens.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messageId: email.id,
                labelIds: [labelId],
              }),
            })
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              if (retryData.success) {
                toast.success(`Applied "${labelName}" label to email`)
                onLabelApplied?.(labelId, labelName)
                return
              }
            }
          } catch (retryError) {
            console.error("🔴 Retry after refresh failed for label application:", retryError)
          }
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply label')
      }

      toast.success(`Applied "${labelName}" label to email`)
      onLabelApplied?.(labelId, labelName)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to apply label: ${errorMessage}`)
      console.error('Error applying label:', err)
    } finally {
      setIsApplyingLabel(null)
    }
  }

  const getLabelIcon = (label: GmailLabel) => {
    if (label.id === 'IMPORTANT') return <AlertCircle className="h-4 w-4 text-red-500" />
    if (label.id === 'STARRED') return <Star className="h-4 w-4 text-yellow-500" />
    if (label.id === 'UNREAD') return <Mail className="h-4 w-4 text-blue-500" />
    return <Tag className="h-4 w-4 text-gray-500" />
  }

  const isLabelApplied = (labelId: string) => {
    return email.labelIds?.includes(labelId) || false
  }

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open && labels.length === 0 && !loading && !error) {
        fetchLabels()
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || !accessToken}
          className="inline-flex items-center gap-1.5"
        >
          <Tag className="h-4 w-4" />
          Label Email
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {loading && (
          <div className="flex items-center justify-center p-3">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading labels...</span>
          </div>
        )}
        
        {error && (
          <div className="p-3 text-center">
            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              onClick={fetchLabels} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {!loading && !error && labels.length === 0 && (
          <div className="p-3 text-center">
            <p className="text-sm text-muted-foreground">No labels available</p>
            <Button 
              onClick={fetchLabels} 
              size="sm" 
              variant="outline"
              className="text-xs mt-2"
            >
              Refresh
            </Button>
          </div>
        )}
        
        {!loading && !error && labels.length > 0 && (
          <>
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Apply Label to Email
              </p>
            </div>
            <DropdownMenuSeparator />
            {labels.map((label) => (
              <DropdownMenuItem
                key={label.id}
                onClick={() => applyLabel(label.id, label.name)}
                disabled={isApplyingLabel !== null}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {getLabelIcon(label)}
                  <span className="flex-1">{label.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isLabelApplied(label.id) && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                  {isApplyingLabel === label.id && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 