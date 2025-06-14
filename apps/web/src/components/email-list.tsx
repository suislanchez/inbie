import { useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { trpc } from "../lib/trpc"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { debugEvents } from "./debug-overlay"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { toast } from "sonner"
import { processEmailWithAI } from "../lib/ai-email-processor"
import { 
  Mail, 
  Star, 
  StarOff, 
  Archive, 
  Trash2, 
  RefreshCw, 
  ChevronLeft,
  Clock,
  Paperclip,
  Tag,
  Calendar,
  Bell,
  Receipt,
  MessageSquare,
  ShoppingBag,
  Newspaper,
  Sparkles,
  Bot,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  getEmails: () => Email[]
}

interface Label {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  count?: number
}

const EMAIL_LABELS: Label[] = [
  {
    id: "inbox",
    name: "Inbox",
    icon: <Mail className="h-4 w-4" />,
    color: "text-blue-500"
  },
  {
    id: "awaiting-reply",
    name: "Awaiting Reply",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-orange-500"
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-green-500"
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: <ShoppingBag className="h-4 w-4" />,
    color: "text-purple-500"
  },
  {
    id: "newsletter",
    name: "Newsletter",
    icon: <Newspaper className="h-4 w-4" />,
    color: "text-yellow-500"
  },
  {
    id: "notification",
    name: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    color: "text-red-500"
  },
  {
    id: "receipt",
    name: "Receipts",
    icon: <Receipt className="h-4 w-4" />,
    color: "text-gray-500"
  }
]

// Move emailStyles outside the component
const emailStyles = `
  .email-body {
    @apply text-gray-800 leading-relaxed;
  }

  /* Basic text elements */
  .email-body p {
    @apply my-2;
  }

  /* Links */
  .email-body a {
    @apply text-blue-600 hover:underline break-all;
  }

  /* Images */
  .email-body img {
    @apply max-w-full h-auto rounded-lg my-4;
  }

  /* Blockquotes */
  .email-body blockquote {
    @apply border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600;
  }

  /* Code blocks */
  .email-body pre {
    @apply bg-gray-50 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono;
  }

  /* Tables */
  .email-body table {
    @apply border-collapse w-full my-4 text-sm;
  }
  .email-body th, .email-body td {
    @apply border border-gray-200 p-2;
  }
  .email-body th {
    @apply bg-gray-50 font-medium;
  }

  /* Email footers */
  .email-body .email-footer {
    @apply mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500;
  }
  .email-body .email-footer p {
    @apply my-1;
  }
  .email-body .email-footer a {
    @apply text-gray-600 hover:text-gray-900;
  }

  /* Special content sections */
  .email-body .special-content {
    @apply bg-gray-50 p-4 rounded-lg my-4 text-sm;
  }
  .email-body .special-content a {
    @apply text-gray-600 hover:text-gray-900;
  }

  /* Lists */
  .email-body ul, .email-body ol {
    @apply my-4 pl-6;
  }
  .email-body li {
    @apply my-1;
  }

  /* Horizontal rules */
  .email-body hr {
    @apply my-6 border-t border-gray-200;
  }

  /* Small text and disclaimers */
  .email-body small, .email-body .disclaimer {
    @apply text-xs text-gray-500 block my-2;
  }

  /* Copyright notices */
  .email-body .copyright {
    @apply text-xs text-gray-400 mt-4;
  }

  /* Unsubscribe and help links */
  .email-body .unsubscribe-links {
    @apply text-xs text-gray-500 mt-2 space-y-1;
  }
  .email-body .unsubscribe-links a {
    @apply text-gray-600 hover:text-gray-900;
  }

  /* Company information */
  .email-body .company-info {
    @apply text-xs text-gray-400 mt-2;
  }

  /* Break long words and URLs */
  .email-body * {
    @apply break-words;
  }
`

export const EmailList = forwardRef<EmailListRef, EmailListProps>(
  function EmailList({ accessToken, refreshToken }: EmailListProps, ref: React.ForwardedRef<EmailListRef>) {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("list")
    const [selectedLabel, setSelectedLabel] = useState<string>("inbox")
    const [labelCounts, setLabelCounts] = useState<Record<string, number>>({})
    const [processingEmails, setProcessingEmails] = useState<Set<string>>(new Set())

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
          maxResults: 100
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
        updateLabelCounts(validEmails)
        
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

    // Expose the fetchEmails and getEmails methods via ref
    useImperativeHandle(ref, () => ({
      fetchEmails,
      getEmails: () => emails
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

    // Helper function to get initials for avatar
    const getInitials = (email: string) => {
      const name = extractName(email)
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    // Helper to check if email has attachments
    const hasAttachments = (email: Email) => {
      return email.labelIds?.includes('HAS_ATTACHMENT') || false
    }

    // Helper to format relative time
    const getRelativeTime = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffInHours < 48) {
        return 'Yesterday'
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    }

    // Add type for processEmailBody
    const processEmailBody = (html: string): string => {
      if (typeof document === 'undefined') return html // Handle SSR
      
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html

      // Find and wrap footer content
      const footerContent = Array.from(tempDiv.querySelectorAll('p')).filter(p => {
        const text = p.textContent || ''
        return text.includes('Unsubscribe') || 
               text.includes('©') || 
               text.includes('Help:') ||
               text.includes('Learn why we included this')
      })

      if (footerContent.length > 0) {
        const footer = document.createElement('div')
        footer.className = 'email-footer'
        footerContent.forEach(p => {
          footer.appendChild(p.cloneNode(true))
          p.remove()
        })
        tempDiv.appendChild(footer)
      }

      // Process special content sections
      const specialContent = Array.from(tempDiv.querySelectorAll('p')).filter(p => {
        const text = p.textContent || ''
        return text.includes('This email was intended for') ||
               text.includes('Learn why we included this')
      })

      if (specialContent.length > 0) {
        const specialDiv = document.createElement('div')
        specialDiv.className = 'special-content'
        specialContent.forEach(p => {
          specialDiv.appendChild(p.cloneNode(true))
          p.remove()
        })
        tempDiv.insertBefore(specialDiv, tempDiv.firstChild)
      }

      return tempDiv.innerHTML
    }

    // Add this function to filter emails by label
    const getEmailsForLabel = (labelId: string): Email[] => {
      if (labelId === "inbox") return emails
      return emails.filter(email => email.labelIds?.includes(labelId.toUpperCase()))
    }

    // Add this function to update label counts
    const updateLabelCounts = (emails: Email[]) => {
      const counts: Record<string, number> = {}
      EMAIL_LABELS.forEach(label => {
        if (label.id === "inbox") {
          counts[label.id] = emails.length
        } else {
          counts[label.id] = emails.filter(email => 
            email.labelIds?.includes(label.id.toUpperCase())
          ).length
        }
      })
      setLabelCounts(counts)
    }

    const handleAIProcess = async (email: Email, event: React.MouseEvent) => {
      event.stopPropagation() // Prevent triggering email selection
      
      if (processingEmails.has(email.id)) {
        return // Already processing
      }

      setProcessingEmails(prev => new Set(prev).add(email.id))
      
      try {
        toast.info("Processing email with AI...", {
          description: `Analyzing "${email.subject}" for categorization and replies`
        })

        const result = await processEmailWithAI(
          {
            id: email.id,
            threadId: email.threadId,
            subject: email.subject,
            from: email.from,
            body: email.body || email.snippet,
            date: email.date,
          },
          {
            accessToken,
            refreshToken,
            openaiApiKey: '' // API key will be retrieved from server environment
          }
        )

        toast.success("AI processing completed!", {
          description: `Suggested ${result.suggestedLabels.length} labels. ${result.needsReply ? 'Reply draft created.' : 'No reply needed.'}`
        })

        debugEvents.addEntry(`AI processed email: ${email.subject}`, "success")
        debugEvents.addEntry(`Suggested labels: ${result.suggestedLabels.join(", ")}`, "info")
        debugEvents.addEntry(`Needs reply: ${result.needsReply}`, "info")
        debugEvents.addEntry(`Confidence: ${result.confidence}`, "info")

      } catch (error) {
        toast.error("AI processing failed", {
          description: error instanceof Error ? error.message : "Unknown error occurred"
        })
        
        debugEvents.addEntry(`AI processing failed for: ${email.subject}`, "error")
        debugEvents.addEntry(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      } finally {
        setProcessingEmails(prev => {
          const newSet = new Set(prev)
          newSet.delete(email.id)
          return newSet
        })
      }
    }

    return (
      <div className="w-full max-w-6xl mx-auto h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-gray-50 p-4">
          <div className="space-y-1">
            {EMAIL_LABELS.map((label) => (
              <button
                key={label.id}
                onClick={() => setSelectedLabel(label.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedLabel === label.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                )}
              >
                <span className={label.color}>{label.icon}</span>
                <span className="flex-1 text-left">{label.name}</span>
                {labelCounts[label.id] > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {labelCounts[label.id]}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Inbox</h2>
              <Badge variant="secondary" className="ml-2">
                {emails.length} messages
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={debugEmails} variant="outline" size="sm">
                Debug
              </Button>
              <Button 
                onClick={fetchEmails} 
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="p-3 m-4 text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          <div className="flex-1 flex overflow-hidden">
            {/* Email List Panel */}
            <div className={cn(
              "w-1/2 border-r transition-all duration-300",
              activeTab === "view" ? "hidden md:block md:w-1/3" : "w-full md:w-1/2"
            )}>
              <ScrollArea className="h-full">
                {getEmailsForLabel(selectedLabel).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                    <Mail className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">
                      {isLoading ? "Loading emails..." : `No emails in ${EMAIL_LABELS.find(l => l.id === selectedLabel)?.name}`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {getEmailsForLabel(selectedLabel).map((email) => (
                      <div
                        key={email.id}
                        className={cn(
                          "p-4 cursor-pointer transition-colors hover:bg-gray-50",
                          selectedEmail?.id === email.id && "bg-gray-50"
                        )}
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="flex gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(email.from)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {extractName(email.from)}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                  {email.subject || "(No subject)"}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleAIProcess(email, e)}
                                    disabled={processingEmails.has(email.id)}
                                    className="h-8 w-8 p-0 hover:bg-purple-50"
                                    title="Process with AI"
                                  >
                                    {processingEmails.has(email.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                    ) : (
                                      <Sparkles className="h-4 w-4 text-purple-600" />
                                    )}
                                  </Button>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {getRelativeTime(email.date)}
                                  </span>
                                </div>
                                {hasAttachments(email) && (
                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {email.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Email View Panel */}
            <div className={cn(
              "flex-1 transition-all duration-300",
              activeTab === "view" ? "block" : "hidden md:block"
            )}>
              {selectedEmail ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setActiveTab("list")}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <div className="flex-1 flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <h1 className="text-xl font-semibold mb-4">
                      {selectedEmail.subject || "(No subject)"}
                    </h1>
                    
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(selectedEmail.from)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{extractName(selectedEmail.from)}</p>
                            <p className="text-sm text-gray-500">{selectedEmail.from}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(selectedEmail.date)}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">To: {selectedEmail.to}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="prose max-w-none">
                      {selectedEmail.body ? (
                        <div 
                          className="email-body"
                          dangerouslySetInnerHTML={{ 
                            __html: processEmailBody(selectedEmail.body)
                          }} 
                        />
                      ) : (
                        <div className="text-gray-600">{selectedEmail.snippet}</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <Mail className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-center">Select an email to view</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

// Add styles to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = emailStyles
  document.head.appendChild(style)
} 