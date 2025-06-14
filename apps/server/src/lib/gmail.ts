export async function getLabelList(accessToken: string) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch labels: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.labels
}

export async function labelEmail(accessToken: string, messageId: string, labelIds: string[]) {
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
    throw new Error(`Failed to label email: ${response.statusText}`)
  }
  
  return await response.json()
}

export async function createLabel(accessToken: string, name: string) {
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