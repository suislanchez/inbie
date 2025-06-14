import { trpc } from './trpc'

export interface ProcessedEmail {
  id: string
  originalEmail: any
  suggestedLabels: string[]
  needsReply: boolean
  replyDraft?: string
  confidence: number
  reasoning: string
}

export interface ProcessEmailOptions {
  accessToken: string
  refreshToken: string
  openaiApiKey: string
}

export async function processEmailWithAI(
  email: any,
  options: ProcessEmailOptions
): Promise<ProcessedEmail> {
  try {
    // Step 1: Get existing Gmail labels
    const labelsResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': `Bearer ${options.accessToken}`,
        },
      }
    )
    
    if (!labelsResponse.ok) {
      throw new Error(`Failed to fetch labels: ${labelsResponse.statusText}`)
    }
    
    const labelsData = await labelsResponse.json()
    const existingLabels = labelsData.labels
      .filter((label: any) => label.type === 'user')
      .map((label: any) => label.name)

    // Step 2: Use OpenAI to categorize and determine if reply is needed
    const analysisResponse = await fetch('/api/analyze-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: {
          subject: email.subject,
          from: email.from,
          content: email.body || email.snippet,
          date: email.date,
        },
        existingLabels,
      }),
    })

    if (!analysisResponse.ok) {
      throw new Error(`Failed to analyze email: ${analysisResponse.statusText}`)
    }

    const analysis = await analysisResponse.json()

    // Step 3: Apply labels to Gmail
    if (analysis.suggestedLabels.length > 0) {
      const labelIds = await getLabelIds(analysis.suggestedLabels, options.accessToken)
      
      if (labelIds.length > 0) {
        await applyLabelsToEmail(email.id, labelIds, options.accessToken)
      }
    }

    // Step 4: Create draft reply if needed
    let replyDraft = undefined
    if (analysis.needsReply && analysis.suggestedReply) {
      replyDraft = await createDraftReply(email, analysis.suggestedReply, options)
    }

    return {
      id: email.id,
      originalEmail: email,
      suggestedLabels: analysis.suggestedLabels,
      needsReply: analysis.needsReply,
      replyDraft,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
    }
  } catch (error) {
    console.error('Error processing email:', error)
    throw error
  }
}

async function getLabelIds(labelNames: string[], accessToken: string): Promise<string[]> {
  const labelsResponse = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  
  const labelsData = await labelsResponse.json()
  const labelIds: string[] = []
  
  for (const labelName of labelNames) {
    const existingLabel = labelsData.labels.find(
      (label: any) => label.name.toLowerCase() === labelName.toLowerCase()
    )
    
    if (existingLabel) {
      labelIds.push(existingLabel.id)
    } else {
      // Create new label if it doesn't exist
      const newLabel = await createLabel(labelName, accessToken)
      labelIds.push(newLabel.id)
    }
  }
  
  return labelIds
}

async function createLabel(name: string, accessToken: string) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to create label: ${response.statusText}`)
  }
  
  return await response.json()
}

async function applyLabelsToEmail(messageId: string, labelIds: string[], accessToken: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: labelIds,
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to apply labels: ${response.statusText}`)
  }
  
  return await response.json()
}

async function createDraftReply(
  originalEmail: any,
  replyContent: string,
  options: ProcessEmailOptions
) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          threadId: originalEmail.threadId,
          raw: btoa(
            `To: ${originalEmail.from}\r\n` +
            `Subject: Re: ${originalEmail.subject}\r\n` +
            `In-Reply-To: ${originalEmail.id}\r\n` +
            `References: ${originalEmail.id}\r\n` +
            `\r\n` +
            `${replyContent}`
          ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        },
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to create draft: ${response.statusText}`)
  }
  
  return await response.json()
} 