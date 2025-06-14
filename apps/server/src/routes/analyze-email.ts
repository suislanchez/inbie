import { z } from 'zod'
import { Hono } from 'hono'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

const app = new Hono()

const analyzeEmailSchema = z.object({
  email: z.object({
    subject: z.string(),
    from: z.string(),
    content: z.string(),
    date: z.string(),
  }),
  existingLabels: z.array(z.string()),
})

app.post('/api/analyze-email', async (c) => {
  try {
    const body = await c.req.json()
    const { email, existingLabels } = analyzeEmailSchema.parse(body)
    
    // Get API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500)
    }
    
    const prompt = `Analyze this email and provide categorization and reply recommendations:

Email:
- Subject: ${email.subject}
- From: ${email.from}
- Date: ${email.date}
- Content: ${email.content}

Available Labels: ${existingLabels.join(', ')}

Please respond with a JSON object containing:
1. suggestedLabels: array of 1-3 most appropriate labels from the available labels (or suggest new ones if none fit)
2. needsReply: boolean indicating if this email requires a response
3. suggestedReply: if needsReply is true, provide a professional reply (otherwise omit this field)
4. confidence: number between 0-1 indicating confidence in categorization
5. reasoning: brief explanation of your decisions

Focus on:
- Business/professional emails often need replies
- Newsletters, notifications, automated emails usually don't need replies
- Meeting invites, questions, requests typically need replies
- Use existing labels when possible, suggest new ones only when necessary`

    const result = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.3,
    })
    
    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI')
    }
    
    const analysis = JSON.parse(jsonMatch[0])
    
    return c.json(analysis)
  } catch (error) {
    console.error('Error analyzing email:', error)
    return c.json({ error: 'Failed to analyze email' }, 500)
  }
})

export default app 