"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { CouponCard } from "@/components/coupons/coupon-card"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { couponService, type Coupon } from "@/lib/coupon-service"
import { Search, TrendingUp, Clock, Star, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [featuredCoupons, setFeaturedCoupons] = useState<Coupon[]>([])
  const [trendingCoupons, setTrendingCoupons] = useState<Coupon[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadFeaturedCoupons()
  }, [])

  const loadFeaturedCoupons = async () => {
    try {
      setLoading(true)
      // Load popular coupons for featured section
      const popularResult = await couponService.getCoupons({ sortBy: "popular" })
      setFeaturedCoupons(popularResult.coupons.slice(0, 6))

      // Load newest coupons for trending section
      const newestResult = await couponService.getCoupons({ sortBy: "newest" })
      setTrendingCoupons(newestResult.coupons.slice(0, 3))
    } catch (error) {
      console.error("Failed to load coupons:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/coupons?search=${encodeURIComponent(searchQuery)}`
    }
  }

  const handleClaim = async (coupon: Coupon) => {
    try {
      await refreshUser()
      await loadFeaturedCoupons()
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
      await refreshUser()
      await loadFeaturedCoupons()
    } catch (error) {
      toast({
        title: "Boost failed",
        description: error instanceof Error ? error.message : "Failed to boost coupon",
        variant: "destructive",
      })
    }
  }

  const categories = [
    { name: "Food & Dining", icon: "🍕", count: "120+" },
    { name: "Fashion", icon: "👕", count: "85+" },
    { name: "Electronics", icon: "📱", count: "65+" },
    { name: "Travel", icon: "✈️", count: "45+" },
    { name: "Health & Beauty", icon: "💄", count: "70+" },
    { name: "Home & Garden", icon: "🏠", count: "55+" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 md:ml-64">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
            <div className="container mx-auto px-6 py-12">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <Badge variant="secondary" className="text-sm">
                    Save More, Spend Less
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
                  {user ? `Welcome back, ${user.name}!` : "Discover Amazing Deals"}
                </h1>
                <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
                  Find verified coupons, share your favorite deals, and earn rewards through our gamified platform. Join
                  thousands saving money every day.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search for brands, stores, or categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-32 h-14 text-lg"
                    />
                    <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10">
                      Search Deals
                    </Button>
                  </div>
                </form>

                {/* Quick Stats */}
                {user && (
                  <div className="grid gap-4 md:grid-cols-4 mb-8 max-w-3xl mx-auto">
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-primary">{user.points}</div>
                        <div className="text-sm text-muted-foreground">Points</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-accent">
                          {user.dailyClaimsUsed}/{user.dailyClaimsLimit}
                        </div>
                        <div className="text-sm text-muted-foreground">Daily Claims</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-chart-2">{user.badges.length}</div>
                        <div className="text-sm text-muted-foreground">Badges</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-chart-4">{user.achievements.length}</div>
                        <div className="text-sm text-muted-foreground">Achievements</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="container mx-auto p-6">
            {/* Categories Section */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-balance">Browse by Category</h2>
                <Button variant="outline" asChild>
                  <Link href="/coupons">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {categories.map((category) => (
                  <Card key={category.name} className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl mb-3">{category.icon}</div>
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{category.count} deals</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Featured Coupons */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold text-balance">Featured Deals</h2>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/coupons?sortBy=popular">
                    View All Popular
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded-lg mb-4"></div>
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featuredCoupons.map((coupon) => (
                    <CouponCard key={coupon.id} coupon={coupon} onClaim={handleClaim} onBoost={handleBoost} />
                  ))}
                </div>
              )}
            </section>

            {/* Trending Section */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <h2 className="text-2xl font-bold text-balance">Trending Now</h2>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/coupons?sortBy=newest">
                    View Latest
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {trendingCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} onClaim={handleClaim} onBoost={handleBoost} />
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="text-center py-12 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4 text-balance">Don't Miss Out on Great Deals</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-pretty">
                New coupons are added daily. Browse our full collection to find the perfect deal for you.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" asChild>
                  <Link href="/coupons">
                    Browse All Coupons
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                {user && (
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/coupons/create">Share a Deal</Link>
                  </Button>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
