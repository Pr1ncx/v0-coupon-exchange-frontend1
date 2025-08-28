"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authService, type User } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      }
    } catch (error) {
      console.error("Auth initialization error:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const result = await authService.login(email, password)
      setUser(result.user)
      toast({
        title: "Welcome back!",
        description: `You've successfully logged in.`,
      })
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const register = async (data: { name: string; email: string; password: string }) => {
    try {
      const result = await authService.register(data)
      setUser(result.user)
      toast({
        title: "Account created!",
        description: `Welcome to CouponX, ${data.name}!`,
      })
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email)
      toast({
        title: "Password reset sent",
        description: "Check your email for password reset instructions.",
      })
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Refresh user error:", error)
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
