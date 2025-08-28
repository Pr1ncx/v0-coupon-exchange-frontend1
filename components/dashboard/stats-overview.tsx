"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Coins, Upload, Download, TrendingUp, Target, Flame, DollarSign } from "lucide-react"
import type { UserStats } from "@/lib/gamification-service"

interface StatsOverviewProps {
  stats: UserStats
  dailyProgress: {
    claimsUsed: number
    claimsLimit: number
    pointsEarned: number
    uploadsToday: number
  }
  isPremium: boolean
}

export function StatsOverview({ stats, dailyProgress, isPremium }: StatsOverviewProps) {
  const dailyClaimsProgress = isPremium ? 100 : (dailyProgress.claimsUsed / dailyProgress.claimsLimit) * 100
  const rankProgress = stats.nextRankPoints > 0 ? (stats.totalPoints / stats.nextRankPoints) * 100 : 100

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Points */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Coins className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">+{stats.pointsEarned - stats.pointsSpent} this month</p>
        </CardContent>
      </Card>

      {/* Coupons Uploaded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coupons Shared</CardTitle>
          <Upload className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.couponsUploaded}</div>
          <p className="text-xs text-muted-foreground">+{dailyProgress.uploadsToday} today</p>
        </CardContent>
      </Card>

      {/* Coupons Claimed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coupons Claimed</CardTitle>
          <Download className="h-4 w-4 text-chart-2" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.couponsClaimed}</div>
          <p className="text-xs text-muted-foreground">
            {dailyProgress.claimsUsed}/{isPremium ? "∞" : dailyProgress.claimsLimit} today
          </p>
        </CardContent>
      </Card>

      {/* Total Savings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
          <DollarSign className="h-4 w-4 text-chart-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalSavings}</div>
          <p className="text-xs text-muted-foreground">From claimed coupons</p>
        </CardContent>
      </Card>

      {/* Daily Claims Progress */}
      {!isPremium && (
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Claims</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{dailyProgress.claimsUsed}</span>
              <span className="text-sm text-muted-foreground">of {dailyProgress.claimsLimit}</span>
            </div>
            <Progress value={dailyClaimsProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {dailyProgress.claimsLimit - dailyProgress.claimsUsed} claims remaining today
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Streak */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.currentStreak}</div>
          <p className="text-xs text-muted-foreground">Best: {stats.longestStreak} days</p>
        </CardContent>
      </Card>

      {/* Rank Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rank</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold">#{stats.rank}</span>
            <Badge variant="secondary">Level {Math.floor(stats.totalPoints / 100) + 1}</Badge>
          </div>
          {stats.nextRankPoints > 0 && (
            <>
              <Progress value={rankProgress} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {stats.nextRankPoints - stats.totalPoints} points to next level
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
