import { api } from "./api"

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  premiumUsers: number
  totalCoupons: number
  pendingCoupons: number
  totalClaims: number
  revenue: number
  conversionRate: number
}

export interface UserManagement {
  id: string
  email: string
  username: string
  role: "user" | "admin"
  isPremium: boolean
  isActive: boolean
  createdAt: string
  lastLogin: string
  totalClaims: number
  points: number
}

export interface CouponModeration {
  id: string
  title: string
  brand: string
  discount: string
  status: "pending" | "approved" | "rejected"
  submittedBy: string
  submittedAt: string
  imageUrl?: string
}

export interface SystemHealth {
  status: "healthy" | "warning" | "critical"
  uptime: number
  responseTime: number
  errorRate: number
  activeConnections: number
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const response = await api.get("/admin/stats")
    return response.data
  },

  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{
    users: UserManagement[]
    total: number
    page: number
    totalPages: number
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    })
    const response = await api.get(`/admin/users?${params}`)
    return response.data
  },

  async updateUser(userId: string, updates: Partial<UserManagement>): Promise<void> {
    await api.patch(`/admin/users/${userId}`, updates)
  },

  async banUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/ban`)
  },

  async unbanUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/unban`)
  },

  async getPendingCoupons(): Promise<CouponModeration[]> {
    const response = await api.get("/admin/coupons/pending")
    return response.data
  },

  async approveCoupon(couponId: string): Promise<void> {
    await api.post(`/admin/coupons/${couponId}/approve`)
  },

  async rejectCoupon(couponId: string, reason?: string): Promise<void> {
    await api.post(`/admin/coupons/${couponId}/reject`, { reason })
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get("/admin/health")
    return response.data
  },

  async getAnalytics(period: "7d" | "30d" | "90d" = "30d"): Promise<{
    userGrowth: Array<{ date: string; users: number }>
    revenue: Array<{ date: string; amount: number }>
    couponActivity: Array<{ date: string; claims: number; uploads: number }>
  }> {
    const response = await api.get(`/admin/analytics?period=${period}`)
    return response.data
  },
}
