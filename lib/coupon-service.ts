import { authService } from "./auth"

export interface Coupon {
  id: string
  title: string
  description: string
  code: string
  discount: string
  category: string
  brand: string
  expiryDate: string
  imageUrl?: string
  originalPrice?: number
  discountedPrice?: number
  pointsCost: number
  boostCost: number
  claimsCount: number
  maxClaims?: number
  isActive: boolean
  isBoosted: boolean
  createdBy: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  tags: string[]
}

export interface CouponFilters {
  category?: string
  brand?: string
  search?: string
  sortBy?: "newest" | "popular" | "expiring" | "discount"
  minDiscount?: number
  maxPointsCost?: number
  tags?: string[]
}

export interface CreateCouponData {
  title: string
  description: string
  code: string
  discount: string
  category: string
  brand: string
  expiryDate: string
  originalPrice?: number
  discountedPrice?: number
  maxClaims?: number
  tags: string[]
  image?: File
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"

const MOCK_CATEGORIES = [
  "Food & Dining",
  "Fashion & Apparel",
  "Electronics",
  "Travel & Hotels",
  "Health & Beauty",
  "Home & Garden",
  "Entertainment",
  "Sports & Outdoors",
]

const MOCK_COUPONS: Coupon[] = [
  {
    id: "1",
    title: "50% Off Pizza Delivery",
    description: "Get half off your next pizza order with free delivery included",
    code: "PIZZA50",
    discount: "50%",
    category: "Food & Dining",
    brand: "Tony's Pizza",
    expiryDate: "2024-12-31",
    imageUrl: "/delicious-pizza.png",
    originalPrice: 25.99,
    discountedPrice: 12.99,
    pointsCost: 100,
    boostCost: 50,
    claimsCount: 234,
    maxClaims: 1000,
    isActive: true,
    isBoosted: true,
    createdBy: {
      id: "user1",
      name: "Sarah Chen",
      avatar: "/diverse-woman-portrait.png",
    },
    createdAt: "2024-01-15T10:30:00Z",
    tags: ["food", "delivery", "popular"],
  },
  {
    id: "2",
    title: "30% Off Designer Jeans",
    description: "Premium denim collection now available at discounted prices",
    code: "DENIM30",
    discount: "30%",
    category: "Fashion & Apparel",
    brand: "Urban Style",
    expiryDate: "2024-11-30",
    imageUrl: "/folded-denim-stack.png",
    originalPrice: 89.99,
    discountedPrice: 62.99,
    pointsCost: 150,
    boostCost: 75,
    claimsCount: 89,
    maxClaims: 500,
    isActive: true,
    isBoosted: false,
    createdBy: {
      id: "user2",
      name: "Mike Johnson",
      avatar: "/thoughtful-man.png",
    },
    createdAt: "2024-01-20T14:15:00Z",
    tags: ["fashion", "clothing", "trending"],
  },
  {
    id: "3",
    title: "Free Shipping on Electronics",
    description: "No shipping fees on all electronic items over $50",
    code: "FREESHIP",
    discount: "Free Shipping",
    category: "Electronics",
    brand: "TechMart",
    expiryDate: "2024-12-15",
    imageUrl: "/electronics-components.png",
    pointsCost: 75,
    boostCost: 40,
    claimsCount: 456,
    maxClaims: 2000,
    isActive: true,
    isBoosted: true,
    createdBy: {
      id: "user3",
      name: "Alex Rivera",
      avatar: "/diverse-group.png",
    },
    createdAt: "2024-01-25T09:45:00Z",
    tags: ["electronics", "shipping", "savings"],
  },
  {
    id: "4",
    title: "25% Off Hotel Bookings",
    description: "Save on your next vacation with discounted hotel rates worldwide",
    code: "TRAVEL25",
    discount: "25%",
    category: "Travel & Hotels",
    brand: "BookMyStay",
    expiryDate: "2024-10-31",
    imageUrl: "/grand-hotel-exterior.png",
    originalPrice: 200.0,
    discountedPrice: 150.0,
    pointsCost: 200,
    boostCost: 100,
    claimsCount: 167,
    maxClaims: 800,
    isActive: true,
    isBoosted: false,
    createdBy: {
      id: "user4",
      name: "Emma Davis",
      avatar: "/diverse-woman-portrait.png",
    },
    createdAt: "2024-02-01T16:20:00Z",
    tags: ["travel", "hotels", "vacation"],
  },
  {
    id: "5",
    title: "Buy 2 Get 1 Free Skincare",
    description: "Premium skincare products with amazing buy 2 get 1 free offer",
    code: "SKIN3FOR2",
    discount: "Buy 2 Get 1 Free",
    category: "Health & Beauty",
    brand: "GlowUp Beauty",
    expiryDate: "2024-09-30",
    imageUrl: "/skincare.png",
    originalPrice: 45.99,
    discountedPrice: 30.66,
    pointsCost: 120,
    boostCost: 60,
    claimsCount: 78,
    maxClaims: 300,
    isActive: true,
    isBoosted: true,
    createdBy: {
      id: "user5",
      name: "Lisa Park",
      avatar: "/diverse-woman-portrait.png",
    },
    createdAt: "2024-02-05T11:10:00Z",
    tags: ["beauty", "skincare", "deal"],
  },
]

class CouponService {
  private async getAuthHeaders() {
    const token = authService.getAccessToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async getCoupons(filters: CouponFilters = {}): Promise<{ coupons: Coupon[]; total: number; page: number }> {
    try {
      const params = new URLSearchParams()

      if (filters.category) params.append("category", filters.category)
      if (filters.brand) params.append("brand", filters.brand)
      if (filters.search) params.append("search", filters.search)
      if (filters.sortBy) params.append("sortBy", filters.sortBy)
      if (filters.minDiscount) params.append("minDiscount", filters.minDiscount.toString())
      if (filters.maxPointsCost) params.append("maxPointsCost", filters.maxPointsCost.toString())
      if (filters.tags?.length) params.append("tags", filters.tags.join(","))

      const response = await fetch(`${API_BASE_URL}/coupons?${params}`, {
        headers: await this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch coupons")
      }

      return response.json()
    } catch (error) {
      console.log("[v0] API unavailable, using mock data for coupons")

      let filteredCoupons = [...MOCK_COUPONS]

      if (filters.category) {
        filteredCoupons = filteredCoupons.filter((c) => c.category === filters.category)
      }
      if (filters.brand) {
        filteredCoupons = filteredCoupons.filter((c) => c.brand.toLowerCase().includes(filters.brand.toLowerCase()))
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredCoupons = filteredCoupons.filter(
          (c) =>
            c.title.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower) ||
            c.brand.toLowerCase().includes(searchLower),
        )
      }
      if (filters.maxPointsCost) {
        filteredCoupons = filteredCoupons.filter((c) => c.pointsCost <= filters.maxPointsCost!)
      }

      if (filters.sortBy) {
        switch (filters.sortBy) {
          case "popular":
            filteredCoupons.sort((a, b) => b.claimsCount - a.claimsCount)
            break
          case "newest":
            filteredCoupons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            break
          case "expiring":
            filteredCoupons.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
            break
        }
      }

      return {
        coupons: filteredCoupons,
        total: filteredCoupons.length,
        page: 1,
      }
    }
  }

  async getCouponById(id: string): Promise<Coupon> {
    try {
      const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
        headers: await this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch coupon")
      }

      const result = await response.json()
      return result.coupon
    } catch (error) {
      console.log("[v0] API unavailable, using mock data for coupon by ID")
      const coupon = MOCK_COUPONS.find((c) => c.id === id)
      if (!coupon) {
        throw new Error("Coupon not found")
      }
      return coupon
    }
  }

