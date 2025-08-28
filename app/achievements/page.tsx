"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Trophy, Award } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { BadgesAchievements } from "@/components/dashboard/badges-achievements"
import { useAuth } from "@/contexts/auth-context"
import type { Badge, Achievement } from "@/lib/gamification-service"

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadAchievementsData()
    }
  }, [user])

  const loadAchievementsData = async () => {
    try {
      setLoading(true)
      setError("")

      // Mock data for demo
      const mockBadges: Badge[] = [
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
          name: "Savings Expert",
          description: "Save $100 with claimed coupons",
          icon: "dollar",
          category: "milestone",
          requirement: 100,
          unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "4",
          name: "Content Creator",
          description: "Upload 25 coupons",
          icon: "star",
          category: "uploader",
          requirement: 25,
          progress: 12,
        },
        {
          id: "5",
          name: "Coupon Master",
          description: "Upload 100 coupons",
          icon: "crown",
          category: "uploader",
          requirement: 100,
          progress: 12,
        },
        {
          id: "6",
          name: "Savings Master",
          description: "Claim 50 coupons",
          icon: "trophy",
          category: "claimer",
          requirement: 50,
          progress: 28,
        },
        {
          id: "7",
          name: "Social Sharer",
          description: "Get 10 people to claim your coupons",
          icon: "users",
          category: "social",
          requirement: 10,
          progress: 3,
        },
        {
          id: "8",
          name: "Streak Master",
          description: "Maintain a 30-day activity streak",
          icon: "flame",
          category: "milestone",
          requirement: 30,
          progress: 7,
        },
      ]

      const mockAchievements: Achievement[] = [
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
          title: "Early Adopter",
          description: "Join CouponX in the first month",
          points: 100,
          icon: "star",
          category: "special",
          unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "4",
          title: "Community Helper",
          description: "Upload 10 high-quality coupons",
          points: 75,
          icon: "heart",
          category: "social",
          unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "5",
          title: "High Roller",
          description: "Earn 500 total points",
          points: 100,
          icon: "diamond",
          category: "points",
          progress: 250,
          maxProgress: 500,
        },
        {
          id: "6",
          title: "Social Butterfly",
          description: "Share 20 coupons",
          points: 75,
          icon: "users",
          category: "social",
          progress: 12,
          maxProgress: 20,
        },
        {
          id: "7",
          title: "Savings Champion",
          description: "Save $500 with claimed coupons",
          points: 200,
          icon: "trophy",
          category: "activity",
          progress: 127,
          maxProgress: 500,
        },
        {
          id: "8",
          title: "Power User",
          description: "Use the platform for 100 days",
          points: 150,
          icon: "calendar",
          category: "activity",
          progress: 23,
          maxProgress: 100,
        },
      ]

      setBadges(mockBadges)
      setAchievements(mockAchievements)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load achievements data")
    } finally {
      setLoading(false)
    }
  }

  const unlockedBadges = badges.filter((badge) => badge.unlockedAt)
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlockedAt)
  const totalPointsEarned = unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0)

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
                <h1 className="text-3xl font-bold text-balance">Achievements & Badges</h1>
                <p className="text-muted-foreground text-pretty">
                  Track your progress and unlock rewards as you use CouponX
                </p>
              </div>

              {/* Stats Summary */}
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">Badges Earned</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{unlockedBadges.length}</p>
                  <p className="text-xs text-muted-foreground">of {badges.length} available</p>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Achievements</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{unlockedAchievements.length}</p>
                  <p className="text-xs text-muted-foreground">of {achievements.length} completed</p>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-1"></div>
                    <span className="text-sm font-medium">Points Earned</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{totalPointsEarned}</p>
                  <p className="text-xs text-muted-foreground">from achievements</p>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-2"></div>
                    <span className="text-sm font-medium">Completion</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {Math.round(
                      ((unlockedBadges.length + unlockedAchievements.length) / (badges.length + achievements.length)) *
                        100,
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">overall progress</p>
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
                    <span>Loading achievements...</span>
                  </div>
                </div>
              ) : (
                <BadgesAchievements badges={badges} achievements={achievements} />
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
