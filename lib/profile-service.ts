import { api } from "./api"

export interface UserProfile {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  bio?: string
  avatarUrl?: string
  location?: string
  website?: string
  joinedAt: string
  isEmailVerified: boolean
  preferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    marketingEmails: boolean
    publicProfile: boolean
  }
}

export interface ProfileUpdateData {
  username?: string
  firstName?: string
  lastName?: string
  bio?: string
  location?: string
  website?: string
  preferences?: Partial<UserProfile["preferences"]>
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get("/profile")
    return response.data
  },

  async updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    const response = await api.patch("/profile", data)
    return response.data
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append("avatar", file)

    const response = await api.post("/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  },

  async changePassword(data: PasswordChangeData): Promise<void> {
    await api.post("/profile/change-password", data)
  },

  async deleteAccount(): Promise<void> {
    await api.delete("/profile")
  },

  async uploadCouponImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData()
    formData.append("image", file)

    const response = await api.post("/coupons/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  },
}
