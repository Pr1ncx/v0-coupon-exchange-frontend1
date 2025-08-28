"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { BadgesAchievements } from "@/components/dashboard/badges-achievements"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { useAuth } from "@/contexts/auth-context"
import type { DashboardData } from "@/lib/gamification-service"

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError("")

      // For demo purposes, we'll create mock data since the backend might not be available
      const mockData: DashboardData = {
        stats: {
          totalPoints: user?.points || 250,
          pointsEarned: 350,
          pointsSpent: 100,
          couponsUploaded: 12,
          couponsClaimed: 28,
          badgesEarned: 3,
          achievementsUnlocked: 5,
          currentStreak: 7,
          longestStreak: 15,
          totalSavings: 127.5,
          rank: 42,
          nextRankPoints: 500,
        },
        recentActivity: [
          {
            id: "1",
            type: "coupon_claimed",
            title: "Claimed a coupon",
            description: "20% off Nike sneakers",
            points: -10,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            metadata: { couponTitle: "Nike Sneakers Discount" },
          },
          {
            id: "2",
            type: "badge_earned",
            title: "Badge earned",
            description: "Earned the 'Deal Hunter' badge",
            points: 25,
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "3",
            type: "coupon_uploaded",
            title: "Shared a coupon",
            description: "15% off Starbucks coffee",
            points: 5,
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            metadata: { couponTitle: "Starbucks Coffee Discount" },
          },
          {
            id: "4",
            type: "achievement_unlocked",
            title: "Achievement unlocked",
            description: "Reached 250 total points",
            points: 50,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        badges: [
          {
            id: "1",
            name: "First Upload",
            description: "Share your first coupon",
            icon: "upload",
            category: "uploader",
            requirement: 1,
            unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "2",
            name: "Deal Hunter",
            description: "Claim 10 coupons",
            icon: "target",
            category: "claimer",
            requirement: 10,
            unlockedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "3",
            name: "Content Creator",
            description: "Upload 25 coupons",
            icon: "star",
            category: "uploader",
            requirement: 25,
            progress: 12,
          },
          {
            id: "4",
            name: "Savings Master",
            description: "Claim 50 coupons",
            icon: "crown",
            category: "claimer",
            requirement: 50,
            progress: 28,
          },
        ],
        achievements: [
          {
            id: "1",
            title: "First Steps",
            description: "Earn your first 50 points",
            points: 25,
            icon: "trophy",
            category: "points",
            unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "2",
            title: "Point Collector",
            description: "Earn 250 total points",
            points: 50,
            icon: "coins",
            category: "points",
            unlockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "3",
            title: "High Roller",
            description: "Earn 500 total points",
            points: 100,
            icon: "diamond",
            category: "points",
            progress: 250,
            maxProgress: 500,
          },
          {
            id: "4",
            title: "Social Butterfly",
            description: "Share 20 coupons",
            points: 75,
            icon: "users",
            category: "social",
            progress: 12,
            maxProgress: 20,
          },
        ],
        dailyProgress: {
          claimsUsed: user?.dailyClaimsUsed || 1,
          claimsLimit: user?.dailyClaimsLimit || 3,
          pointsEarned: 15,
          uploadsToday: 2,
        },
      }

      setDashboardData(mockData)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex">
          <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 md:ml-64">
            <div className="container mx-auto p-6">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-balance">Welcome back, {user?.name}!</h1>
                <p className="text-muted-foreground text-pretty">
                  Here's your coupon activity and achievements overview
                </p>
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
                    <span>Loading your dashboard...</span>
                  </div>
                </div>
              ) : dashboardData ? (
                <div className="space-y-8">
                  {/* Stats Overview */}
                  <StatsOverview
                    stats={dashboardData.stats}
                    dailyProgress={dashboardData.dailyProgress}
                    isPremium={user?.isPremium || false}
                  />

                  {/* Main Content Grid */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Badges & Achievements */}
                    <div className="lg:col-span-2">
                      <BadgesAchievements badges={dashboardData.badges} achievements={dashboardData.achievements} />
                    </div>

                    {/* Right Column - Quick Actions */}
                    <div>
                      <QuickActions
                        isPremium={user?.isPremium || false}
                        dailyClaimsRemaining={
                          user?.isPremium ? 999 : (user?.dailyClaimsLimit || 3) - (user?.dailyClaimsUsed || 0)
                        }
                        currentPoints={user?.points || 0}
                      />
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <ActivityFeed
                    activities={dashboardData.recentActivity}
                    userName={user?.name || "User"}
                    userAvatar={user?.avatar}
                  />
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
