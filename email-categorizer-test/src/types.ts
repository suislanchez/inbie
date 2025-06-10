import { z } from "zod"

// Email schema
export const EmailSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  date: z.string()
})

export type Email = z.infer<typeof EmailSchema>

// Categorization result schema
export const CategorySchema = z.enum(["reply", "no_reply"])

export type Category = z.infer<typeof CategorySchema>

// Categorization response schema
export const CategorizationResponseSchema = z.object({
  category: CategorySchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
  suggestedReply: z.string().optional()
})

export type CategorizationResponse = z.infer<typeof CategorizationResponseSchema>

// OpenAI response format
export interface OpenAICategorizationResponse {
  category: Category
  confidence: number
  explanation?: string
  suggestedReply?: string
} 