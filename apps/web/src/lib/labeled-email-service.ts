import { authClient } from "./auth-client"

interface LabeledEmailCheck {
  alreadyLabeled: string[]
  needsLabeling: string[]
  labeledDetails: Record<string, {
    labels: string[]
    labeledAt: number
    confidence?: string
  }>
}

interface StoreLabeledRequest {
  gmailId: string
  userId: string
  labels: string[]
  confidence?: string
  reasoning?: string
}

/**
 * Get current user ID from authenticated session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const sessionResult = await authClient.getSession()
    if (!sessionResult || 'error' in sessionResult) return null
    
    const session = sessionResult
    return session.user?.id || session.user?.email || null
  } catch (error) {
    console.error("Error getting current user ID:", error)
    return null
  }
}

/**
 * Check which emails have already been labeled
 */
export async function checkLabeledEmails(gmailIds: string[]): Promise<LabeledEmailCheck> {
  // Get the current session directly
  const sessionResult = await authClient.getSession()
  if (!sessionResult || 'error' in sessionResult) {
    throw new Error("User not authenticated")
  }
  
  // Cast to any to bypass TypeScript's type checking issues
  const session = sessionResult as any
  
  // Use the user ID or email from the session
  const userId = session.user?.id || session.user?.email
  if (!userId) {
    throw new Error("User ID not available")
  }

  const response = await fetch('/api/labeled-emails/check-labeled', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gmailIds,
      userId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to check labeled emails: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to check labeled emails')
  }

  return {
    alreadyLabeled: result.alreadyLabeled,
    needsLabeling: result.needsLabeling,
    labeledDetails: result.labeledDetails,
  }
}

/**
 * Store a newly labeled email
 */
export async function storeLabeledEmail(data: Omit<StoreLabeledRequest, 'userId'>): Promise<void> {
  // Get the current session directly
  const sessionResult = await authClient.getSession()
  if (!sessionResult || 'error' in sessionResult) {
    throw new Error("User not authenticated")
  }
  
  // Cast to any to bypass TypeScript's type checking issues
  const session = sessionResult as any
  
  // Use the user ID or email from the session
  const userId = session.user?.id || session.user?.email
  if (!userId) {
    throw new Error("User ID not available")
  }

  const response = await fetch('/api/labeled-emails/store-labeled', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      userId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to store labeled email: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to store labeled email')
  }
}

/**
 * Filter out already labeled emails from a list
 */
export async function filterUnlabeledEmails<T extends { gmailId: string }>(
  emails: T[]
): Promise<{ unlabeled: T[], alreadyLabeled: T[], labelingInfo: LabeledEmailCheck }> {
  if (emails.length === 0) {
    return {
      unlabeled: [],
      alreadyLabeled: [],
      labelingInfo: {
        alreadyLabeled: [],
        needsLabeling: [],
        labeledDetails: {},
      },
    }
  }
  
  try {
    const gmailIds = emails.map(email => email.gmailId)
    const labelingInfo = await checkLabeledEmails(gmailIds)

  const unlabeled = emails.filter(email => 
    labelingInfo.needsLabeling.includes(email.gmailId)
  )
  
  const alreadyLabeled = emails.filter(email => 
    labelingInfo.alreadyLabeled.includes(email.gmailId)
  )

  return {
    unlabeled,
    alreadyLabeled,
    labelingInfo,
  }
  } catch (error) {
    console.error("Error checking labeled emails:", error)
    // If there's an authentication error, assume all emails need labeling
    // This prevents blocking the labeling process due to auth issues
    return {
      unlabeled: emails,
      alreadyLabeled: [],
      labelingInfo: {
        alreadyLabeled: [],
        needsLabeling: emails.map(email => email.gmailId),
        labeledDetails: {},
      },
    }
  }
} 