"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Coins, TrendingUp, Copy, ExternalLink, MoreVertical, Trash2, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Coupon } from "@/lib/coupon-service"
import { ClaimCouponModal } from "./claim-coupon-modal"

interface CouponCardProps {
  coupon: Coupon
  onClaim?: (coupon: Coupon) => void
  onBoost?: (coupon: Coupon) => void
  onDelete?: (coupon: Coupon) => void
  showActions?: boolean
}

export function CouponCard({ coupon, onClaim, onBoost, onDelete, showActions = true }: CouponCardProps) {
  const [showClaimModal, setShowClaimModal] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const isExpired = new Date(coupon.expiryDate) < new Date()
  const isOwner = user?.id === coupon.createdBy.id
  const daysUntilExpiry = Math.ceil(
    (new Date(coupon.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code)
      toast({
        title: "Code copied!",
        description: "Coupon code has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      })
    }
  }

  const handleClaim = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to claim coupons.",
        variant: "destructive",
      })
      return
    }
    setShowClaimModal(true)
  }

  const handleBoost = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to boost coupons.",
        variant: "destructive",
      })
      return
    }
    onBoost?.(coupon)
  }

  return (
    <>
      <Card
        className={`group relative overflow-hidden transition-all hover:shadow-lg ${isExpired ? "opacity-60" : ""}`}
      >
        {coupon.isBoosted && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              Boosted
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-2 text-balance">{coupon.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{coupon.brand}</p>
            </div>

            {showActions && isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(coupon)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{coupon.category}</Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {coupon.discount}
            </Badge>
          </div>
        </CardHeader>

        {coupon.imageUrl && (
          <div className="relative h-48 mx-4 mb-4 rounded-lg overflow-hidden">
            <Image
              src={coupon.imageUrl || "/placeholder.svg"}
              alt={coupon.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}

        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{coupon.description}</p>

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{isExpired ? "Expired" : `${daysUntilExpiry} days left`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              <span>{coupon.pointsCost} points</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={coupon.createdBy.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-xs">{coupon.createdBy.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">by {coupon.createdBy.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">{coupon.claimsCount} claims</span>
          </div>
        </CardContent>

        <CardFooter className="pt-0 gap-2">
          {!isOwner && showActions && (
            <>
              <Button onClick={handleClaim} disabled={isExpired || !coupon.isActive} className="flex-1">
                <Coins className="h-4 w-4 mr-2" />
                Claim ({coupon.pointsCost})
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleBoost}
                disabled={isExpired || !coupon.isActive}
                title={`Boost for ${coupon.boostCost} points`}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button variant="outline" size="icon" onClick={handleCopyCode} title="Copy coupon code">
            <Copy className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" title="View details">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <ClaimCouponModal coupon={coupon} open={showClaimModal} onOpenChange={setShowClaimModal} onClaim={onClaim} />
    </>
  )
}
