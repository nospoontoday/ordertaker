"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ordersApi, Order, menuItemsApi, MenuItem, withdrawalsApi, Withdrawal } from "@/lib/api"

interface HeatmapData {
  [day: number]: { [hour: number]: { total: number; dates: Set<string> } }
}

interface OwnerStats {
  grossSales: number
  withdrawals: number
  purchases: number
  net: number
}

interface ItemAverage {
  name: string
  averagePerDay: number
  totalQuantity: number
  totalDays: number
}

const DAYS = ["Sunday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_INDICES = [0, 2, 3, 4, 5, 6] // Map display index to actual day index (skipping Monday = 1)
const HOURS = Array.from({ length: 24 }, (_, i) => i).filter(h => h >= 14 && h <= 23)

export default function StatsPage() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({})
  const [maxOrders, setMaxOrders] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [johnStats, setJohnStats] = useState<OwnerStats>({ grossSales: 0, withdrawals: 0, purchases: 0, net: 0 })
  const [elwinStats, setElwinStats] = useState<OwnerStats>({ grossSales: 0, withdrawals: 0, purchases: 0, net: 0 })
  const [itemAverages, setItemAverages] = useState<ItemAverage[]>([])

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
            data[day][hour] = { total: 0, dates: new Set<string>() }
          }
        }

        // Count orders by day and hour, tracking unique dates
        let max = 0
        let total = orders.length
        orders.forEach((order) => {
          const date = new Date(order.createdAt)
          const day = date.getDay()
          const hour = date.getHours()
          const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD

          data[day][hour].total++
          data[day][hour].dates.add(dateKey)

          // Count appended orders
          order.appendedOrders?.forEach((appended) => {
            total++
            const appendedDate = new Date(appended.createdAt)
            const appendedDay = appendedDate.getDay()
            const appendedHour = appendedDate.getHours()
            const appendedDateKey = appendedDate.toISOString().split('T')[0]

            data[appendedDay][appendedHour].total++
            data[appendedDay][appendedHour].dates.add(appendedDateKey)
          })
        })

        // Calculate max average
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            const { total, dates } = data[day][hour]
            const avg = dates.size > 0 ? total / dates.size : 0
            if (avg > max) max = avg
          }
        }

        setHeatmapData(data)
        setMaxOrders(max)
        setTotalOrders(total)
      } catch (error) {
        console.error("Error loading orders:", error)
      }
    }

    loadOrders()
  }, [])

  useEffect(() => {
    const loadOwnerStats = async () => {
      try {
        // Fetch all data
        const [orders, menuItems, withdrawals] = await Promise.all([
          ordersApi.getAll(),
          menuItemsApi.getAll(),
          withdrawalsApi.getAll()
        ])

        // Create menu item lookup by name with owner info
        const menuItemMap = new Map<string, MenuItem>()
        menuItems.forEach(item => {
          menuItemMap.set(item.name, item)
        })

        // Calculate gross sales per owner
        let johnGross = 0
        let elwinGross = 0

        orders.forEach(order => {
          if (!order.isPaid) return // Only count paid orders

          // Calculate main order items
          order.items.forEach(item => {
            const menuItem = menuItemMap.get(item.name)
            const itemTotal = item.price * item.quantity

            if (menuItem?.owner === "john") {
              johnGross += itemTotal
            } else if (menuItem?.owner === "elwin") {
              elwinGross += itemTotal
            } else {
              // If no owner specified, split 50/50
              johnGross += itemTotal / 2
              elwinGross += itemTotal / 2
            }
          })

          // Calculate appended orders items
          order.appendedOrders?.forEach(appended => {
            if (appended.isPaid) {
              appended.items.forEach(item => {
                const menuItem = menuItemMap.get(item.name)
                const itemTotal = item.price * item.quantity

                if (menuItem?.owner === "john") {
                  johnGross += itemTotal
                } else if (menuItem?.owner === "elwin") {
                  elwinGross += itemTotal
                } else {
                  // If no owner specified, split 50/50
                  johnGross += itemTotal / 2
                  elwinGross += itemTotal / 2
                }
              })
            }
          })
        })

        // Calculate withdrawals and purchases per owner
        let johnWithdrawals = 0
        let johnPurchases = 0
        let elwinWithdrawals = 0
        let elwinPurchases = 0

        withdrawals.forEach(withdrawal => {
          const amount = withdrawal.amount

          if (withdrawal.chargedTo === "john") {
            if (withdrawal.type === "withdrawal") {
              johnWithdrawals += amount
            } else {
              johnPurchases += amount
            }
          } else if (withdrawal.chargedTo === "elwin") {
            if (withdrawal.type === "withdrawal") {
              elwinWithdrawals += amount
            } else {
              elwinPurchases += amount
            }
          } else if (withdrawal.chargedTo === "all") {
            // Split 50/50
            if (withdrawal.type === "withdrawal") {
              johnWithdrawals += amount / 2
              elwinWithdrawals += amount / 2
            } else {
              johnPurchases += amount / 2
              elwinPurchases += amount / 2
            }
          }
        })

        // Calculate net
        const johnNet = johnGross - johnWithdrawals - johnPurchases
        const elwinNet = elwinGross - elwinWithdrawals - elwinPurchases

        setJohnStats({
          grossSales: johnGross,
          withdrawals: johnWithdrawals,
          purchases: johnPurchases,
          net: johnNet
        })

        setElwinStats({
          grossSales: elwinGross,
          withdrawals: elwinWithdrawals,
          purchases: elwinPurchases,
          net: elwinNet
        })
      } catch (error) {
        console.error("Error loading owner stats:", error)
      }
    }

    loadOwnerStats()
  }, [])

  useEffect(() => {
    const calculateItemAverages = async () => {
      try {
        const orders = await ordersApi.getAll()
        if (!orders || orders.length === 0) return

        // Track item quantities per date
        const itemsByDate = new Map<string, Map<string, number>>() // date -> itemName -> quantity
        const allDates = new Set<string>()

        orders.forEach(order => {
          const dateKey = new Date(order.createdAt).toISOString().split('T')[0]
          allDates.add(dateKey)

          if (!itemsByDate.has(dateKey)) {
            itemsByDate.set(dateKey, new Map())
          }
          const dateItems = itemsByDate.get(dateKey)!

          // Count main order items
          order.items.forEach(item => {
            const currentQty = dateItems.get(item.name) || 0
            dateItems.set(item.name, currentQty + item.quantity)
          })

          // Count appended order items
          order.appendedOrders?.forEach(appended => {
            appended.items.forEach(item => {
              const currentQty = dateItems.get(item.name) || 0
              dateItems.set(item.name, currentQty + item.quantity)
            })
          })
        })

        // Calculate averages for each item
        const itemTotals = new Map<string, number>()
        itemsByDate.forEach(dateItems => {
          dateItems.forEach((quantity, itemName) => {
            const current = itemTotals.get(itemName) || 0
            itemTotals.set(itemName, current + quantity)
          })
        })

        const totalDays = allDates.size
        const averages: ItemAverage[] = []

        itemTotals.forEach((totalQuantity, itemName) => {
          const averagePerDay = totalQuantity / totalDays

          // Only include items with average > 1 per day
          if (averagePerDay > 1) {
            averages.push({
              name: itemName,
              averagePerDay,
              totalQuantity,
              totalDays
            })
          }
        })

        // Sort by average descending
        averages.sort((a, b) => b.averagePerDay - a.averagePerDay)

        setItemAverages(averages)
      } catch (error) {
        console.error("Error calculating item averages:", error)
      }
    }

    calculateItemAverages()
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

        {/* Daily Preparation Guide */}
        {itemAverages.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Daily Preparation Guide</h2>
            <p className="text-sm text-gray-600 mb-4">
              Average orders per day for items with more than 1 order per day. Prepare at least these quantities to serve orders quickly.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Per Day</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Orders</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAverages.map((item, index) => (
                    <tr key={item.name} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                          {Math.ceil(item.averagePerDay)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">{item.totalQuantity}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{item.totalDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              💡 Tip: The &quot;Avg Per Day&quot; column shows the rounded-up quantity to prepare each day.
            </p>
          </div>
        )}

        {/* Combined Total Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Overall Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">
                ₱{(johnStats.grossSales + elwinStats.grossSales).toFixed(2)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Total Withdrawals</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{(johnStats.withdrawals + elwinStats.withdrawals).toFixed(2)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
              <p className="text-2xl font-bold text-orange-600">
                ₱{(johnStats.purchases + elwinStats.purchases).toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Net Total</p>
              <p className={`text-2xl font-bold ${(johnStats.net + elwinStats.net) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₱{(johnStats.net + elwinStats.net).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Owner Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* John's Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">John&apos;s Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Gross Sales:</span>
                <span className="text-lg font-semibold text-green-600">₱{johnStats.grossSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Withdrawals:</span>
                <span className="text-lg font-semibold text-red-600">₱{johnStats.withdrawals.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Purchases:</span>
                <span className="text-lg font-semibold text-orange-600">₱{johnStats.purchases.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                <span className="text-gray-800 font-semibold">Net Total:</span>
                <span className={`text-xl font-bold ${johnStats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₱{johnStats.net.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Elwin's Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">Elwin&apos;s Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Gross Sales:</span>
                <span className="text-lg font-semibold text-green-600">₱{elwinStats.grossSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Withdrawals:</span>
                <span className="text-lg font-semibold text-red-600">₱{elwinStats.withdrawals.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Purchases:</span>
                <span className="text-lg font-semibold text-orange-600">₱{elwinStats.purchases.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                <span className="text-gray-800 font-semibold">Net Total:</span>
                <span className={`text-xl font-bold ${elwinStats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₱{elwinStats.net.toFixed(2)}
                </span>
              </div>
            </div>
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
                  {HOURS.map((hour) => (
                    <div key={hour} className="w-8 text-xs text-center text-gray-600">
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap grid */}
              {DAYS.map((day, displayIndex) => {
                const actualDayIndex = DAY_INDICES[displayIndex]
                return (
                  <div key={actualDayIndex} className="flex items-center mb-1">
                    <div className="w-24 text-sm font-medium text-gray-700 flex-shrink-0">
                      {day}
                    </div>
                    <div className="flex gap-1">
                      {HOURS.map((hour) => {
                        const cell = heatmapData[actualDayIndex]?.[hour]
                        const avg = cell && cell.dates.size > 0 ? cell.total / cell.dates.size : 0
                        const displayValue = avg > 0 ? avg.toFixed(1) : ""
                        return (
                          <div
                            key={hour}
                            className={`w-8 h-8 rounded ${getColor(avg)} flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer`}
                            title={`${day} ${formatHour(hour)}: ${avg.toFixed(1)} avg orders (${cell?.total || 0} total over ${cell?.dates.size || 0} day${cell?.dates.size !== 1 ? "s" : ""})`}
                          >
                            {displayValue && <span className="text-white">{displayValue}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

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
