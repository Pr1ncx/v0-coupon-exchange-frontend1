"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Upload, X, ImageIcon } from "lucide-react"
import { couponService } from "@/lib/coupon-service"
import { profileService } from "@/lib/profile-service"
import { useToast } from "@/hooks/use-toast"

interface CreateCouponFormProps {
  onCouponCreated?: () => void
}

export function CreateCouponForm({ onCouponCreated }: CreateCouponFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brand: "",
    category: "",
    discount: "",
    code: "",
    expiryDate: "",
    terms: "",
    imageUrl: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const categories = [
    "Fashion",
    "Electronics",
    "Food & Dining",
    "Travel",
    "Health & Beauty",
    "Home & Garden",
    "Sports & Outdoors",
    "Books & Media",
    "Services",
    "Other",
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async () => {
    if (!imageFile) return null

    try {
      setUploading(true)
      const result = await profileService.uploadCouponImage(imageFile)
      return result.imageUrl
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.brand || !formData.category || !formData.discount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      let imageUrl = formData.imageUrl
      if (imageFile) {
        imageUrl = (await uploadImage()) || ""
      }

      await couponService.createCoupon({
        ...formData,
        imageUrl,
      })

      toast({
        title: "Success",
        description: "Coupon submitted for review",
      })

      // Reset form
      setFormData({
        title: "",
        description: "",
        brand: "",
        category: "",
        discount: "",
        code: "",
        expiryDate: "",
        terms: "",
        imageUrl: "",
      })
      setImageFile(null)
      setImagePreview(null)
      setOpen(false)

      if (onCouponCreated) {
        onCouponCreated()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create coupon. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Coupon
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Coupon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Coupon Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("image-upload")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </div>
              )}
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., 50% Off Summer Sale"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="e.g., Nike, Amazon, Starbucks"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount *</Label>
              <Input
                id="discount"
                value={formData.discount}
                onChange={(e) => handleInputChange("discount", e.target.value)}
                placeholder="e.g., 50% OFF, $20 OFF, Buy 1 Get 1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the coupon offer..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                placeholder="e.g., SAVE50, SUMMER2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange("expiryDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => handleInputChange("terms", e.target.value)}
              placeholder="Any terms, conditions, or restrictions..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? "Creating..." : uploading ? "Uploading..." : "Create Coupon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
