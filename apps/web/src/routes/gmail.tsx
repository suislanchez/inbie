import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useRef } from "react"
import { GoogleAuth } from "../components/google-auth"
import { EmailList } from "../components/email-list"
import { debugEvents } from "../components/debug-overlay"

export const Route = createFileRoute("/gmail")({
  component: Gmail
})

function Gmail() {
  const [googleTokens, setGoogleTokens] = useState<{
    access_token: string
    refresh_token: string
  } | null>(null)
  
  const emailListRef = useRef<{ fetchEmails: () => Promise<void> } | null>(null)

  // Debug component mount
  useEffect(() => {
    debugEvents.addEntry("Gmail component mounted", "info")
    return () => {
      debugEvents.addEntry("Gmail component unmounted", "info")
    }
  }, [])

  // Load tokens from localStorage on component mount
  useEffect(() => {
    debugEvents.addEntry("Checking for stored tokens in Gmail component", "info")
    const storedTokens = localStorage.getItem("googleTokens")
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens)
        if (tokens.access_token && tokens.refresh_token) {
          debugEvents.addEntry("Found valid tokens in localStorage", "success")
          setGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          })
        } else {
          debugEvents.addEntry("Tokens found but missing required fields", "warning")
        }
      } catch (error) {
        console.error("Error parsing stored tokens:", error)
        debugEvents.addEntry("Error parsing stored tokens in Gmail component", "error")
      }
    } else {
      debugEvents.addEntry("No stored tokens found in Gmail component", "info")
    }
  }, [])

  // Listen for token updates
  useEffect(() => {
    const handleStorageChange = () => {
      debugEvents.addEntry("Storage change detected in Gmail component", "info")
      const storedTokens = localStorage.getItem("googleTokens")
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens)
          debugEvents.addEntry("Updated tokens from storage event", "success")
          setGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          })
        } catch (error) {
          console.error("Error parsing stored tokens:", error)
          debugEvents.addEntry("Error parsing updated tokens", "error")
        }
      } else {
        // Tokens were removed
        debugEvents.addEntry("Tokens removed from storage", "warning")
        setGoogleTokens(null)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    
    // Custom event for same-page updates
    const handleTokensUpdated = () => {
      debugEvents.addEntry("Token update event received in Gmail component", "info")
      const storedTokens = localStorage.getItem("googleTokens")
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens)
          setGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          })
          debugEvents.addEntry("Tokens updated from custom event", "success")
        } catch (error) {
          debugEvents.addEntry("Error parsing tokens from custom event", "error")
        }
      } else {
        setGoogleTokens(null)
        debugEvents.addEntry("Tokens cleared from custom event", "warning")
      }
    }
    
    window.addEventListener("googleTokensUpdated", handleTokensUpdated)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("googleTokensUpdated", handleTokensUpdated)
    }
  }, [])

  // Auto fetch emails when tokens become available
  useEffect(() => {
    if (googleTokens && emailListRef.current) {
      debugEvents.addEntry("Auto-fetching emails after tokens available", "info")
      // Fetch emails automatically
      emailListRef.current.fetchEmails().catch(error => {
        console.error("Failed to auto-fetch emails:", error)
        debugEvents.addEntry(`Auto-fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      })
    }
  }, [googleTokens])

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Gmail Integration</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4">Google Account</h2>
        <GoogleAuth />
      </div>
      
      {googleTokens ? (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <EmailList 
            accessToken={googleTokens.access_token}
            refreshToken={googleTokens.refresh_token}
            ref={emailListRef}
          />
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-600">
            Please sign in with your Google account to access your emails.
          </p>
        </div>
      )}
    </div>
  )
} 