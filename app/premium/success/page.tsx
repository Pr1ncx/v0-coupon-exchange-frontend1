"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Crown, ArrowRight, Loader2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export default function SubscriptionSuccessPage() {
  const [loading, setLoading] = useState(true)
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    const handleSuccess = async () => {
      if (sessionId) {
        // Refresh user data to get updated premium status
        await refreshUser()
      }
      setLoading(false)
    }

    handleSuccess()
  }, [sessionId, refreshUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Processing your subscription...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Welcome to Premium!
              </CardTitle>
              <CardDescription>Your subscription has been successfully activated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Unlimited coupon claims</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Access to exclusive premium coupons</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Priority customer support</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Advanced analytics dashboard</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/dashboard">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/coupons">Browse Premium Coupons</Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                You can manage your subscription anytime from your{" "}
                <Link href="/premium" className="text-primary hover:underline">
                  premium settings
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
