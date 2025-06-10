import { useState, useEffect } from "react"

interface DebugEntry {
  timestamp: number
  message: string
  type: "info" | "error" | "success" | "warning"
}

interface DebugState {
  entries: DebugEntry[]
  isVisible: boolean
}

// Create a global event bus for debug messages
export const debugEvents = {
  addEntry: (message: string, type: DebugEntry["type"] = "info") => {
    window.dispatchEvent(
      new CustomEvent("debug-add-entry", {
        detail: { message, type }
      })
    )
  }
}

export function DebugOverlay() {
  const [debugState, setDebugState] = useState<DebugState>({
    entries: [],
    isVisible: true
  })

  useEffect(() => {
    // Listen for debug entries
    const handleAddEntry = (event: CustomEvent<{ message: string; type: DebugEntry["type"] }>) => {
      const { message, type } = event.detail
      
      setDebugState(prev => ({
        ...prev,
        entries: [
          {
            timestamp: Date.now(),
            message,
            type
          },
          ...prev.entries
        ].slice(0, 20) // Keep only the latest 20 entries
      }))
    }

    window.addEventListener("debug-add-entry", handleAddEntry as EventListener)
    
    // Monitor localStorage changes for auth tokens
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "googleTokens") {
        if (event.newValue) {
          debugEvents.addEntry("Google tokens updated in localStorage", "success")
        } else {
          debugEvents.addEntry("Google tokens removed from localStorage", "warning")
        }
      }
    }
    
    window.addEventListener("storage", handleStorageChange)
    
    // Also track googleTokensUpdated custom event
    const handleTokensUpdated = () => {
      debugEvents.addEntry("Google tokens updated via custom event", "success")
    }
    
    window.addEventListener("googleTokensUpdated", handleTokensUpdated)
    
    // Add entry for component mount
    debugEvents.addEntry("Debug overlay initialized", "info")
    
    return () => {
      window.removeEventListener("debug-add-entry", handleAddEntry as EventListener)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("googleTokensUpdated", handleTokensUpdated)
    }
  }, [])
  
  const toggleVisibility = () => {
    setDebugState(prev => ({
      ...prev,
      isVisible: !prev.isVisible
    }))
  }
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  
  // CSS classes for different message types
  const typeClasses = {
    info: "text-blue-500",
    error: "text-red-500",
    success: "text-green-500",
    warning: "text-yellow-500"
  }

  if (!debugState.isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed top-2 right-2 z-50 bg-gray-800 text-white p-2 rounded-md opacity-50 hover:opacity-100"
      >
        Show Debug
      </button>
    )
  }

  return (
    <div className="fixed top-2 right-2 z-50 w-96 max-h-[50vh] bg-gray-800 bg-opacity-90 text-white p-2 rounded-md overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Debug Console</h3>
        <button
          onClick={toggleVisibility}
          className="text-gray-400 hover:text-white"
        >
          Hide
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        {debugState.entries.length === 0 ? (
          <div className="text-gray-400 text-xs p-2">No debug entries yet</div>
        ) : (
          <div className="space-y-1">
            {debugState.entries.map((entry, index) => (
              <div key={index} className="text-xs border-b border-gray-700 pb-1">
                <span className="text-gray-400">{formatTime(entry.timestamp)}</span>{" "}
                <span className={typeClasses[entry.type]}>{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-1 border-t border-gray-700">
        <button
          onClick={() => setDebugState(prev => ({ ...prev, entries: [] }))}
          className="text-xs text-gray-400 hover:text-white"
        >
          Clear Log
        </button>
      </div>
    </div>
  )
} 