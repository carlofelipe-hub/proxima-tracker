"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Github, Chrome, Loader2 } from "lucide-react"

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const router = useRouter()

  const handleOAuthSignIn = async (provider: string) => {
    try {
      setLoadingProvider(provider)
      setIsLoading(true)
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
      setLoadingProvider(null)
    }
  }

  const handleCredentialsSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        console.error("Sign in error:", result.error)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome to Proxima Tracker</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to manage your Philippine budget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Providers */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
            >
              {loadingProvider === "google" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading}
            >
              {loadingProvider === "github" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              Continue with GitHub
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && loadingProvider === null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              New to Proxima Tracker? Create an account using the social providers above.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}