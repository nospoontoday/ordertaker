"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { OrderTaker } from "@/components/order-taker"
import { CrewDashboard } from "@/components/crew-dashboard"
import { PastOrders } from "@/components/past-orders"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, FileText, KeyRound, ChefHat, BarChart3, Package, Menu, MoreVertical, TrendingUp, Clock, Lightbulb, Wallet, Globe } from "lucide-react"
import { OnlineOrderNotification } from "@/components/online-order-notification"
import type { KitchenStatusData } from "@/components/kitchen-status-banner"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { BranchSelector } from "@/components/branch-selector"

export default function Home() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [view, setView] = useState<"taker" | "crew" | "past">("crew")
  const [mounted, setMounted] = useState(false)
  const [appendingOrderId, setAppendingOrderId] = useState<string | null>(null)
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatusData | null>(null)

  // Role-based permission checks
  const isCrew = user?.role === "crew"
  const isStaff = user?.role === "staff"
  const isOrderTaker = user?.role === "order_taker" || user?.role === "super_admin" || user?.role === "order_taker_crew" || user?.role === "staff"
  const canAccessAdmin = user?.role === "super_admin"
  const canAccessPastOrders = user?.role === "super_admin" || user?.role === "order_taker" || user?.role === "order_taker_crew"
  const canAccessReports = user?.role === "super_admin" || user?.role === "order_taker" || user?.role === "order_taker_crew"
  const isOrderTakerCrew = user?.role === "order_taker_crew" || user?.role === "staff"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check for view query parameter on mount
  useEffect(() => {
    if (mounted) {
      const params = new URLSearchParams(window.location.search)
      const viewParam = params.get('view')
      if (viewParam === 'crew' || viewParam === 'taker' || viewParam === 'past') {
        setView(viewParam)
      }
    }
  }, [mounted])

  // Set default view based on user role (only if no query param was set)
  useEffect(() => {
    if (user && mounted) {
      const params = new URLSearchParams(window.location.search)
      const hasViewParam = params.has('view')

      if (!hasViewParam) {
        if (isOrderTakerCrew) {
          // For combined role, default to crew dashboard
          setView("crew")
        } else if (isOrderTaker) {
          setView("taker")
        }
      }
    }
  }, [user, isOrderTaker, isOrderTakerCrew, mounted])

  useEffect(() => {
    if (appendingOrderId) {
      setView("taker")
    }
  }, [appendingOrderId])

  // Redirect to customer order page if not authenticated
  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/order")
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

      {/* Improved Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between">
            {/* Left: View Toggle */}
            <div className="flex gap-2">
              {!isCrew && (
                <>
                  <Button
                    variant={view === "taker" ? "default" : "ghost"}
                    size="default"
                    onClick={() => setView("taker")}
                    className="min-h-[44px] font-semibold"
                  >
                    Order Taker
                  </Button>
                  <Button
                    variant={view === "crew" ? "default" : "ghost"}
                    size="default"
                    onClick={() => setView("crew")}
                    className="min-h-[44px] font-semibold"
                  >
                    Dashboard
                  </Button>
                  {canAccessPastOrders && (
                    <Button
                      variant={view === "past" ? "default" : "ghost"}
                      size="default"
                      onClick={() => setView("past")}
                      className="min-h-[44px] font-semibold"
                    >
                      Past Orders
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <BranchSelector variant="compact" />
              <div className="h-6 w-px bg-slate-300" />
              <OnlineOrderNotification />
              <div className="h-6 w-px bg-slate-300" />
              <span className="text-sm text-slate-600">{user?.email}</span>
              <div className="h-6 w-px bg-slate-300" />

              {(isCrew || isStaff) && (
                <Button variant="outline" onClick={() => router.push("/dtr")}>
                  <Clock className="h-4 w-4 mr-2" />
                  DTR
                </Button>
              )}

              {canAccessReports && (
                <Button variant="outline" onClick={() => router.push("/sales-reports")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Sales
                </Button>
              )}

              {!isCrew && (
                <Button variant="outline" onClick={() => router.push("/inventory")}>
                  <Package className="h-4 w-4 mr-2" />
                  Inventory
                </Button>
              )}

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push("/online-orders")}>
                    <Globe className="h-4 w-4 mr-2" />
                    Online Orders
                  </DropdownMenuItem>
                  {canAccessReports && (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/insights")}>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Business Insights
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/stats")}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Statistics
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isCrew && (
                    <DropdownMenuItem onClick={() => router.push("/withdrawals")}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Withdrawals
                    </DropdownMenuItem>
                  )}
                  {canAccessAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        <Settings className="h-4 w-4 mr-2" />
                        Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/dtr/admin")}>
                        <Clock className="h-4 w-4 mr-2" />
                        DTR Management
                      </DropdownMenuItem>
                    </>
                  )}
                  {(canAccessReports || !isCrew || canAccessAdmin) && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => router.push("/change-password")}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} variant="destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between">
              {/* Left: Logo + Branch */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <BranchSelector variant="compact" />
              </div>

              <div className="flex items-center gap-2">
                {/* View Switcher for non-crew users */}
                {!isCrew && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (view === "taker") setView("crew")
                      else setView("taker")
                    }}
                    className="min-h-[44px] px-4"
                  >
                    {view === "taker" ? "Dashboard" : "Order Taker"}
                  </Button>
                )}

                {/* Online Order Notification */}
                <OnlineOrderNotification />

                {/* Hamburger Menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                      <SheetDescription className="text-xs">
                        {user?.email}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                      <div className="mt-6 mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Current Branch</p>
                        <BranchSelector variant="default" className="w-full" />
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12"
                        onClick={() => router.push("/online-orders")}
                      >
                        <Globe className="h-5 w-5 mr-3" />
                        Online Orders
                      </Button>
                      {canAccessReports && (
                        <>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/sales-reports")}
                          >
                            <FileText className="h-5 w-5 mr-3" />
                            Sales Reports
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/insights")}
                          >
                            <Lightbulb className="h-5 w-5 mr-3" />
                            Business Insights
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/monthly-report")}
                          >
                            <TrendingUp className="h-5 w-5 mr-3" />
                            Monthly Report
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/stats")}
                          >
                            <BarChart3 className="h-5 w-5 mr-3" />
                            Statistics
                          </Button>
                        </>
                      )}
                      {!isCrew && (
                        <>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/inventory")}
                          >
                            <Package className="h-5 w-5 mr-3" />
                            Inventory
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/withdrawals")}
                          >
                            <Wallet className="h-5 w-5 mr-3" />
                            Withdrawals
                          </Button>
                        </>
                      )}
                      {canAccessPastOrders && (
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => setView("past")}
                          >
                            <FileText className="h-5 w-5 mr-3" />
                            Past Orders
                          </Button>
                        </SheetClose>
                      )}
                      {(isCrew || isStaff) && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12"
                          onClick={() => router.push("/dtr")}
                        >
                          <Clock className="h-5 w-5 mr-3" />
                          DTR
                        </Button>
                      )}
                      {canAccessAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/admin")}
                          >
                            <Settings className="h-5 w-5 mr-3" />
                            Admin Panel
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => router.push("/dtr/admin")}
                          >
                            <Clock className="h-5 w-5 mr-3" />
                            DTR Management
                          </Button>
                        </>
                      )}
                      <Separator className="my-4" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12"
                        onClick={() => router.push("/change-password")}
                      >
                        <KeyRound className="h-5 w-5 mr-3" />
                        Change Password
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                      </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Only show Order Taker for non-crew users */}
      {!isCrew && view === "taker" && (
        <OrderTaker
          appendingOrderId={appendingOrderId}
          onAppendComplete={() => setAppendingOrderId(null)}
          kitchenStatus={kitchenStatus}
        />
      )}

      {/* Show Crew Dashboard for crew users or when view is crew */}
      {(isCrew || view === "crew") && (
        <CrewDashboard
          onAppendItems={(orderId) => setAppendingOrderId(orderId)}
          onKitchenStatusChange={setKitchenStatus}
        />
      )}

      {/* Hidden Crew Dashboard for kitchen status calculation when on Order Taker view */}
      {!isCrew && view === "taker" && (
        <div className="hidden">
          <CrewDashboard
            onAppendItems={(orderId) => setAppendingOrderId(orderId)}
            onKitchenStatusChange={setKitchenStatus}
          />
        </div>
      )}

      {/* Show Past Orders only for admins and super_admins */}
      {canAccessPastOrders && view === "past" && <PastOrders />}
    </div>
  )
}
