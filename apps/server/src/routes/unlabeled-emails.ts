import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const accessToken = authHeader.split(' ')[1]
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Search for emails without any user labels
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: '-label:important -label:starred -label:unread -label:sent has:nouserlabels',
      maxResults: 10 // Limit to 10 emails per batch
    })

    if (!response.data.messages) {
      return new Response(JSON.stringify({ emails: [] }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch full details for each email
    const emails = await Promise.all(
      response.data.messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        })

        const headers = details.data.payload?.headers
        const subject = headers?.find(h => h.name === 'Subject')?.value || ''
        const from = headers?.find(h => h.name === 'From')?.value || ''
        const date = headers?.find(h => h.name === 'Date')?.value || ''

        // Get email content
        let content = ''
        if (details.data.payload?.parts) {
          const textPart = details.data.payload.parts.find(part => part.mimeType === 'text/plain')
          if (textPart?.body?.data) {
            content = Buffer.from(textPart.body.data, 'base64').toString()
          }
        } else if (details.data.payload?.body?.data) {
          content = Buffer.from(details.data.payload.body.data, 'base64').toString()
        }

        return {
          id: message.id,
          threadId: message.threadId,
          subject,
          from,
          date,
          content,
          labelIds: details.data.labelIds || []
        }
      })
    )

    return new Response(JSON.stringify({ emails }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching unlabeled emails:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch unlabeled emails' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 