  async claimCoupon(id: string): Promise<{ success: boolean; message: string; pointsDeducted: number }> {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}/claim`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to claim coupon")
    }

    return response.json()
  }

  async boostCoupon(id: string): Promise<{ success: boolean; message: string; pointsDeducted: number }> {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}/boost`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to boost coupon")
    }

    return response.json()
  }

  async createCoupon(data: CreateCouponData): Promise<Coupon> {
    const formData = new FormData()

    formData.append("title", data.title)
    formData.append("description", data.description)
    formData.append("code", data.code)
    formData.append("discount", data.discount)
    formData.append("category", data.category)
    formData.append("brand", data.brand)
    formData.append("expiryDate", data.expiryDate)
    formData.append("tags", JSON.stringify(data.tags))

    if (data.originalPrice) formData.append("originalPrice", data.originalPrice.toString())
    if (data.discountedPrice) formData.append("discountedPrice", data.discountedPrice.toString())
    if (data.maxClaims) formData.append("maxClaims", data.maxClaims.toString())
    if (data.image) formData.append("image", data.image)

    const token = authService.getAccessToken()
    const response = await fetch(`${API_BASE_URL}/coupons`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create coupon")
    }

    const result = await response.json()
    return result.coupon
  }

  async deleteCoupon(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete coupon")
    }
  }

  async getMyCoupons(): Promise<Coupon[]> {
    const response = await fetch(`${API_BASE_URL}/users/coupons`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch your coupons")
    }

    const result = await response.json()
    return result.coupons
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/coupons/categories`)

      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }

      const result = await response.json()
      return result.categories
    } catch (error) {
      console.log("[v0] API unavailable, using mock categories")
      return MOCK_CATEGORIES
    }
  }
}

export const couponService = new CouponService()
