import { useState } from "react"
import { trpc } from "../lib/trpc"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

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

export function EmailList({ accessToken, refreshToken }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("list")

  const fetchEmails = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await trpc.google.getRecentEmails.query({
        accessToken,
        refreshToken,
        maxResults: 10
      })
      
      setEmails(response.emails)
      
      // Select first email by default if available
      if (response.emails && response.emails.length > 0) {
        setSelectedEmail(response.emails[0])
      }
      
      setActiveTab("list")
    } catch (error) {
      console.error("Error fetching emails:", error)
      setError("Failed to fetch emails. Please try again.")
      
      // If token expired, handle refresh or prompt to login again
      if (error instanceof Error && error.message.includes("unauthorized")) {
        setError("Your session has expired. Please sign in again.")
        // Could implement token refresh here if needed
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    setActiveTab("view")
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Your Emails</h2>
        <Button onClick={fetchEmails} disabled={isLoading}>
          {isLoading ? "Loading..." : "Fetch Recent Emails"}
        </Button>
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