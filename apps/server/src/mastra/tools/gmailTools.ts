import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { getLabelList, labelEmail, createLabel } from "@/lib/gmail"

export const getGmailLabels = createTool({
  id: "get_gmail_labels",
  inputSchema: z.object({
    accessToken: z.string(),
  }),
  description: "Get all Gmail labels for the user",
  execute: async ({ context: { accessToken } }) => {
    try {
      const labels = await getLabelList(accessToken)
      return { success: true, labels }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }
})

export const addEmailLabel = createTool({
  id: "add_email_label",
  inputSchema: z.object({
    accessToken: z.string(),
    messageId: z.string(),
    labelIds: z.array(z.string()),
  }),
  description: "Add labels to a Gmail message",
  execute: async ({ context: { accessToken, messageId, labelIds } }) => {
    try {
      const result = await labelEmail(accessToken, messageId, labelIds)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }
})

export const createGmailLabel = createTool({
  id: "create_gmail_label",
  inputSchema: z.object({
    accessToken: z.string(),
    name: z.string(),
  }),
  description: "Create a new Gmail label",
  execute: async ({ context: { accessToken, name } }) => {
    try {
      const label = await createLabel(accessToken, name)
      return { success: true, label }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }
}) 