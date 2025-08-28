import { jwtDecode } from "jwt-decode"

export interface User {
  id: string
  name: string
  email: string
  role: "user" | "premium" | "admin"
  points: number
  isPremium: boolean
  dailyClaimsUsed: number
  dailyClaimsLimit: number
  avatar?: string
  badges: string[]
  achievements: string[]
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"

class AuthService {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken")
      this.refreshToken = localStorage.getItem("refreshToken")
    }
  }

  async register(data: {
    name: string
    email: string
    password: string
  }): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    const result = await response.json()
    this.setTokens(result.tokens)
    return result
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    const result = await response.json()
    this.setTokens(result.tokens)
    return result
  }

  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearTokens()
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) return null

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        this.clearTokens()
        return null
      }

      const result = await response.json()
      this.setTokens(result.tokens)
      return result.tokens.accessToken
    } catch (error) {
      console.error("Token refresh error:", error)
      this.clearTokens()
      return null
    }
  }

  async resetPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Password reset failed")
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.accessToken) return null

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await this.refreshAccessToken()
          if (newToken) {
            return this.getCurrentUser()
          }
        }
        return null
      }

      const result = await response.json()
      return result.user
    } catch (error) {
      console.error("Get current user error:", error)
      return null
    }
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", tokens.accessToken)
      localStorage.setItem("refreshToken", tokens.refreshToken)
    }
  }

  private clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
    }
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JWTPayload>(token)
      return decoded.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !this.isTokenExpired(this.accessToken)
  }
}

export const authService = new AuthService()
