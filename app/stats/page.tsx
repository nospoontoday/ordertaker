"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ordersApi, Order } from "@/lib/api"

interface HeatmapData {
  [day: number]: { [hour: number]: number }
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const HOURS = Array.from({ length: 24 }, (_, i) => i).filter(h => h < 2 || h >= 12)

export default function StatsPage() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({})
  const [maxOrders, setMaxOrders] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const orders = await ordersApi.getAll()
        if (!orders || orders.length === 0) return
        const data: HeatmapData = {}

        // Initialize data structure
        for (let day = 0; day < 7; day++) {
          data[day] = {}
          for (let hour = 0; hour < 24; hour++) {
            data[day][hour] = 0
          }
        }

        // Count orders by day and hour
        let max = 0
        let total = orders.length
        orders.forEach((order) => {
          const date = new Date(order.createdAt)
          const day = date.getDay()
          const hour = date.getHours()

          data[day][hour]++
          if (data[day][hour] > max) max = data[day][hour]

          // Count appended orders
          order.appendedOrders?.forEach((appended) => {
            total++
            const appendedDate = new Date(appended.createdAt)
            const appendedDay = appendedDate.getDay()
            const appendedHour = appendedDate.getHours()

            data[appendedDay][appendedHour]++
            if (data[appendedDay][appendedHour] > max) max = data[appendedDay][appendedHour]
          })
        })

        setHeatmapData(data)
        setMaxOrders(max)
        setTotalOrders(total)
      } catch (error) {
        console.error("Error loading orders:", error)
      }
    }

    loadOrders()
  }, [])

  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-100"
    const intensity = Math.min((count / maxOrders) * 100, 100)

    if (intensity <= 20) return "bg-blue-200"
    if (intensity <= 40) return "bg-blue-300"
    if (intensity <= 60) return "bg-blue-400"
    if (intensity <= 80) return "bg-blue-500"
    return "bg-blue-600"
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "12am"
    if (hour < 12) return `${hour}am`
    if (hour === 12) return "12pm"
    return `${hour - 12}pm`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Order Statistics</h1>
            <p className="text-gray-600 mt-1">Customer order patterns by time and day</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Order Heatmap</h2>
          <p className="text-sm text-gray-600 mb-6">
            This heatmap shows when customers typically place orders, helping you anticipate busy periods.
          </p>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour labels */}
              <div className="flex mb-2">
                <div className="w-24 flex-shrink-0"></div>
                <div className="flex gap-1">
                  {HOURS.filter((h) => h % 2 === 0).map((hour) => (
                    <div key={hour} className="w-8 text-xs text-center text-gray-600" style={{ marginRight: "4px" }}>
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap grid */}
              {DAYS.map((day, dayIndex) => (
                <div key={dayIndex} className="flex items-center mb-1">
                  <div className="w-24 text-sm font-medium text-gray-700 flex-shrink-0">
                    {day}
                  </div>
                  <div className="flex gap-1">
                    {HOURS.map((hour) => {
                      const count = heatmapData[dayIndex]?.[hour] || 0
                      return (
                        <div
                          key={hour}
                          className={`w-8 h-8 rounded ${getColor(count)} flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer`}
                          title={`${day} ${formatHour(hour)}: ${count} order${count !== 1 ? "s" : ""}`}
                        >
                          {count > 0 && <span className="text-white">{count}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm text-gray-600">Less</span>
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded bg-gray-100"></div>
                  <div className="w-6 h-6 rounded bg-blue-200"></div>
                  <div className="w-6 h-6 rounded bg-blue-300"></div>
                  <div className="w-6 h-6 rounded bg-blue-400"></div>
                  <div className="w-6 h-6 rounded bg-blue-500"></div>
                  <div className="w-6 h-6 rounded bg-blue-600"></div>
                </div>
                <span className="text-sm text-gray-600">More</span>
              </div>
            </div>
          </div>

          {totalOrders === 0 && (
            <div className="text-center py-8 text-gray-500">
              No order data available yet. Start taking orders to see patterns.
            </div>
          )}
          {totalOrders > 0 && maxOrders === 0 && (
            <div className="text-center py-8 text-gray-500">
              All {totalOrders} order{totalOrders !== 1 ? "s" : ""} fall outside the displayed time range (12am-2am, 12pm-11pm).
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
