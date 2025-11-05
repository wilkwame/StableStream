"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const { login } = useAuth()

  const handleConnectWallet = async () => {
    setIsConnecting(true)
    // Simulate wallet connection
    setTimeout(() => {
      login("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "user.eth")
      setIsConnecting(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <Wallet className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-balance">StableStream</span>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-balance">Sign in to your account</CardTitle>
            <CardDescription className="leading-relaxed text-pretty">
              Connect your wallet to access your StableStream dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" onClick={handleConnectWallet} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" />
              </div>
              <Button className="w-full bg-transparent" variant="outline">
                Sign In with Email
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/signup" className="hover:text-primary transition-colors">
                Don't have an account? Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
