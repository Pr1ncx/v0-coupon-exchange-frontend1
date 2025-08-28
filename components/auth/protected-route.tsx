"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "user" | "premium" | "admin"
  redirectTo?: string
}

export function ProtectedRoute({ children, requiredRole = "user", redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo)
        return
      }

      // Check role permissions
      if (requiredRole === "admin" && user.role !== "admin") {
        router.push("/dashboard")
        return
      }

      if (requiredRole === "premium" && !user.isPremium && user.role !== "admin") {
        router.push("/premium")
        return
      }
    }
  }, [user, loading, router, requiredRole, redirectTo])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Role-based access control
  if (requiredRole === "admin" && user.role !== "admin") {
    return null
  }

  if (requiredRole === "premium" && !user.isPremium && user.role !== "admin") {
    return null
  }

  return <>{children}</>
}
