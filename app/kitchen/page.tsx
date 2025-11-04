"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { KitchenView } from "@/components/kitchen-view"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard, LogOut, KeyRound, Settings } from "lucide-react"

export default function KitchenPage() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Role-based permission checks
  const isCrew = user?.role === "crew"
  const isOrderTaker = user?.role === "order_taker"
  const isOrderTakerCrew = user?.role === "order_taker_crew"
  const isSuperAdmin = user?.role === "super_admin"
  const canAccessKitchen = isCrew || isOrderTaker || isOrderTakerCrew || isSuperAdmin
  const canAccessOrderDashboard = isOrderTaker || isOrderTakerCrew || isSuperAdmin
  const canAccessAdmin = isSuperAdmin

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Redirect if user doesn't have access to kitchen
  useEffect(() => {
    if (mounted && !isLoading && user && !canAccessKitchen) {
      router.push("/")
      return
    }
  }, [mounted, isLoading, user, canAccessKitchen, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 p-3 sm:p-4 border-b border-border">
        <div className="flex gap-2 flex-wrap">
          {canAccessOrderDashboard && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="text-xs sm:text-sm"
            >
              <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Order Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground truncate min-w-0 flex-shrink">
            {user.email}
          </span>
          {/* Only show Admin button for super admin */}
          {canAccessAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")} className="text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Admin
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/change-password")} className="text-xs sm:text-sm">
            <KeyRound className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Change Password</span>
            <span className="sm:hidden">Password</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Out</span>
          </Button>
        </div>
      </div>
      <KitchenView />
    </div>
  )
}

