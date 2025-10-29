"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { OrderTaker } from "@/components/order-taker"
import { CrewDashboard } from "@/components/crew-dashboard"
import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [view, setView] = useState<"taker" | "crew">("crew")
  const [mounted, setMounted] = useState(false)
  const [appendingOrderId, setAppendingOrderId] = useState<string | null>(null)

  // Role-based permission checks
  const isCrew = user?.role === "crew"
  const isOrderTaker = user?.role === "order_taker" || user?.role === "super_admin" || user?.role === "order_taker_crew"
  const canAccessAdmin = user?.role === "super_admin"
  const isOrderTakerCrew = user?.role === "order_taker_crew"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Set default view based on user role
  useEffect(() => {
    if (user) {
      if (isCrew) {
        setView("crew")
      } else if (isOrderTakerCrew) {
        // For combined role, default to crew dashboard
        setView("crew")
      } else if (isOrderTaker) {
        setView("taker")
      }
    }
  }, [user, isCrew, isOrderTaker, isOrderTakerCrew])

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
      <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
        {/* Only show view toggle buttons for non-crew users */}
        {!isCrew && (
          <div className="flex gap-2">
            <button
              onClick={() => setView("taker")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === "taker" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Order Taker
            </button>
            <button
              onClick={() => setView("crew")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === "crew" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Crew Dashboard
            </button>
          </div>
        )}

        {/* Show placeholder for crew users to maintain layout */}
        {isCrew && <div></div>}

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          {/* Only show Admin button for super admin */}
          {canAccessAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Only show Order Taker for non-crew users */}
      {!isCrew && view === "taker" && (
        <OrderTaker appendingOrderId={appendingOrderId} onAppendComplete={() => setAppendingOrderId(null)} />
      )}

      {/* Show Crew Dashboard for crew users or when view is crew */}
      {(isCrew || view === "crew") && <CrewDashboard onAppendItems={(orderId) => setAppendingOrderId(orderId)} />}
    </div>
  )
}
