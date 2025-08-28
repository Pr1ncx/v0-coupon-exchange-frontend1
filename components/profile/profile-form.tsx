"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Save, Mail, Globe, MapPin, User } from "lucide-react"
import { profileService, type UserProfile, type ProfileUpdateData } from "@/lib/profile-service"
import { useToast } from "@/hooks/use-toast"

interface ProfileFormProps {
  profile: UserProfile
  onProfileUpdate: (profile: UserProfile) => void
}

export function ProfileForm({ profile, onProfileUpdate }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileUpdateData>({
    username: profile.username,
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    preferences: { ...profile.preferences },
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePreferenceChange = (preference: keyof UserProfile["preferences"], value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      const updatedProfile = await profileService.updateProfile(formData)
      onProfileUpdate(updatedProfile)
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications about your account activity</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={formData.preferences?.emailNotifications}
              onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pushNotifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
            </div>
            <Switch
              id="pushNotifications"
              checked={formData.preferences?.pushNotifications}
              onCheckedChange={(checked) => handlePreferenceChange("pushNotifications", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketingEmails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">Receive emails about new features and promotions</p>
            </div>
            <Switch
              id="marketingEmails"
              checked={formData.preferences?.marketingEmails}
              onCheckedChange={(checked) => handlePreferenceChange("marketingEmails", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="publicProfile">Public Profile</Label>
              <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
            </div>
            <Switch
              id="publicProfile"
              checked={formData.preferences?.publicProfile}
              onCheckedChange={(checked) => handlePreferenceChange("publicProfile", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
