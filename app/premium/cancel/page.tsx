"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export default function SubscriptionCancelPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Subscription Canceled</CardTitle>
              <CardDescription>Your subscription process was canceled or interrupted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Don't worry! No charges were made to your account. You can try subscribing again anytime.
              </p>

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/premium">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Need help? Contact our{" "}
                <Link href="/support" className="text-primary hover:underline">
                  support team
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
