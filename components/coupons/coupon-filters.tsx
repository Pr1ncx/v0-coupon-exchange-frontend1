"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Search, Filter, X } from "lucide-react"
import { couponService, type CouponFilters } from "@/lib/coupon-service"

interface CouponFiltersProps {
  filters: CouponFilters
  onFiltersChange: (filters: CouponFilters) => void
  onSearch: (query: string) => void
}

const POPULAR_CATEGORIES = [
  "Food & Dining",
  "Fashion",
  "Electronics",
  "Travel",
  "Health & Beauty",
  "Home & Garden",
  "Entertainment",
  "Sports & Fitness",
]

const POPULAR_BRANDS = ["Amazon", "Nike", "McDonald's", "Starbucks", "Target", "Walmart", "Best Buy", "Apple"]

function CouponFiltersComponent({ filters, onFiltersChange, onSearch }: CouponFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [categories, setCategories] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const fetchedCategories = await couponService.getCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error("Failed to load categories:", error)
      setCategories(POPULAR_CATEGORIES)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const updateFilter = (key: keyof CouponFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setSearchQuery("")
    onFiltersChange({})
    onSearch("")
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search coupons, brands, or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-12"
        />
        <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
          Search
        </Button>
      </form>

      {/* Quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Sort by */}
        <Select
          value={filters.sortBy || "default"}
          onValueChange={(value) => updateFilter("sortBy", value || undefined)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="discount">Best Discount</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Category filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) => updateFilter("category", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand filter */}
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={filters.brand || "all"}
                  onValueChange={(value) => updateFilter("brand", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {POPULAR_BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Points cost range */}
            <div className="space-y-3">
              <Label>Maximum Points Cost: {filters.maxPointsCost || 100}</Label>
              <Slider
                value={[filters.maxPointsCost || 100]}
                onValueChange={([value]) => updateFilter("maxPointsCost", value)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Minimum discount */}
            <div className="space-y-3">
              <Label>Minimum Discount: {filters.minDiscount || 0}%</Label>
              <Slider
                value={[filters.minDiscount || 0]}
                onValueChange={([value]) => updateFilter("minDiscount", value)}
                max={90}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("category", undefined)} />
            </Badge>
          )}
          {filters.brand && (
            <Badge variant="secondary" className="gap-1">
              Brand: {filters.brand}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("brand", undefined)} />
            </Badge>
          )}
          {filters.sortBy && (
            <Badge variant="secondary" className="gap-1">
              Sort: {filters.sortBy}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("sortBy", undefined)} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export { CouponFiltersComponent as CouponFilters }
