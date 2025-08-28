"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Search, Bookmark, Trophy, Crown, User, Settings, BarChart3, Users, X } from "lucide-react"

interface SidebarProps {
  user?: {
    role: "user" | "premium" | "admin"
    isPremium: boolean
  }
  isOpen?: boolean
  onClose?: () => void
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Browse Coupons", href: "/coupons", icon: Search },
  { name: "My Coupons", href: "/my-coupons", icon: Bookmark },
  { name: "Achievements", href: "/achievements", icon: Trophy },
]

const premiumNavigation = [{ name: "Premium Features", href: "/premium", icon: Crown }]

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: BarChart3 },
  { name: "User Management", href: "/admin/users", icon: Users },
]

const accountNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const NavItem = ({ item, badge }: { item: (typeof navigation)[0]; badge?: string }) => (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.name}
      {badge && (
        <Badge variant="secondary" className="ml-auto">
          {badge}
        </Badge>
      )}
    </Link>
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 md:hidden">
            <span className="text-lg font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {/* Main navigation */}
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>

            {/* Premium navigation */}
            {user?.isPremium && (
              <>
                <div className="my-4 border-t pt-4">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Premium
                  </p>
                  <div className="space-y-1">
                    {premiumNavigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Admin navigation */}
            {user?.role === "admin" && (
              <>
                <div className="my-4 border-t pt-4">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin
                  </p>
                  <div className="space-y-1">
                    {adminNavigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Account navigation */}
            <div className="my-4 border-t pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
              <div className="space-y-1">
                {accountNavigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          </nav>

          {/* Upgrade prompt for free users */}
          {user && !user.isPremium && (
            <div className="border-t p-4">
              <div className="rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Upgrade to Premium</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Unlock unlimited coupon claims and exclusive features
                </p>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/premium">Upgrade Now</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
