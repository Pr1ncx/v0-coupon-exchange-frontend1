import { authService } from "./auth"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: "uploader" | "claimer" | "social" | "milestone"
  requirement: number
  unlockedAt?: string
  progress?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  points: number
  icon: string
  category: "points" | "activity" | "social" | "special"
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

export interface ActivityItem {
  id: string
  type: "coupon_claimed" | "coupon_uploaded" | "badge_earned" | "achievement_unlocked" | "points_earned"
  title: string
  description: string
  points?: number
  timestamp: string
  metadata?: {
    couponId?: string
    couponTitle?: string
    badgeId?: string
    achievementId?: string
  }
}

export interface UserStats {
  totalPoints: number
  pointsEarned: number
  pointsSpent: number
  couponsUploaded: number
  couponsClaimed: number
  badgesEarned: number
  achievementsUnlocked: number
  currentStreak: number
  longestStreak: number
  totalSavings: number
  rank: number
  nextRankPoints: number
}

export interface DashboardData {
  stats: UserStats
  recentActivity: ActivityItem[]
  badges: Badge[]
  achievements: Achievement[]
  dailyProgress: {
    claimsUsed: number
    claimsLimit: number
    pointsEarned: number
    uploadsToday: number
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"

class GamificationService {
  private async getAuthHeaders() {
    const token = authService.getAccessToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${API_BASE_URL}/users/dashboard`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data")
    }

    return response.json()
  }

  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${API_BASE_URL}/users/stats`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user stats")
    }

    const result = await response.json()
    return result.stats
  }

  async getUserActivity(limit = 20): Promise<ActivityItem[]> {
    const response = await fetch(`${API_BASE_URL}/users/activity?limit=${limit}`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user activity")
    }

    const result = await response.json()
    return result.activities
  }

  async getUserBadges(): Promise<Badge[]> {
    const response = await fetch(`${API_BASE_URL}/users/badges`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user badges")
    }

    const result = await response.json()
    return result.badges
  }

  async getUserAchievements(): Promise<Achievement[]> {
    const response = await fetch(`${API_BASE_URL}/users/achievements`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user achievements")
    }

    const result = await response.json()
    return result.achievements
  }

  async getLeaderboard(type: "points" | "uploads" | "claims" = "points", limit = 10): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/leaderboard?type=${type}&limit=${limit}`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard")
    }

    const result = await response.json()
    return result.leaderboard
  }
}

export const gamificationService = new GamificationService()
