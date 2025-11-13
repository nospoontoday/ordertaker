"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { KitchenView } from "@/components/kitchen-view"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard, LogOut, KeyRound, Settings, ChefHat, Menu } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

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
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex gap-2">
              {canAccessOrderDashboard && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/?view=crew")}
                  className="min-h-[44px]"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Order Dashboard
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{user.email}</span>
              <div className="h-6 w-px bg-slate-300" />

              {canAccessAdmin && (
                <Button variant="outline" onClick={() => router.push("/admin")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push("/change-password")}>
                <KeyRound className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between">
              {/* Logo Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
                <ChefHat className="h-6 w-6 text-white" />
              </div>

              <div className="flex items-center gap-2">
                {/* Dashboard Button */}
                {canAccessOrderDashboard && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/?view=crew")}
                    className="min-h-[44px] px-4"
                  >
                    Dashboard
                  </Button>
                )}

                {/* Hamburger Menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                      <SheetDescription className="text-xs">
                        {user?.email}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-8 space-y-2">
                      {canAccessAdmin && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12"
                          onClick={() => router.push("/admin")}
                        >
                          <Settings className="h-5 w-5 mr-3" />
                          Admin Panel
                        </Button>
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
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>
      <KitchenView />
    </div>
  )
}

