"use client"

import { useState, useEffect, useMemo } from "react"
import { Clock, AlertCircle, Users, ChevronDown, ChevronUp, ChefHat } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { KitchenStatusData } from "@/components/kitchen-status-banner"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
  note?: string
}

interface AppendedOrder {
  id: string
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
}

interface Order {
  id: string
  orderNumber?: number
  customerName: string
  items: OrderItem[]
  createdAt: number
  isPaid: boolean
  orderType?: "dine-in" | "take-out"
  appendedOrders?: AppendedOrder[]
}

interface UnservedItem {
  name: string
  count: number
  status: "pending" | "preparing" | "ready"
}

interface WaitingCustomer {
  orderId: string
  orderNumber?: number
  customerName: string
  createdAt: number
  waitTimeMs: number
  unservedItems: UnservedItem[]
}

interface WaitingCustomersBannerProps {
  orders: Order[]
  historicalAverageWaitTimeMs?: number // Historical average wait time from all completed orders
  kitchenStatus?: KitchenStatusData | null
}

export function WaitingCustomersBanner({ orders, historicalAverageWaitTimeMs, kitchenStatus }: WaitingCustomersBannerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Update current time every second for live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate waiting customers from orders
  const waitingCustomers = useMemo(() => {
    const customers: WaitingCustomer[] = []

    orders.forEach((order) => {
      // Collect all unserved items from main order and appended orders
      const unservedItemsMap = new Map<string, UnservedItem>()

      // Process main order items
      order.items.forEach((item) => {
        if (item.status !== "served") {
          const key = `${item.name}|${item.status}`
          const existing = unservedItemsMap.get(key)
          if (existing) {
            existing.count += item.quantity
          } else {
            unservedItemsMap.set(key, {
              name: item.name,
              count: item.quantity,
              status: item.status as "pending" | "preparing" | "ready",
            })
          }
        }
      })

      // Process appended order items
      order.appendedOrders?.forEach((appended) => {
        appended.items.forEach((item) => {
          if (item.status !== "served") {
            const key = `${item.name}|${item.status}`
            const existing = unservedItemsMap.get(key)
            if (existing) {
              existing.count += item.quantity
            } else {
              unservedItemsMap.set(key, {
                name: item.name,
                count: item.quantity,
                status: item.status as "pending" | "preparing" | "ready",
              })
            }
          }
        })
      })

      // If there are unserved items, add to waiting customers
      if (unservedItemsMap.size > 0) {
        const waitTimeMs = currentTime - order.createdAt
        customers.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          createdAt: order.createdAt,
          waitTimeMs,
          unservedItems: Array.from(unservedItemsMap.values()),
        })
      }
    })

    // Sort by createdAt ascending (oldest first = longest wait at top)
    return customers.sort((a, b) => a.createdAt - b.createdAt)
  }, [orders, currentTime])

  // Use historical average if provided, otherwise fall back to current waiting customers average
  const averageWaitTime = useMemo(() => {
    // Prefer historical average from all completed orders
    if (historicalAverageWaitTimeMs && historicalAverageWaitTimeMs > 0) {
      return historicalAverageWaitTimeMs
    }
    // Fallback to current waiting customers average
    if (waitingCustomers.length === 0) return 0
    const totalWaitTime = waitingCustomers.reduce((sum, c) => sum + c.waitTimeMs, 0)
    return totalWaitTime / waitingCustomers.length
  }, [waitingCustomers, historicalAverageWaitTimeMs])

  // Format duration as "Xm Ys"
  const formatWaitTime = (ms: number): string => {
    if (ms <= 0) return "0s"

    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes === 0) {
      return `${seconds}s`
    }
    return `${minutes}m ${seconds}s`
  }

  // Get color based on wait time relative to average
  const getUrgencyColor = (waitTimeMs: number): "green" | "yellow" | "red" => {
    // Fallback thresholds when average is too low or no good baseline
    const minThresholdMs = 5 * 60 * 1000 // 5 minutes
    const midThresholdMs = 10 * 60 * 1000 // 10 minutes

    if (averageWaitTime < minThresholdMs) {
      // Use fixed thresholds
      if (waitTimeMs < minThresholdMs) return "green"
      if (waitTimeMs < midThresholdMs) return "yellow"
      return "red"
    }

    // Use relative thresholds based on average
    if (waitTimeMs < averageWaitTime * 0.5) return "green"
    if (waitTimeMs < averageWaitTime) return "yellow"
    return "red"
  }

  // Get status icon based on item status
  const getStatusBadge = (status: "pending" | "preparing" | "ready") => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
            Pending
          </Badge>
        )
      case "preparing":
        return (
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
            Preparing
          </Badge>
        )
      case "ready":
        return (
          <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
            Ready
          </Badge>
        )
    }
  }

  // Kitchen status helpers
  const getKitchenStatusColor = (loadPercent: number): "green" | "yellow" | "red" => {
    if (loadPercent >= 80) return "red"
    if (loadPercent >= 50) return "yellow"
    return "green"
  }

  const getKitchenStatusLabel = (loadPercent: number): string => {
    if (loadPercent >= 80) return "High Load"
    if (loadPercent >= 50) return "Medium Load"
    return "Low Load"
  }

  // Don't render if no waiting customers
  if (waitingCustomers.length === 0) {
    return null
  }

  return (
    <div className="sticky top-[70px] z-40 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
        <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 text-orange-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-orange-900">Waiting Customers</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-orange-600 text-white text-xs">
                  {waitingCustomers.length} {waitingCustomers.length === 1 ? "customer" : "customers"}
                </Badge>
                {averageWaitTime > 0 && (
                  <span className="text-xs text-orange-700">
                    Avg wait: {formatWaitTime(averageWaitTime)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kitchen Status Metrics */}
          <div className="flex items-center gap-4">
            {kitchenStatus && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">Pending</span>
                  <span className="font-bold text-amber-700">{kitchenStatus.pendingItemsCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">Preparing</span>
                  <span className="font-bold text-blue-700 flex items-center gap-1">
                    <ChefHat className="h-3.5 w-3.5" />
                    {kitchenStatus.preparingItemsCount}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getKitchenStatusColor(kitchenStatus.kitchenLoadPercent) === "red" && "border-red-600 text-red-700 bg-red-50",
                    getKitchenStatusColor(kitchenStatus.kitchenLoadPercent) === "yellow" && "border-yellow-600 text-yellow-700 bg-yellow-50",
                    getKitchenStatusColor(kitchenStatus.kitchenLoadPercent) === "green" && "border-green-600 text-green-700 bg-green-50"
                  )}
                >
                  {getKitchenStatusLabel(kitchenStatus.kitchenLoadPercent)}
                </Badge>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-orange-700 hover:bg-orange-100"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Customer List */}
        {!isCollapsed && (
          <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
            {waitingCustomers.map((customer) => {
              const urgencyColor = getUrgencyColor(customer.waitTimeMs)

              return (
                <div
                  key={customer.orderId}
                  className={cn(
                    "flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all",
                    urgencyColor === "red" && "bg-red-50 border-red-300",
                    urgencyColor === "yellow" && "bg-yellow-50 border-yellow-300",
                    urgencyColor === "green" && "bg-green-50 border-green-300"
                  )}
                >
                  {/* Left: Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold text-sm",
                          urgencyColor === "red" && "text-red-800",
                          urgencyColor === "yellow" && "text-yellow-800",
                          urgencyColor === "green" && "text-green-800"
                        )}
                      >
                        {customer.orderNumber ? `#${customer.orderNumber}` : ""} {customer.customerName}
                      </span>
                      {urgencyColor === "red" && (
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {customer.unservedItems.map((item, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            urgencyColor === "red" && "bg-red-100 text-red-700",
                            urgencyColor === "yellow" && "bg-yellow-100 text-yellow-700",
                            urgencyColor === "green" && "bg-green-100 text-green-700"
                          )}
                        >
                          {item.count}x {item.name}
                          {item.status !== "pending" && (
                            <span className="ml-1 opacity-75">
                              ({item.status})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Timer */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold flex-shrink-0",
                      urgencyColor === "red" && "bg-red-200 text-red-800",
                      urgencyColor === "yellow" && "bg-yellow-200 text-yellow-800",
                      urgencyColor === "green" && "bg-green-200 text-green-800"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {formatWaitTime(customer.waitTimeMs)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </Card>
    </div>
  )
}
