import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { GoogleAuth } from "../components/google-auth"
import { EmailList } from "../components/email-list"

export const Route = createFileRoute("/gmail")({
  component: Gmail
})

function Gmail() {
  const [googleTokens, setGoogleTokens] = useState<{
    access_token: string
    refresh_token: string
  } | null>(null)

  // Load tokens from localStorage on component mount
  useEffect(() => {
    const storedTokens = localStorage.getItem("googleTokens")
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens)
        if (tokens.access_token && tokens.refresh_token) {
          setGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          })
        }
      } catch (error) {
        console.error("Error parsing stored tokens:", error)
      }
    }
  }, [])

  // Listen for token updates
  useEffect(() => {
    const handleStorageChange = () => {
      const storedTokens = localStorage.getItem("googleTokens")
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens)
          setGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          })
        } catch (error) {
          console.error("Error parsing stored tokens:", error)
        }
      } else {
        // Tokens were removed
        setGoogleTokens(null)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    
    // Custom event for same-page updates
    window.addEventListener("googleTokensUpdated", handleStorageChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("googleTokensUpdated", handleStorageChange)
    }
  }, [])

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