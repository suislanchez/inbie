import { OpenAI } from 'openai'
import { z } from 'zod'

const emailSchema = z.object({
  subject: z.string(),
  from: z.string(),
  content: z.string().optional(),
  date: z.string().optional(),
})

const requestSchema = z.object({
  email: emailSchema,
  existingLabels: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const { email, existingLabels } = requestSchema.parse(body)

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Prepare the prompt
    const prompt = `Analyze this email and suggest appropriate labels from the existing labels. If no existing labels fit, suggest new ones.

Email Details:
Subject: ${email.subject}
From: ${email.from}
${email.date ? `Date: ${email.date}` : ''}
${email.content ? `Content: ${email.content}` : ''}

Existing Labels:
${existingLabels.join(', ')}

Please analyze the email and:
1. Suggest up to 3 most relevant labels from the existing labels
2. If no existing labels fit well, suggest new label names
3. Provide a confidence score (0-1) for your suggestions
4. Briefly explain your reasoning

Respond in this JSON format:
{
  "suggestedLabels": ["label1", "label2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of why these labels were chosen"
}`

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert email organizer. Your task is to analyze emails and suggest appropriate labels based on their content and context. Be concise and precise in your suggestions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    // Parse OpenAI response
    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    // Return the analysis
    return new Response(JSON.stringify(analysis), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error analyzing email:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to analyze email',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 