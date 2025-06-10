import { useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { trpc } from "../lib/trpc"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { debugEvents } from "./debug-overlay"

interface Email {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  labelIds: string[]
}

interface EmailListProps {
  accessToken: string
  refreshToken: string
}

export interface EmailListRef {
  fetchEmails: () => Promise<void>
}

export const EmailList = forwardRef<EmailListRef, EmailListProps>(
  function EmailList({ accessToken, refreshToken }, ref) {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("list")

    // Debug when component receives tokens
    useEffect(() => {
      if (accessToken && refreshToken) {
        debugEvents.addEntry("EmailList received tokens", "info")
        // Log a sample of the tokens for debugging
        debugEvents.addEntry(`Access token: ${accessToken.substring(0, 10)}...`, "info")
      }
    }, [accessToken, refreshToken])

    const fetchEmails = async () => {
      debugEvents.addEntry("=== Starting Email Fetch Process ===", "info")
      debugEvents.addEntry("Validating tokens...", "info")
      
      if (!accessToken || !refreshToken) {
        debugEvents.addEntry("❌ Missing tokens - Cannot proceed with fetch", "error")
        setError("Authentication tokens are missing")
        return
      }
      
      debugEvents.addEntry("✅ Tokens present", "success")
      debugEvents.addEntry(`Access token: ${accessToken.substring(0, 10)}...`, "info")
      debugEvents.addEntry(`Refresh token: ${refreshToken.substring(0, 10)}...`, "info")
      
      debugEvents.addEntry("Updating UI state...", "info")
      setIsLoading(true)
      setError(null)
      
      try {
        debugEvents.addEntry("📡 Initiating API call to getRecentEmails...", "info")
        debugEvents.addEntry("Request parameters:", "info")
        debugEvents.addEntry(`- maxResults: 10`, "info")
        debugEvents.addEntry(`- Endpoint: google.getRecentEmails`, "info")
        
        // Add request timing
        const startTime = performance.now()
        debugEvents.addEntry(`Request started at: ${new Date().toISOString()}`, "info")
        
        const response = await trpc.google.getRecentEmails.query({
          accessToken,
          refreshToken,
          maxResults: 10
        }).catch((error) => {
          // Enhanced tRPC error handling
          debugEvents.addEntry("🔍 Detailed tRPC Error Analysis:", "error")
          
          if (error.data) {
            debugEvents.addEntry(`Error code: ${error.data.code}`, "error")
            debugEvents.addEntry(`Error message: ${error.data.message}`, "error")
            debugEvents.addEntry(`Error path: ${error.data.path}`, "error")
            if (error.data.stack) {
              debugEvents.addEntry("Server stack trace:", "error")
              debugEvents.addEntry(error.data.stack, "error")
            }
          }
          
          if (error.cause) {
            debugEvents.addEntry("Error cause:", "error")
            debugEvents.addEntry(JSON.stringify(error.cause, null, 2), "error")
          }
          
          // Check for network errors
          if (error.message.includes("fetch")) {
            debugEvents.addEntry("🌐 Network error detected", "error")
            debugEvents.addEntry("Possible causes:", "error")
            debugEvents.addEntry("- Server is not running", "error")
            debugEvents.addEntry("- Network connectivity issues", "error")
            debugEvents.addEntry("- CORS issues", "error")
          }
          
          // Check for authentication errors
          if (error.message.toLowerCase().includes("unauthorized") || 
              error.message.toLowerCase().includes("auth")) {
            debugEvents.addEntry("🔒 Authentication error detected", "error")
            debugEvents.addEntry("Token may be invalid or expired", "error")
          }
          
          throw error // Re-throw to be caught by outer catch
        })
        
        const endTime = performance.now()
        debugEvents.addEntry(`Request completed in ${(endTime - startTime).toFixed(2)}ms`, "info")
        
        debugEvents.addEntry("✅ API call successful", "success")
        debugEvents.addEntry(`📬 Received ${response.emails.length} emails`, "info")
        
        // Debug email data structure
        if (response.emails.length > 0) {
          debugEvents.addEntry("Analyzing first email structure:", "info")
          const firstEmail = response.emails[0]
          Object.entries(firstEmail).forEach(([key, value]) => {
            if (typeof value === 'string') {
              const preview = value.length > 50 ? `${value.substring(0, 50)}...` : value
              debugEvents.addEntry(`- ${key}: ${preview}`, "info")
            } else {
              debugEvents.addEntry(`- ${key}: ${typeof value}`, "info")
            }
          })
        }
        
        debugEvents.addEntry("Validating email data...", "info")
        const validEmails = response.emails.filter((email): email is Email => {
          const isValid = 'id' in email && typeof email.id === 'string' && 
            'subject' in email && typeof email.subject === 'string' &&
            'from' in email && typeof email.from === 'string' &&
            'date' in email && typeof email.date === 'string'
            
          if (!isValid) {
            debugEvents.addEntry(`⚠️ Invalid email found - Missing required fields`, "warning")
            debugEvents.addEntry(`Email data: ${JSON.stringify(email)}`, "warning")
          }
          return isValid
        })
        
        debugEvents.addEntry(`✅ Validated ${validEmails.length} emails`, "success")
        if (validEmails.length !== response.emails.length) {
          debugEvents.addEntry(`⚠️ Filtered out ${response.emails.length - validEmails.length} invalid emails`, "warning")
        }
        
        debugEvents.addEntry("Updating component state...", "info")
        setEmails(validEmails)
        
        if (validEmails.length > 0) {
          debugEvents.addEntry("Selecting first email...", "info")
          setSelectedEmail(validEmails[0])
          debugEvents.addEntry(`✅ Selected: ${validEmails[0].subject}`, "success")
          debugEvents.addEntry(`From: ${validEmails[0].from}`, "info")
          debugEvents.addEntry(`Date: ${validEmails[0].date}`, "info")
        } else {
          debugEvents.addEntry("ℹ️ No valid emails to select", "info")
        }
        
        setActiveTab("list")
        debugEvents.addEntry("=== Email Fetch Process Complete ===", "success")
      } catch (error) {
        debugEvents.addEntry("❌ Error during email fetch process", "error")
        
        // Enhanced error type detection
        const errorType = error instanceof Error ? error.constructor.name : typeof error
        debugEvents.addEntry(`Error type: ${errorType}`, "error")
        
        // Handle specific error types
        if (errorType === "_TRPCClientError") {
          debugEvents.addEntry("🔍 tRPC Client Error Details:", "error")
          const trpcError = error as any
          
          // Log the full error object for debugging
          debugEvents.addEntry("Full error object:", "error")
          debugEvents.addEntry(JSON.stringify({
            name: trpcError.name,
            message: trpcError.message,
            code: trpcError.code,
            data: trpcError.data,
            cause: trpcError.cause
          }, null, 2), "error")
          
          // Provide user-friendly error message based on error type
          if (trpcError.data?.code === "UNAUTHORIZED") {
            setError("Your session has expired. Please sign in again.")
          } else if (trpcError.data?.code === "BAD_REQUEST") {
            setError("Invalid request. Please check your input and try again.")
          } else if (trpcError.data?.code === "INTERNAL_SERVER_ERROR") {
            setError("Server error. Please try again later.")
          } else {
            setError("Failed to fetch emails. Please try again.")
          }
        } else {
          // Generic error handling
          debugEvents.addEntry(`Error message: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
          setError("An unexpected error occurred. Please try again.")
        }
        
        if (error instanceof Error) {
          debugEvents.addEntry("Stack trace:", "error")
          debugEvents.addEntry(error.stack || "No stack trace available", "error")
          
          // Check for network-related errors
          if (error.message.includes("fetch") || error.message.includes("network")) {
            debugEvents.addEntry("🌐 Network error detected", "error")
            debugEvents.addEntry("Please check:", "error")
            debugEvents.addEntry("1. Server is running", "error")
            debugEvents.addEntry("2. Network connection", "error")
            debugEvents.addEntry("3. API endpoint is correct", "error")
          }
        }
        
        debugEvents.addEntry("=== Email Fetch Process Failed ===", "error")
      } finally {
        debugEvents.addEntry("Cleaning up...", "info")
        setIsLoading(false)
        debugEvents.addEntry("=== Process Complete ===", "info")
      }
    }

    // Expose the fetchEmails method via ref
    useImperativeHandle(ref, () => ({
      fetchEmails
    }))

    const handleEmailClick = (email: Email) => {
      setSelectedEmail(email)
      setActiveTab("view")
      debugEvents.addEntry(`Selected email: ${email.subject || "No subject"}`, "info")
    }

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        return date.toLocaleString()
      } catch (error) {
        return dateString
      }
    }

    // Extract name from email address (e.g., "John Doe <john@example.com>" -> "John Doe")
    const extractName = (emailString: string) => {
      const match = emailString.match(/^"?([^"<]+)"?\s*<.*>$/)
      return match ? match[1].trim() : emailString
    }

    // Truncate text to specified length with ellipsis
    const truncate = (text: string, length: number) => {
      return text.length > length ? text.substring(0, length) + "..." : text
    }

    // Update debugEmails function to be more comprehensive
    const debugEmails = () => {
      debugEvents.addEntry("=== Email List Debug Report ===", "info")
      debugEvents.addEntry(`Current state:`, "info")
      debugEvents.addEntry(`- Loading: ${isLoading}`, "info")
      debugEvents.addEntry(`- Error: ${error || "None"}`, "info")
      debugEvents.addEntry(`- Active tab: ${activeTab}`, "info")
      debugEvents.addEntry(`- Total emails: ${emails.length}`, "info")
      
      if (emails.length > 0) {
        debugEvents.addEntry("\nEmail List Summary:", "info")
        emails.forEach((email, index) => {
          if (index < 5) { // Show first 5 emails
            debugEvents.addEntry(`\nEmail ${index + 1}:`, "info")
            debugEvents.addEntry(`- ID: ${email.id}`, "info")
            debugEvents.addEntry(`- Subject: ${email.subject || "No subject"}`, "info")
            debugEvents.addEntry(`- From: ${email.from}`, "info")
            debugEvents.addEntry(`- Date: ${email.date}`, "info")
            debugEvents.addEntry(`- Has body: ${email.body ? "Yes" : "No"}`, "info")
            debugEvents.addEntry(`- Labels: ${email.labelIds?.join(", ") || "None"}`, "info")
          }
        })
        
        if (emails.length > 5) {
          debugEvents.addEntry(`\n... and ${emails.length - 5} more emails`, "info")
        }
      }
      
      if (selectedEmail) {
        debugEvents.addEntry("\nSelected Email Details:", "info")
        debugEvents.addEntry(`- ID: ${selectedEmail.id}`, "info")
        debugEvents.addEntry(`- Thread ID: ${selectedEmail.threadId}`, "info")
        debugEvents.addEntry(`- Subject: ${selectedEmail.subject || "No subject"}`, "info")
        debugEvents.addEntry(`- From: ${selectedEmail.from}`, "info")
        debugEvents.addEntry(`- To: ${selectedEmail.to}`, "info")
        debugEvents.addEntry(`- Date: ${selectedEmail.date}`, "info")
        debugEvents.addEntry(`- Snippet length: ${selectedEmail.snippet?.length || 0} chars`, "info")
        debugEvents.addEntry(`- Body length: ${selectedEmail.body?.length || 0} chars`, "info")
        debugEvents.addEntry(`- Labels: ${selectedEmail.labelIds?.join(", ") || "None"}`, "info")
      } else {
        debugEvents.addEntry("\nNo email currently selected", "info")
      }
      
      debugEvents.addEntry("\n=== End Debug Report ===", "info")
    }

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Emails</h2>
          <div className="flex gap-2">
            <Button onClick={debugEmails} variant="outline" size="sm">
              Debug
            </Button>
            <Button onClick={fetchEmails} disabled={isLoading}>
              {isLoading ? "Loading..." : "Fetch Recent Emails"}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="p-3 mb-4 text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Email List</TabsTrigger>
            <TabsTrigger value="view" disabled={!selectedEmail}>
              View Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-4">
            {emails.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {isLoading ? "Loading emails..." : "No emails to display. Click 'Fetch Recent Emails' to get started."}
              </div>
            ) : (
              <ScrollArea className="h-[500px] rounded-md border">
                <div className="p-4">
                  {emails.map((email) => (
                    <div key={email.id}>
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{extractName(email.from)}</span>
                          <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                        </div>
                        <div className="font-medium text-sm mb-1">{email.subject || "(No subject)"}</div>
                        <div className="text-sm text-gray-600">{truncate(email.snippet || "", 100)}</div>
                      </div>
                      <Separator className="my-2" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="view" className="mt-4">
            {selectedEmail ? (
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{selectedEmail.subject || "(No subject)"}</h3>
                  <Button variant="outline" onClick={() => setActiveTab("list")}>
                    Back to List
                  </Button>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">From: {selectedEmail.from}</div>
                      <div className="text-sm">To: {selectedEmail.to}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(selectedEmail.date)}
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <ScrollArea className="h-[400px]">
                  <div className="prose max-w-none">
                    {selectedEmail.body ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                    ) : (
                      <div>{selectedEmail.snippet}</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No email selected
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* JSON view for debugging */}
        {/* {selectedEmail && (
          <div className="mt-8 p-4 border rounded bg-gray-50">
            <h3 className="text-sm font-mono mb-2">Raw Email Data:</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(selectedEmail, null, 2)}</pre>
          </div>
        )} */}
      </div>
    )
  }
) 