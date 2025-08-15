"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LoadingAnimation } from "@/components/ui/loading-animation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push("/dashboard")
    } else if (status !== "loading") {
      router.push("/auth/signin")
    }
  }, [session, router, status])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoadingAnimation text="Initializing ₱roxima Tracker..." size="lg" />
    </div>
  )
}
