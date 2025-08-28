"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AvatarUpload } from "@/components/profile/avatar-upload"
import { ProfileForm } from "@/components/profile/profile-form"
import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Lock, Trash2, Calendar, Mail, Crown } from "lucide-react"
import { profileService, type UserProfile } from "@/lib/profile-service"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profileData = await profileService.getProfile()
      setProfile(profileData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpdate = (avatarUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatarUrl })
    }
  }

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
  }

  const handleDeleteAccount = async () => {
    try {
      await profileService.deleteAccount()
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      })
      // Redirect to home or logout
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-muted rounded animate-pulse"></div>
            <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">Unable to load your profile information.</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>
            <div className="flex items-center gap-2">
              {user?.isPremium && (
                <Badge variant="default">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
              <Badge variant={profile.isEmailVerified ? "default" : "destructive"}>
                <Mail className="h-3 w-3 mr-1" />
                {profile.isEmailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Overview */}
            <div className="space-y-6">
              <AvatarUpload
                currentAvatar={profile.avatarUrl}
                username={profile.username}
                onAvatarUpdate={handleAvatarUpdate}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Account Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Member since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(profile.joinedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Status</p>
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Status</p>
                    <Badge variant={profile.isEmailVerified ? "default" : "destructive"} className="text-xs">
                      {profile.isEmailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="danger" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Danger Zone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <ProfileForm profile={profile} onProfileUpdate={handleProfileUpdate} />
                </TabsContent>

                <TabsContent value="security">
                  <ChangePasswordForm />
                </TabsContent>

                <TabsContent value="danger">
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Delete Account</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Once you delete your account, there is no going back. Please be certain. All your data,
                          including coupons, claims, and points will be permanently deleted.
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Are you absolutely sure?</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                This action cannot be undone. This will permanently delete your account and remove all
                                your data from our servers.
                              </p>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline">Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteAccount}>
                                  Yes, delete my account
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
