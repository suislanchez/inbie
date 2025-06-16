export async function getLabelList(accessToken: string) {
  console.log("🟡 GMAIL LIB: getLabelList called");
  console.log("🟡 GMAIL LIB: Token (first 20 chars):", accessToken.substring(0, 20) + "...");
  console.log("🟡 GMAIL LIB: Token length:", accessToken.length);
  
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  
  console.log("🟡 GMAIL LIB: Response status:", response.status);
  console.log("🟡 GMAIL LIB: Response status text:", response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔴 GMAIL LIB: Error response body:", errorText);
    throw new Error(`Failed to fetch labels: ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json()
  console.log("🟢 GMAIL LIB: Successfully fetched labels, count:", data.labels?.length || 0);
  return data.labels
}

export async function labelEmail(accessToken: string, messageId: string, labelIds: string[]) {
  console.log("🟡 GMAIL LIB: labelEmail called");
  console.log("🟡 GMAIL LIB: messageId:", messageId);
  console.log("🟡 GMAIL LIB: labelIds:", labelIds);
  console.log("🟡 GMAIL LIB: Token (first 20 chars):", accessToken.substring(0, 20) + "...");
  
  // The messageId from Gmail API is already in base64url format
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
  console.log("🟡 GMAIL LIB: Request URL:", url);
  
  const body = JSON.stringify({
    addLabelIds: labelIds,
  });
  console.log("🟡 GMAIL LIB: Request body:", body);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body
  })
  
  console.log("🟡 GMAIL LIB: Response status:", response.status);
  console.log("🟡 GMAIL LIB: Response status text:", response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔴 GMAIL LIB: Error response body:", errorText);
    throw new Error(`Failed to label email: ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json();
  console.log("🟢 GMAIL LIB: Successfully labeled email:", data);
  return data
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