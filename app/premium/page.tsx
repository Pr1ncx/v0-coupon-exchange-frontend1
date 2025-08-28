"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Crown, Zap, Star, Shield } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { PricingPlans } from "@/components/premium/pricing-plans"
import { SubscriptionManagement } from "@/components/premium/subscription-management"
import { BillingHistory } from "@/components/premium/billing-history"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { SubscriptionPlan, Subscription, PaymentMethod, Invoice } from "@/lib/subscription-service"

export default function PremiumPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadPremiumData()
  }, [user])

  const loadPremiumData = async () => {
    try {
      setLoading(true)
      setError("")

      // Load subscription plans (always available)
      const mockPlans: SubscriptionPlan[] = [
        {
          id: "premium-monthly",
          name: "Premium",
          price: 9.99,
          interval: "month",
          stripePriceId: "price_premium_monthly",
          popular: true,
          features: [
            "Unlimited coupon claims",
            "Priority customer support",
            "Advanced analytics dashboard",
            "Early access to new features",
            "Exclusive premium coupons",
            "No daily limits",
            "Custom profile themes",
            "Export savings reports",
          ],
        },
        {
          id: "premium-yearly",
          name: "Premium",
          price: 99.99,
          interval: "year",
          stripePriceId: "price_premium_yearly",
          popular: true,
          features: [
            "Unlimited coupon claims",
            "Priority customer support",
            "Advanced analytics dashboard",
            "Early access to new features",
            "Exclusive premium coupons",
            "No daily limits",
            "Custom profile themes",
            "Export savings reports",
          ],
        },
      ]

      setPlans(mockPlans)

      // Load user-specific data if authenticated
      if (user) {
        // Mock subscription data
        if (user.isPremium) {
          const mockSubscription: Subscription = {
            id: "sub_123",
            status: "active",
            planId: "premium-monthly",
            currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: "sub_stripe_123",
          }
          setSubscription(mockSubscription)

          const mockPaymentMethods: PaymentMethod[] = [
            {
              id: "pm_123",
              type: "card",
              card: {
                brand: "visa",
                last4: "4242",
                expMonth: 12,
                expYear: 2025,
              },
              isDefault: true,
            },
          ]
          setPaymentMethods(mockPaymentMethods)

          const mockInvoices: Invoice[] = [
            {
              id: "in_123",
              amount: 9.99,
              currency: "usd",
              status: "paid",
              created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              invoiceUrl: "https://invoice.stripe.com/example",
              planName: "Premium Monthly",
            },
            {
              id: "in_124",
              amount: 9.99,
              currency: "usd",
              status: "paid",
              created: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              paidAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              invoiceUrl: "https://invoice.stripe.com/example2",
              planName: "Premium Monthly",
            },
          ]
          setInvoices(mockInvoices)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load premium data")
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionUpdate = async () => {
    await refreshUser()
    await loadPremiumData()
  }

  const currentPlanId = user?.isPremium ? subscription?.planId : "free"

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 md:ml-64">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-balance">Premium Subscription</h1>
              </div>
              <p className="text-muted-foreground text-pretty max-w-2xl mx-auto">
                Unlock unlimited coupon claims, exclusive features, and priority support with our premium plans
              </p>
            </div>

            {/* Premium Benefits */}
            <div className="grid gap-4 md:grid-cols-3 mb-12">
              <div className="text-center p-6 rounded-lg border bg-card">
                <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Unlimited Claims</h3>
                <p className="text-sm text-muted-foreground">Claim as many coupons as you want without daily limits</p>
              </div>
              <div className="text-center p-6 rounded-lg border bg-card">
                <Star className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Exclusive Coupons</h3>
                <p className="text-sm text-muted-foreground">Access premium-only deals and early releases</p>
              </div>
              <div className="text-center p-6 rounded-lg border bg-card">
                <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Priority Support</h3>
                <p className="text-sm text-muted-foreground">Get faster response times and dedicated assistance</p>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading premium options...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Pricing Plans */}
                {!user?.isPremium && <PricingPlans plans={plans} currentPlanId={currentPlanId} />}

                {/* Subscription Management */}
                {user?.isPremium && subscription && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Subscription Management</h2>
                      <p className="text-muted-foreground">Manage your premium subscription and billing</p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                      <SubscriptionManagement
                        subscription={subscription}
                        paymentMethods={paymentMethods}
                        onSubscriptionUpdate={handleSubscriptionUpdate}
                      />
                      <BillingHistory invoices={invoices} />
                    </div>
                  </div>
                )}

                {/* Upgrade CTA for free users */}
                {!user?.isPremium && user && (
                  <div className="text-center py-12 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                    <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Ready to go Premium?</h3>
                    <p className="text-muted-foreground mb-6">
                      Join thousands of users saving more with unlimited access
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
