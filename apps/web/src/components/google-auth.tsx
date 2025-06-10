import { useState, useEffect } from "react"
import { trpc } from "../lib/trpc"
import { Button } from "./ui/button"
import { useNavigate } from "@tanstack/react-router"
import { debugEvents } from "./debug-overlay"

interface GoogleTokens {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  expiry_date: number
}

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
}

interface GoogleAuthState {
  isAuthenticated: boolean
  tokens: GoogleTokens | null
  user: GoogleUser | null
  error: string | null
  isLoading: boolean
}

export function GoogleAuth() {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    tokens: null,
    user: null,
    error: null,
    isLoading: false
  })

  // Check for auth code in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")
    
    if (code) {
      // Direct console log for debugging
      console.log("📌 AUTH CODE FOUND:", code.substring(0, 10) + "...")
      console.log("📌 CURRENT PATH:", window.location.pathname)
      console.log("📌 FULL URL:", window.location.href)
      
      debugEvents.addEntry(`Found auth code in URL: ${code.substring(0, 10)}...`, "info")
      handleGoogleCallback(code)
      // Remove code from URL to prevent reprocessing on refresh
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Check if we have tokens in localStorage
      const storedTokens = localStorage.getItem("googleTokens")
      if (storedTokens) {
        debugEvents.addEntry("Found stored Google tokens", "info")
        try {
          const tokens = JSON.parse(storedTokens)
          const storedUser = localStorage.getItem("googleUser")
          const user = storedUser ? JSON.parse(storedUser) : null
          
          setAuthState({
            isAuthenticated: true,
            tokens,
            user,
            error: null,
            isLoading: false
          })
          debugEvents.addEntry(`Restored auth state for user: ${user?.email || "unknown"}`, "success")
        } catch (error) {
          console.error("Error parsing stored tokens:", error)
          debugEvents.addEntry("Error parsing stored tokens", "error")
          localStorage.removeItem("googleTokens")
          localStorage.removeItem("googleUser")
        }
      } else {
        debugEvents.addEntry("No stored Google tokens found", "info")
      }
    }
  }, [])

  const handleLogin = async () => {
    debugEvents.addEntry("Starting Google login flow", "info")
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await trpc.google.getAuthUrl.query()
      debugEvents.addEntry(`Got auth URL: ${response.url.substring(0, 30)}...`, "success")
      window.location.href = response.url
    } catch (error) {
      console.error("Error getting auth URL:", error)
      debugEvents.addEntry("Failed to get auth URL", "error")
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to initiate Google login"
      }))
    }
  }

  const handleGoogleCallback = async (code: string) => {
    debugEvents.addEntry("Processing Google auth callback", "info")
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      debugEvents.addEntry("Exchanging code for tokens...", "info")
      const response = await trpc.google.getTokens.mutate({ code })
      
      const { tokens, user } = response
      debugEvents.addEntry(`Got tokens for user: ${user.email}`, "success")
      
      // Store tokens and user info
      localStorage.setItem("googleTokens", JSON.stringify(tokens))
      localStorage.setItem("googleUser", JSON.stringify(user))
      
      // Dispatch storage event for other components to detect the change
      debugEvents.addEntry("Dispatching token update event", "info")
      window.dispatchEvent(new Event("googleTokensUpdated"))
      
      setAuthState({
        isAuthenticated: true,
        tokens: tokens as GoogleTokens,
        user: user as GoogleUser,
        error: null,
        isLoading: false
      })
      
      // Navigate to Gmail route after successful authentication
      if (window.location.pathname !== "/gmail") {
        debugEvents.addEntry("Navigating to Gmail page", "info")
        navigate({ to: "/gmail" })
      }
    } catch (error) {
      console.error("Error exchanging code for tokens:", error)
      debugEvents.addEntry(`Auth error: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to complete authentication"
      }))
    }
  }

  const handleLogout = () => {
    debugEvents.addEntry("Logging out of Google", "info")
    // Clear stored tokens and state
    localStorage.removeItem("googleTokens")
    localStorage.removeItem("googleUser")
    
    // Dispatch storage event for other components to detect the change
    window.dispatchEvent(new Event("googleTokensUpdated"))
    
    setAuthState({
      isAuthenticated: false,
      tokens: null,
      user: null,
      error: null,
      isLoading: false
    })
    debugEvents.addEntry("Logout complete", "success")
  }

  return (
    <div className="flex flex-col gap-4">
      {authState.isAuthenticated ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {authState.user?.picture && (
              <img 
                src={authState.user.picture} 
                alt="Profile" 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{authState.user?.name}</p>
              <p className="text-sm text-gray-500">{authState.user?.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout}>Sign Out of Google</Button>
        </div>
      ) : (
        <Button 
          onClick={handleLogin} 
          disabled={authState.isLoading}
        >
          {authState.isLoading ? "Loading..." : "Sign In with Google"}
        </Button>
      )}
      
      {authState.error && (
        <p className="text-red-500 text-sm">{authState.error}</p>
      )}
    </div>
  )
} 