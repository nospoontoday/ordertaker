"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { OrderTaker } from "@/components/order-taker"
import { CrewDashboard } from "@/components/crew-dashboard"
import { PastOrders } from "@/components/past-orders"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, FileText, KeyRound, ChefHat, BarChart3, Package } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [view, setView] = useState<"taker" | "crew" | "past">("crew")
  const [mounted, setMounted] = useState(false)
  const [appendingOrderId, setAppendingOrderId] = useState<string | null>(null)

  // Role-based permission checks
  const isCrew = user?.role === "crew"
  const isOrderTaker = user?.role === "order_taker" || user?.role === "super_admin" || user?.role === "order_taker_crew"
  const canAccessAdmin = user?.role === "super_admin"
  const canAccessPastOrders = user?.role === "admin" || user?.role === "super_admin"
  const isOrderTakerCrew = user?.role === "order_taker_crew"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect crew members to kitchen page
  useEffect(() => {
    if (mounted && !isLoading && user && isCrew) {
      router.push("/kitchen")
    }
  }, [mounted, isLoading, user, isCrew, router])

  // Set default view based on user role
  useEffect(() => {
    if (user) {
      if (isOrderTakerCrew) {
        // For combined role, default to crew dashboard
        setView("crew")
      } else if (isOrderTaker) {
        setView("taker")
      }
    }
  }, [user, isOrderTaker, isOrderTakerCrew])

  useEffect(() => {
    if (appendingOrderId) {
      setView("taker")
    }
  }, [appendingOrderId])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/login")
    }
  }, [mounted, isLoading, user, router])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  // Show loading state
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 p-3 sm:p-4 border-b border-border">
        {/* Only show view toggle buttons for non-crew users */}
        {!isCrew && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setView("taker")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                view === "taker" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Order Taker
            </button>
            <button
              onClick={() => setView("crew")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                view === "crew" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Order Dashboard
            </button>
            {canAccessPastOrders && (
              <button
                onClick={() => setView("past")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  view === "past" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Past Orders
              </button>
            )}
          </div>
        )}

        {/* Show placeholder for crew users to maintain layout */}
        {isCrew && <div></div>}

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground truncate min-w-0 flex-shrink">{user.email}</span>
          {/* Show Kitchen button for all user types */}
          <Button variant="outline" size="sm" onClick={() => router.push("/kitchen")} className="text-xs sm:text-sm">
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Kitchen</span>
            <span className="sm:hidden">Kitchen</span>
          </Button>
          {/* Show Sales Reports button for all roles except crew */}
          {!isCrew && (
            <Button variant="outline" size="sm" onClick={() => router.push("/sales-reports")} className="text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sales Reports</span>
              <span className="sm:hidden">Reports</span>
            </Button>
          )}
          {/* Show Stats button for all roles except crew */}
          {!isCrew && (
            <Button variant="outline" size="sm" onClick={() => router.push("/stats")} className="text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Stats</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          )}
          {/* Show Inventory button for all users */}
          <Button variant="outline" size="sm" onClick={() => router.push("/inventory")} className="text-xs sm:text-sm">
            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Inventory</span>
            <span className="sm:hidden">Inventory</span>
          </Button>
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

      {/* Only show Order Taker for non-crew users */}
      {!isCrew && view === "taker" && (
        <OrderTaker appendingOrderId={appendingOrderId} onAppendComplete={() => setAppendingOrderId(null)} />
      )}

      {/* Show Crew Dashboard for crew users or when view is crew */}
      {(isCrew || view === "crew") && <CrewDashboard onAppendItems={(orderId) => setAppendingOrderId(orderId)} />}

      {/* Show Past Orders only for admins and super_admins */}
      {canAccessPastOrders && view === "past" && <PastOrders />}
    </div>
  )
}
