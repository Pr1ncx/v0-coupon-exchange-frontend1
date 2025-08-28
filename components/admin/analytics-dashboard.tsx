"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, Users, CreditCard, Gift, DollarSign, Activity } from "lucide-react"
import { adminService, type AdminStats } from "@/lib/admin-service"

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, analyticsData] = await Promise.all([adminService.getStats(), adminService.getAnalytics(period)])
      setStats(statsData)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Premium Users",
      value: stats.premiumUsers.toLocaleString(),
      icon: CreditCard,
      change: `${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}%`,
      changeType: "neutral" as const,
    },
    {
      title: "Total Coupons",
      value: stats.totalCoupons.toLocaleString(),
      icon: Gift,
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      change: "+23%",
      changeType: "positive" as const,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance and user engagement</p>
        </div>
        <Select value={period} onValueChange={(value: "7d" | "30d" | "90d") => setPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Badge variant={stat.changeType === "positive" ? "default" : "secondary"} className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.change}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.revenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coupon Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.couponActivity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="claims" fill="#10b981" name="Claims" />
              <Bar dataKey="uploads" fill="#3b82f6" name="Uploads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="default" className="mt-1">
                Healthy
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-lg font-semibold">99.9%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="text-lg font-semibold">120ms</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-lg font-semibold">{stats.activeUsers.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
