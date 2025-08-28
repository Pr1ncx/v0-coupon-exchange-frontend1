"use client"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagementTable } from "@/components/admin/user-management"
import { CouponModerationQueue } from "@/components/admin/coupon-moderation"
import { BarChart3, Users, Shield, Settings } from "lucide-react"

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your coupon exchange platform with comprehensive admin tools</p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTable />
          </TabsContent>

          <TabsContent value="moderation">
            <CouponModerationQueue />
          </TabsContent>

          <TabsContent value="settings">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Settings Panel</h3>
              <p className="text-muted-foreground">System settings and configuration options coming soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
