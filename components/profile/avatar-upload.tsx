"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Upload, X } from "lucide-react"
import { profileService } from "@/lib/profile-service"
import { useToast } from "@/hooks/use-toast"

interface AvatarUploadProps {
  currentAvatar?: string
  username: string
  onAvatarUpdate: (avatarUrl: string) => void
}

export function AvatarUpload({ currentAvatar, username, onAvatarUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const result = await profileService.uploadAvatar(file)
      onAvatarUpdate(result.avatarUrl)
      setPreview(null)
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to update avatar. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={preview || currentAvatar} />
              <AvatarFallback className="text-2xl">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              variant="secondary"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          {preview && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={uploading}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Click the camera icon to upload a new avatar.
            <br />
            Max file size: 5MB. Supported formats: JPG, PNG, GIF
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
