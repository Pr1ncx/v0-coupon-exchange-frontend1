"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Crown, Zap, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { subscriptionService, type SubscriptionPlan } from "@/lib/subscription-service"

interface PricingPlansProps {
  plans: SubscriptionPlan[]
  currentPlanId?: string
}

export function PricingPlans({ plans, currentPlanId }: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const filteredPlans = plans.filter((plan) => plan.interval === (isYearly ? "year" : "month"))

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to a premium plan.",
        variant: "destructive",
      })
      return
    }

    setLoading(plan.id)
    try {
      const { url } = await subscriptionService.createCheckoutSession(plan.id)
      window.location.href = url
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const getYearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100
    return Math.round(discount)
  }

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-toggle" className={!isYearly ? "font-medium" : "text-muted-foreground"}>
          Monthly
        </Label>
        <Switch id="billing-toggle" checked={isYearly} onCheckedChange={setIsYearly} />
        <Label htmlFor="billing-toggle" className={isYearly ? "font-medium" : "text-muted-foreground"}>
          Yearly
        </Label>
        {isYearly && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Save up to 20%
          </Badge>
        )}
      </div>

      {/* Free Plan */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={currentPlanId === "free" ? "border-primary" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Free
              {currentPlanId === "free" && <Badge variant="secondary">Current</Badge>}
            </CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="text-3xl font-bold">$0</div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">3 coupon claims per day</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Upload unlimited coupons</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Basic gamification features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Community support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full bg-transparent" disabled>
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plans */}
        {filteredPlans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id
          const monthlyPlan = plans.find((p) => p.name === plan.name && p.interval === "month")
          const yearlyPlan = plans.find((p) => p.name === plan.name && p.interval === "year")
          const discount =
            isYearly && monthlyPlan && yearlyPlan ? getYearlyDiscount(monthlyPlan.price, yearlyPlan.price) : 0

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""} ${
                isCurrentPlan ? "border-primary" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {plan.name}
                  {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                </CardTitle>
                <CardDescription>Everything you need for unlimited savings</CardDescription>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">${plan.price}</div>
                  <div className="text-muted-foreground">/{plan.interval}</div>
                  {discount > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {discount}% off
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full bg-transparent" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button onClick={() => handleSubscribe(plan)} disabled={loading === plan.id} className="w-full">
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Upgrade to {plan.name}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
