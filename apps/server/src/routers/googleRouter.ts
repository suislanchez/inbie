import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { publicProcedure, router } from "../lib/trpc"
import {
  getAuthUrl,
  getTokens,
  getUserInfo,
  getRecentEmails,
  refreshAccessToken,
  createDraft,
  sendEmail
} from "../lib/googleAuth"

export const googleRouter = router({
  // Get authorization URL
  getAuthUrl: publicProcedure
    .query(async () => {
      try {
        const url = getAuthUrl()
        return { url }
      } catch (error) {
        console.error("Error generating auth URL:", error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate authentication URL"
        })
      }
    }),

  // Exchange authorization code for tokens
  getTokens: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const tokens = await getTokens(input.code)
        
        if (!tokens.access_token) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to get access token"
          })
        }
        
        // Get user info
        const userInfo = await getUserInfo(tokens.access_token)
        
        console.log("Tokens received:", {
          access_token: tokens.access_token ? `${tokens.access_token.substring(0, 10)}...` : undefined,
          refresh_token: tokens.refresh_token ? `${tokens.refresh_token.substring(0, 10)}...` : undefined,
          expiry_date: tokens.expiry_date
        })
        console.log("User info received:", userInfo)
        
        return {
          tokens,
          user: userInfo
        }
      } catch (error) {
        console.error("Error exchanging code for tokens:", error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate with Google"
        })
      }
    }),

  // Get recent emails
  getRecentEmails: publicProcedure
    .input(z.object({ 
      accessToken: z.string(),
      refreshToken: z.string(),
      maxResults: z.number().optional()
    }))
    .query(async ({ input }) => {
      console.log("getRecentEmails called with:", {
        accessToken: input.accessToken ? `${input.accessToken.substring(0, 10)}...` : undefined,
        refreshToken: input.refreshToken ? `${input.refreshToken.substring(0, 10)}...` : undefined,
        maxResults: input.maxResults
      })
      
      try {
        const emails = await getRecentEmails(
          input.accessToken,
          input.refreshToken,
          input.maxResults
        )
        
  
        return { emails }
      } catch (error) {
        console.error("Error fetching emails:", error)
        
        // Check if token expired
        if (error instanceof Error && error.message.includes("invalid_grant")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token expired. Please re-authenticate."
          })
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch emails"
        })
      }
    }),

  // Refresh access token
  refreshAccessToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const credentials = await refreshAccessToken(input.refreshToken)
        return { credentials }
      } catch (error) {
        console.error("Error refreshing token:", error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to refresh access token"
        })
      }
    }),

  // Create a draft email
  createDraft: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      messageData: z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        threadId: z.string().optional()
      })
    }))
    .mutation(async ({ input }) => {
      try {
        const draft = await createDraft(
          input.accessToken,
          input.refreshToken,
          input.messageData
        )
        return { draft }
      } catch (error) {
        console.error("Error creating draft:", error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create draft"
        })
      }
    }),

  // Send an email
  sendEmail: publicProcedure
    .input(z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      messageData: z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        threadId: z.string().optional()
      })
    }))
    .mutation(async ({ input }) => {
      try {
        const message = await sendEmail(
          input.accessToken,
          input.refreshToken,
          input.messageData
        )
        return { message }
      } catch (error) {
        console.error("Error sending email:", error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to send email"
        })
      }
    })
}) 