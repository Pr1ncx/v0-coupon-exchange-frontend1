"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, AlertCircle } from "lucide-react"
import { CouponCard } from "@/components/coupons/coupon-card"
import { CouponFilters } from "@/components/coupons/coupon-filters"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { couponService, type Coupon, type CouponFilters as Filters } from "@/lib/coupon-service"
import Link from "next/link"

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<Filters>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadCoupons()
  }, [filters])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      setError("")
      const result = await couponService.getCoupons(filters)
      setCoupons(result.coupons)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }))
  }

  const handleClaim = async (coupon: Coupon) => {
    try {
      // Refresh user data to get updated points and daily claims
      await refreshUser()

      // Refresh coupons to get updated claim counts
      await loadCoupons()
    } catch (error) {
      console.error("Failed to refresh data after claim:", error)
    }
  }

  const handleBoost = async (coupon: Coupon) => {
    if (!user) return

    try {
      const result = await couponService.boostCoupon(coupon.id)

      toast({
        title: "Coupon boosted!",
        description: `You've boosted "${coupon.title}" for ${result.pointsDeducted} points.`,
      })

      // Refresh user data and coupons
      await refreshUser()
      await loadCoupons()
    } catch (error) {
      toast({
        title: "Boost failed",
        description: error instanceof Error ? error.message : "Failed to boost coupon",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return

    try {
      await couponService.deleteCoupon(coupon.id)

      toast({
        title: "Coupon deleted",
        description: "Your coupon has been successfully deleted.",
      })

      await loadCoupons()
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete coupon",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 md:ml-64">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-balance">Browse Coupons</h1>
                <p className="text-muted-foreground text-pretty">
                  Discover amazing deals and save money with our curated coupon collection
                </p>
              </div>

              {user && (
                <Button asChild>
                  <Link href="/coupons/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Coupon
                  </Link>
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="mb-6">
              <CouponFilters filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} />
            </div>

            {/* Content */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading coupons...</span>
                </div>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No coupons found</h3>
                <p className="text-muted-foreground mb-4">
                  {Object.keys(filters).length > 0
                    ? "Try adjusting your filters to see more results"
                    : "Be the first to share a coupon with the community!"}
                </p>
                {user && (
                  <Button asChild>
                    <Link href="/coupons/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Coupon
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {coupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    onClaim={handleClaim}
                    onBoost={handleBoost}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Load more button placeholder */}
            {coupons.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" disabled>
                  Load More Coupons
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
