"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ordersApi } from "@/lib/api"
import { useOrderEvents } from "@/contexts/websocket-context"
import { cn } from "@/lib/utils"

export function OnlineOrderNotification() {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()

  const fetchCount = async () => {
    try {
      const data = await ordersApi.getOnlineOrdersCount()
      setCount(data.count)
    } catch (error) {
      console.error("Error fetching online orders count:", error)
    }
  }

  useEffect(() => {
    fetchCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Listen for real-time updates
  useOrderEvents({
    onOnlineOrderCreated: () => {
      setCount((prev) => prev + 1)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    },
    onOnlineOrderConfirmed: () => {
      setCount((prev) => Math.max(0, prev - 1))
    },
  })

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => router.push("/online-orders")}
    >
      <Bell className={cn("h-5 w-5", isAnimating && "animate-bounce")} />
      {count > 0 && (
        <Badge
          className={cn(
            "absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center",
            "bg-red-500 hover:bg-red-500 text-white text-xs font-bold",
            isAnimating && "animate-pulse"
          )}
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Button>
  )
}
