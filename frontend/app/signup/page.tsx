// app/auth/signup/page.tsx (or wherever it is)
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSigner } from "@/lib/contracts";

export default function SignupPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { login } = useAuth();

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();

      let ensName: string | undefined;
      try {
        const provider = signer.provider as any;
        ensName = await provider.lookupAddress(address);
      } catch (err) {
        console.log("No ENS found for signup");
      }

      // This will:
      // 1. Save to localStorage
      // 2. Set user
      // 3. router.push("/dashboard")
      login(address, ensName || undefined);
    } catch (err: any) {
      console.error("Wallet signup failed:", err);
      alert(err.message || "Failed to connect wallet. Please try again.");
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <Wallet className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-balance">StableStream</span>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-balance">Create your account</CardTitle>
            <CardDescription className="leading-relaxed text-pretty">
              Connect your wallet to get started with StableStream
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* REAL WALLET SIGNUP */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                "Connecting..."
              ) : (
                <>
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect Wallet
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>

            {/* Email Signup (Optional - keep for now) */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" />
              </div>
              <Button className="w-full bg-transparent" variant="outline">
                Sign Up with Email
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-primary transition-colors">
                Already have an account? Sign in
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
  );
}