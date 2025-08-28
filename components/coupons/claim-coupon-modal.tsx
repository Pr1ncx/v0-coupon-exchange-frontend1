"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Coins, Calendar, AlertTriangle, Crown, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { couponService, type Coupon } from "@/lib/coupon-service"

interface ClaimCouponModalProps {
  coupon: Coupon
  open: boolean
  onOpenChange: (open: boolean) => void
  onClaim?: (coupon: Coupon) => void
}

export function ClaimCouponModal({ coupon, open, onOpenChange, onClaim }: ClaimCouponModalProps) {
  const [loading, setLoading] = useState(false)
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const canClaim = user && (user.isPremium || user.dailyClaimsUsed < user.dailyClaimsLimit)
  const hasEnoughPoints = user && user.points >= coupon.pointsCost
  const isExpired = new Date(coupon.expiryDate) < new Date()

  const handleClaim = async () => {
    if (!user || !canClaim || !hasEnoughPoints || isExpired) return

    setLoading(true)
    try {
      const result = await couponService.claimCoupon(coupon.id)

      toast({
        title: "Coupon claimed!",
        description: `You've successfully claimed "${coupon.title}". ${result.pointsDeducted} points deducted.`,
      })

      // Refresh user data to update points and daily claims
      await refreshUser()

      onClaim?.(coupon)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Claim failed",
        description: error instanceof Error ? error.message : "Failed to claim coupon",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(coupon.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-balance">Claim Coupon</DialogTitle>
          <DialogDescription>Review the details before claiming this coupon</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Coupon details */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-balance">{coupon.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{coupon.brand}</p>

            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {coupon.discount}
              </Badge>
              <Badge variant="outline">{coupon.category}</Badge>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{isExpired ? "Expired" : `${daysUntilExpiry} days left`}</span>
              </div>
              <div className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-accent" />
                <span>{coupon.pointsCost} points</span>
              </div>
            </div>
          </div>

          {/* User status */}
          {user && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Points</span>
                <span className="font-semibold">{user.points}</span>
              </div>

              {!user.isPremium && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Claims</span>
                  <span className="font-semibold">
                    {user.dailyClaimsUsed}/{user.dailyClaimsLimit}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warnings and errors */}
          {isExpired && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>This coupon has expired and cannot be claimed.</AlertDescription>
            </Alert>
          )}

          {user && !hasEnoughPoints && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have enough points to claim this coupon. You need {coupon.pointsCost - user.points} more
                points.
              </AlertDescription>
            </Alert>
          )}

          {user && !user.isPremium && user.dailyClaimsUsed >= user.dailyClaimsLimit && (
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>
                You've reached your daily claim limit. Upgrade to Premium for unlimited claims!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={loading || !canClaim || !hasEnoughPoints || isExpired}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Coins className="mr-2 h-4 w-4" />
            Claim for {coupon.pointsCost} points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
