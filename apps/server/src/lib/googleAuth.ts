import { OAuth2Client } from "google-auth-library"
import { google, gmail_v1, Auth } from "googleapis"

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "680235656943-s6evnaejjbkppohtl764v3dtqg56p9uq.apps.googleusercontent.com"
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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"
// Updated redirect URI to match exactly what's configured in Google Cloud Console
const REDIRECT_URI = "http://localhost:3001"

// Define required scopes
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts"
]

// Create OAuth client
export function createOAuthClient() {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  })
}

// Generate authorization URL
export function getAuthUrl() {
  const oAuth2Client = createOAuthClient()
  
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent" // Force to get refresh_token
  })
}

// Exchange code for tokens
export async function getTokens(code: string) {
  const oAuth2Client = createOAuthClient()
  const { tokens } = await oAuth2Client.getToken(code)
  return tokens
}

// Get user info
export async function getUserInfo(accessToken: string) {
  const oAuth2Client = createOAuthClient()
  oAuth2Client.setCredentials({ access_token: accessToken })
  
  const auth = new Auth.OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  })
  auth.setCredentials({ access_token: accessToken })
  
  const oauth2 = google.oauth2("v2")
  oauth2.context._options = { auth }
  
  const userInfo = await oauth2.userinfo.get()
  return userInfo.data
}

// Get recent emails
export async function getRecentEmails(accessToken: string, refreshToken: string, maxResults = 300) {
  console.log("Starting email fetch process...")
  
  try {
    const oAuth2Client = createOAuthClient()
    oAuth2Client.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    console.log("OAuth client created and credentials set")
    
    const auth = new Auth.OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: REDIRECT_URI
    })
    auth.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    console.log("Auth client created and credentials set")
    
    const gmail = google.gmail("v1")
    gmail.context._options = { auth }
    
    console.log("Gmail API client initialized")
    
    // Get message list
    console.log("Fetching message list...")
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults,
    })
    
    console.log(`Messages list response status: ${response.status}`)
    console.log(`Number of messages retrieved: ${response.data.messages?.length || 0}`)
    
    const messageIds = response.data.messages || []
    
    if (messageIds.length === 0) {
      console.log("No messages found in the user's inbox")
      return []
    }
    
    // Get full message details for each email
    console.log("Fetching details for each message...")
    const emails = await Promise.all(
      messageIds.map(async (message, index) => {
        try {
          console.log(`Fetching details for message ${index + 1}/${messageIds.length} (ID: ${message.id})`)
          const email = await gmail.users.messages.get({
            userId: "me",
            id: message.id as string,
            format: "full",
          })
          
          console.log(`Successfully fetched details for message ID: ${message.id}`)
          return processEmail(email.data)
        } catch (error: any) {
          console.error(`Error fetching details for message ID ${message.id}:`, error.message)
          // Return partial data instead of failing the entire batch
          return {
            id: message.id,
            threadId: message.threadId,
            error: error.message,
            errorDetails: error
          }
        }
      })
    )
    
    console.log(`Successfully processed ${emails.length} emails`)
    return emails
  } catch (error: any) {
    console.error("Error in getRecentEmails:", error)
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response data'
    })
    
    // Check for specific error types
    if (error.code === 401 || (error.response && error.response.status === 401)) {
      console.error("Authentication error: Token might be expired or invalid")
    } else if (error.code === 403 || (error.response && error.response.status === 403)) {
      console.error("Permission error: Insufficient permissions to access Gmail")
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error("Network error: Unable to connect to Google API")
    }
    
    throw error
  }
}

// Process email to extract relevant data
function processEmail(message: gmail_v1.Schema$Message) {
  // Extract headers
  const headers = message.payload?.headers || []
  const subject = headers.find(h => h.name?.toLowerCase() === "subject")?.value || ""
  const from = headers.find(h => h.name?.toLowerCase() === "from")?.value || ""
  const to = headers.find(h => h.name?.toLowerCase() === "to")?.value || ""
  const date = headers.find(h => h.name?.toLowerCase() === "date")?.value || ""
  
  // Extract body
  let body = ""
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8")
  } else if (message.payload?.parts) {
    // Look for text/plain or text/html parts
    const textPart = message.payload.parts.find(part => 
      part.mimeType === "text/plain" || part.mimeType === "text/html"
    )
    
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8")
    }
  }
  
  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet,
    subject,
    from,
    to,
    date,
    body,
    labelIds: message.labelIds
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oAuth2Client = createOAuthClient()
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oAuth2Client.refreshAccessToken()
  return credentials
}

