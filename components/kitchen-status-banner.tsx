"use client"

import { Clock, AlertCircle, CheckCircle, ChefHat } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface KitchenStatusData {
  pendingItemsCount: number
  preparingItemsCount: number
  averagePrepTimeMinutes: number
  estimatedWaitMinutes: number
  kitchenLoadPercent: number
}

interface KitchenStatusBannerProps {
  kitchenStatus: KitchenStatusData | null
}

export function KitchenStatusBanner({ kitchenStatus }: KitchenStatusBannerProps) {
  if (!kitchenStatus) {
    return null
  }

  const {
    pendingItemsCount,
    preparingItemsCount,
    averagePrepTimeMinutes,
    estimatedWaitMinutes,
    kitchenLoadPercent,
  } = kitchenStatus

  // Determine status color based on kitchen load
  const getStatusColor = () => {
    if (kitchenLoadPercent >= 80) return "red"
    if (kitchenLoadPercent >= 50) return "yellow"
    return "green"
  }

  const statusColor = getStatusColor()

  const getStatusLabel = () => {
    if (kitchenLoadPercent >= 80) return "High Load"
    if (kitchenLoadPercent >= 50) return "Medium Load"
    return "Low Load"
  }

  const getStatusIcon = () => {
    if (kitchenLoadPercent >= 80) return AlertCircle
    if (kitchenLoadPercent >= 50) return Clock
    return CheckCircle
  }

  const StatusIcon = getStatusIcon()

  return (
    <Card
      className={cn(
        "mx-4 mt-4 mb-2 border-2 transition-colors",
        statusColor === "red" && "border-red-500 bg-red-50",
        statusColor === "yellow" && "border-yellow-500 bg-yellow-50",
        statusColor === "green" && "border-green-500 bg-green-50"
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Status Icon and Label */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-full",
                statusColor === "red" && "bg-red-100 text-red-700",
                statusColor === "yellow" && "bg-yellow-100 text-yellow-700",
                statusColor === "green" && "bg-green-100 text-green-700"
              )}
            >
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Kitchen Status</h3>
              <Badge
                variant="outline"
                className={cn(
                  "mt-1",
                  statusColor === "red" && "border-red-600 text-red-700",
                  statusColor === "yellow" && "border-yellow-600 text-yellow-700",
                  statusColor === "green" && "border-green-600 text-green-700"
                )}
              >
                {getStatusLabel()}
              </Badge>
            </div>
          </div>

          {/* Right: Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {/* Pending Items */}
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Pending</span>
              <span className="font-bold text-lg">{pendingItemsCount}</span>
            </div>

            {/* Preparing Items */}
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Preparing</span>
              <span className="font-bold text-lg flex items-center gap-1">
                <ChefHat className="h-4 w-4" />
                {preparingItemsCount}
              </span>
            </div>

            {/* Average Prep Time */}
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Avg. Prep Time</span>
              <span className="font-bold text-lg">
                {averagePrepTimeMinutes > 0 ? `${averagePrepTimeMinutes}m` : "N/A"}
              </span>
            </div>

            {/* Estimated Wait */}
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Est. Wait (Queue + Order)</span>
              <span
                className={cn(
                  "font-bold text-lg",
                  estimatedWaitMinutes > 15 && "text-red-600",
                  estimatedWaitMinutes > 10 && estimatedWaitMinutes <= 15 && "text-yellow-600"
                )}
              >
                ~{estimatedWaitMinutes}m
              </span>
            </div>
          </div>
        </div>

        {/* Load Bar */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kitchen Capacity:</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  statusColor === "red" && "bg-red-500",
                  statusColor === "yellow" && "bg-yellow-500",
                  statusColor === "green" && "bg-green-500"
                )}
                style={{ width: `${Math.min(kitchenLoadPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold">{kitchenLoadPercent}%</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
