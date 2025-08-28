"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Calendar, CreditCard, ExternalLink, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { subscriptionService, type Subscription, type PaymentMethod } from "@/lib/subscription-service"

interface SubscriptionManagementProps {
  subscription: Subscription
  paymentMethods: PaymentMethod[]
  onSubscriptionUpdate: () => void
}

export function SubscriptionManagement({
  subscription,
  paymentMethods,
  onSubscriptionUpdate,
}: SubscriptionManagementProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const defaultPaymentMethod = paymentMethods.find((pm) => pm.isDefault)

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.",
      )
    ) {
      return
    }

    setLoading("cancel")
    try {
      await subscriptionService.cancelSubscription()
      toast({
        title: "Subscription canceled",
        description: "Your subscription has been canceled. You'll retain access until the end of your billing period.",
      })
      onSubscriptionUpdate()
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    setLoading("reactivate")
    try {
      await subscriptionService.reactivateSubscription()
      toast({
        title: "Subscription reactivated",
        description: "Your subscription has been reactivated and will continue automatically.",
      })
      onSubscriptionUpdate()
    } catch (error) {
      toast({
        title: "Reactivation failed",
        description: error instanceof Error ? error.message : "Failed to reactivate subscription",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading("portal")
    try {
      const { url } = await subscriptionService.createPortalSession()
      window.open(url, "_blank")
    } catch (error) {
      toast({
        title: "Portal access failed",
        description: error instanceof Error ? error.message : "Failed to access billing portal",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary"
      case "canceled":
        return "bg-destructive/10 text-destructive"
      case "past_due":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active"
      case "canceled":
        return "Canceled"
      case "past_due":
        return "Past Due"
      case "incomplete":
        return "Incomplete"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge className={getStatusColor(subscription.status)}>{getStatusText(subscription.status)}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Period</span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(subscription.currentPeriodStart), "MMM d, yyyy")} -{" "}
              {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Next Billing Date</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription is set to cancel on {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}.
                You'll lose access to premium features after this date.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {defaultPaymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">
                    {defaultPaymentMethod.card.brand.toUpperCase()} •••• {defaultPaymentMethod.card.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {defaultPaymentMethod.card.expMonth}/{defaultPaymentMethod.card.expYear}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Default</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>Update your subscription settings and billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={loading === "portal"}
            className="w-full justify-start bg-transparent"
          >
            {loading === "portal" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Manage Billing & Payment Methods
          </Button>

          <Separator />

          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="default"
              onClick={handleReactivateSubscription}
              disabled={loading === "reactivate"}
              className="w-full"
            >
              {loading === "reactivate" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Reactivate Subscription
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={loading === "cancel"}
              className="w-full"
            >
              {loading === "cancel" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Cancel Subscription
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