// Create a draft email
export async function createDraft(
  accessToken: string, 
  refreshToken: string, 
  messageData: { 
    to: string, 
    subject: string, 
    body: string,
    threadId?: string 
  }
) {
  console.log("=== Starting Draft Creation Process ===")
  console.log("Input validation:", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    to: messageData.to,
    subject: messageData.subject,
    hasBody: !!messageData.body,
    threadId: messageData.threadId
  })

  if (!accessToken || !refreshToken) {
    console.error("Missing authentication tokens")
    throw new Error("Authentication tokens are required")
  }

  if (!messageData.to || !messageData.subject || !messageData.body) {
    console.error("Missing required message data:", {
      hasTo: !!messageData.to,
      hasSubject: !!messageData.subject,
      hasBody: !!messageData.body
    })
    throw new Error("To, subject, and body are required fields")
  }

  try {
    console.log("Initializing OAuth client...")
    const auth = new Auth.OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: REDIRECT_URI
    })
    
    console.log("Setting OAuth credentials...")
    auth.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    console.log("Creating Gmail client...")
    const gmail = google.gmail('v1')
    gmail.context._options = { auth }
    
    console.log("Preparing email content...")
    const emailContent = [
      `To: ${messageData.to}`,
      `Subject: ${messageData.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      messageData.body
    ].join('\n');

    console.log("Encoding email content...")
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Creating draft via Gmail API...")
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedEmail,
          threadId: messageData.threadId
        }
      }
    });
    
    console.log("Draft created successfully:", {
      draftId: response.data.id,
      messageId: response.data.message?.id,
      threadId: response.data.message?.threadId
    })
    return response.data;
  } catch (error: any) {
    console.error("Error creating draft:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    // Handle specific error cases
    if (error.code === 401 || (error.response && error.response.status === 401)) {
      throw new Error("Authentication failed. Please re-authenticate.")
    } else if (error.code === 403 || (error.response && error.response.status === 403)) {
      throw new Error("Insufficient permissions to create drafts.")
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error("Network error. Please check your connection.")
    }

    throw new Error(`Failed to create draft: ${error.message}`)
  }
}

// Send an email
export async function sendEmail(
  accessToken: string, 
  refreshToken: string, 
  messageData: { 
    to: string, 
    subject: string, 
    body: string,
    threadId?: string 
  }
) {
  console.log("=== Starting Email Send Process ===")
  console.log("Input validation:", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    to: messageData.to,
    subject: messageData.subject,
    hasBody: !!messageData.body,
    threadId: messageData.threadId
  })

  if (!accessToken || !refreshToken) {
    console.error("Missing authentication tokens")
    throw new Error("Authentication tokens are required")
  }

  if (!messageData.to || !messageData.subject || !messageData.body) {
    console.error("Missing required message data:", {
      hasTo: !!messageData.to,
      hasSubject: !!messageData.subject,
      hasBody: !!messageData.body
    })
    throw new Error("To, subject, and body are required fields")
  }

  try {
    console.log("Initializing OAuth client...")
    const auth = new Auth.OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: REDIRECT_URI
    })
    
    console.log("Setting OAuth credentials...")
    auth.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    console.log("Creating Gmail client...")
    const gmail = google.gmail('v1')
    gmail.context._options = { auth }
    
    console.log("Preparing email content...")
    const emailContent = [
      `To: ${messageData.to}`,
      `Subject: ${messageData.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      messageData.body
    ].join('\n');

    console.log("Encoding email content...")
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Sending email via Gmail API...")
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: messageData.threadId
      }
    });
    
    console.log("Email sent successfully:", {
      messageId: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds
    })
    return response.data;
  } catch (error: any) {
    console.error("Error sending email:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    // Handle specific error cases
    if (error.code === 401 || (error.response && error.response.status === 401)) {
      throw new Error("Authentication failed. Please re-authenticate.")
    } else if (error.code === 403 || (error.response && error.response.status === 403)) {
      throw new Error("Insufficient permissions to send emails.")
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error("Network error. Please check your connection.")
    }

    throw new Error(`Failed to send email: ${error.message}`)
  }
} 