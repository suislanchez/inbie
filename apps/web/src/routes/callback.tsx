import { GoogleAuth } from "@/components/google-auth"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/callback")({
  component: GoogleCallbackComponent,
})

function GoogleCallbackComponent() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
      <GoogleAuth />
    </div>
  )
} 