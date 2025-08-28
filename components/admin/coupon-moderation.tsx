"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Eye, Clock, AlertTriangle } from "lucide-react"
import { adminService, type CouponModeration } from "@/lib/admin-service"
import { useToast } from "@/hooks/use-toast"

export function CouponModerationQueue() {
  const [pendingCoupons, setPendingCoupons] = useState<CouponModeration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCoupon, setSelectedCoupon] = useState<CouponModeration | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadPendingCoupons()
  }, [])

  const loadPendingCoupons = async () => {
    try {
      setLoading(true)
      const coupons = await adminService.getPendingCoupons()
      setPendingCoupons(coupons)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pending coupons",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCoupon = async (couponId: string) => {
    try {
      await adminService.approveCoupon(couponId)
      toast({
        title: "Success",
        description: "Coupon has been approved",
      })
      loadPendingCoupons()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve coupon",
        variant: "destructive",
      })
    }
  }

  const handleRejectCoupon = async (couponId: string, reason?: string) => {
    try {
      await adminService.rejectCoupon(couponId, reason)
      toast({
        title: "Success",
        description: "Coupon has been rejected",
      })
      setRejectionReason("")
      setSelectedCoupon(null)
      loadPendingCoupons()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject coupon",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 animate-spin" />
          <span>Loading pending coupons...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coupon Moderation</h2>
          <p className="text-muted-foreground">Review and approve pending coupon submissions</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {pendingCoupons.length} Pending
        </Badge>
      </div>

      {pendingCoupons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No coupons pending review at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingCoupons.map((coupon) => (
            <Card key={coupon.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {coupon.imageUrl ? (
                  <img
                    src={coupon.imageUrl || "/placeholder.svg"}
                    alt={coupon.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 right-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{coupon.title}</h3>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p>
                    <span className="font-medium">Brand:</span> {coupon.brand}
                  </p>
                  <p>
                    <span className="font-medium">Discount:</span> {coupon.discount}
                  </p>
                  <p>
                    <span className="font-medium">Submitted by:</span> {coupon.submittedBy}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {formatDate(coupon.submittedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Review Coupon: {coupon.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          {coupon.imageUrl ? (
                            <img
                              src={coupon.imageUrl || "/placeholder.svg"}
                              alt={coupon.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Title</label>
                            <p className="text-sm text-muted-foreground">{coupon.title}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Brand</label>
                            <p className="text-sm text-muted-foreground">{coupon.brand}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Discount</label>
                            <p className="text-sm text-muted-foreground">{coupon.discount}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Submitted By</label>
                            <p className="text-sm text-muted-foreground">{coupon.submittedBy}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="destructive" onClick={() => setSelectedCoupon(coupon)}>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button onClick={() => handleApproveCoupon(coupon.id)}>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" onClick={() => handleApproveCoupon(coupon.id)} className="flex-1">
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={!!selectedCoupon} onOpenChange={() => setSelectedCoupon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this coupon (optional):
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedCoupon(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedCoupon && handleRejectCoupon(selectedCoupon.id, rejectionReason)}
              >
                Reject Coupon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
