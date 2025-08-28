"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Crown, Trophy, TrendingUp, Gift } from "lucide-react"

interface QuickActionsProps {
  isPremium: boolean
  dailyClaimsRemaining: number
  currentPoints: number
}

export function QuickActions({ isPremium, dailyClaimsRemaining, currentPoints }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Browse Coupons */}
        <Button asChild className="w-full justify-start bg-transparent" variant="outline">
          <Link href="/coupons">
            <Search className="h-4 w-4 mr-2" />
            Browse Coupons
            {!isPremium && dailyClaimsRemaining > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {dailyClaimsRemaining} left
              </Badge>
            )}
          </Link>
        </Button>

        {/* Add Coupon */}
        <Button asChild className="w-full justify-start bg-transparent" variant="outline">
          <Link href="/coupons/create">
            <Plus className="h-4 w-4 mr-2" />
            Share a Coupon
            <Badge variant="secondary" className="ml-auto">
              +5 pts
            </Badge>
          </Link>
        </Button>

        {/* View Achievements */}
        <Button asChild className="w-full justify-start bg-transparent" variant="outline">
          <Link href="/achievements">
            <Trophy className="h-4 w-4 mr-2" />
            View Achievements
          </Link>
        </Button>

        {/* Premium Upgrade */}
        {!isPremium && (
          <Button asChild className="w-full justify-start" variant="default">
            <Link href="/premium">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
              <Badge variant="secondary" className="ml-auto bg-primary-foreground text-primary">
                Unlimited
              </Badge>
            </Link>
          </Button>
        )}

        {/* Daily Bonus */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Daily Bonus</span>
            </div>
            <Badge variant="secondary">+10 pts</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Claim your daily login bonus</p>
          <Button size="sm" className="w-full mt-2 bg-transparent" variant="outline">
            Claim Bonus
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
