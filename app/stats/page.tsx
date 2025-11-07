"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ordersApi, Order, menuItemsApi, MenuItem, withdrawalsApi, Withdrawal } from "@/lib/api"

interface HeatmapData {
  [day: number]: { [hour: number]: number }
}

interface OwnerStats {
  grossSales: number
  withdrawals: number
  purchases: number
  net: number
}

interface ItemQuantity {
  itemName: string
  totalQuantity: number
  avgPerDay: number
  highestPerDay: number
  lowestPerDay: number
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
  const [itemQuantities, setItemQuantities] = useState<ItemQuantity[]>([])
  const [daysInOperation, setDaysInOperation] = useState(0)

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
    const loadItemQuantities = async () => {
      try {
        const [orders, menuItems] = await Promise.all([
          ordersApi.getAll(),
          menuItemsApi.getAll()
        ])

        if (!orders || orders.length === 0) return

        // Create menu item lookup for categories
        const menuItemMap = new Map<string, MenuItem>()
        menuItems.forEach(item => {
          menuItemMap.set(item.name, item)
        })

        // Calculate item quantities per day
        // Map of date string -> item name -> quantity
        const dailyItemMap = new Map<string, Map<string, number>>()

        orders.forEach(order => {
          const orderDate = new Date(order.createdAt).toDateString()

          if (!dailyItemMap.has(orderDate)) {
            dailyItemMap.set(orderDate, new Map())
          }
          const dayMap = dailyItemMap.get(orderDate)!

          // Count main order items
          order.items.forEach(item => {
            const current = dayMap.get(item.name) || 0
            dayMap.set(item.name, current + item.quantity)
          })

          // Count appended order items
          order.appendedOrders?.forEach(appended => {
            appended.items.forEach(item => {
              const current = dayMap.get(item.name) || 0
              dayMap.set(item.name, current + item.quantity)
            })
          })
        })

        // Calculate days in operation
        const oldestOrder = orders.reduce((oldest, order) => {
          return order.createdAt < oldest ? order.createdAt : oldest
        }, Date.now())

        const daysDiff = Math.ceil((Date.now() - oldestOrder) / (1000 * 60 * 60 * 24))
        const days = Math.max(daysDiff, 1) // At least 1 day
        setDaysInOperation(days)

        // Calculate total, average, highest, and lowest per item
        const itemStatsMap = new Map<string, { total: number, dailyCounts: number[] }>()

        // Collect all daily counts for each item
        dailyItemMap.forEach((dayMap) => {
          dayMap.forEach((quantity, itemName) => {
            if (!itemStatsMap.has(itemName)) {
              itemStatsMap.set(itemName, { total: 0, dailyCounts: [] })
            }
            const stats = itemStatsMap.get(itemName)!
            stats.total += quantity
            stats.dailyCounts.push(quantity)
          })
        })

        // Convert to array and calculate stats
        const itemQuantitiesArray: ItemQuantity[] = Array.from(itemStatsMap.entries())
          .map(([itemName, stats]) => {
            const highestPerDay = Math.max(...stats.dailyCounts)
            const lowestPerDay = Math.min(...stats.dailyCounts)
            const avgPerDay = stats.total / days

            return {
              itemName,
              totalQuantity: stats.total,
              avgPerDay,
              highestPerDay,
              lowestPerDay
            }
          })
          .filter(item => {
            // Only show items with at least 1 order average
            if (item.avgPerDay < 1) {
              console.log(`Filtering out ${item.itemName}: avgPerDay = ${item.avgPerDay}`)
              return false
            }

            // Exclude items in "misc" or "add-on" categories
            const menuItem = menuItemMap.get(item.itemName)
            if (menuItem) {
              const category = menuItem.category.toLowerCase()
              console.log(`Item: ${item.itemName}, Category: ${category}`)
              if (category === "misc" || category === "add-on" || category === "add-ons") {
                console.log(`Filtering out ${item.itemName}: category = ${category}`)
                return false
              }
            }

            return true
          })
          .sort((a, b) => b.avgPerDay - a.avgPerDay) // Sort by avg per day descending

        setItemQuantities(itemQuantitiesArray)
      } catch (error) {
        console.error("Error loading item quantities:", error)
      }
    }

    loadItemQuantities()
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

        {/* Item Quantities Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Average Item Quantities per Day</h2>
          <p className="text-sm text-gray-600 mb-4">
            Based on {daysInOperation} day{daysInOperation !== 1 ? 's' : ''} of operation. Use this to prepare stock levels.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Sold</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg per Day</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Highest per Day</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Lowest per Day</th>
                </tr>
              </thead>
              <tbody>
                {itemQuantities.length > 0 ? (
                  itemQuantities.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">{item.itemName}</td>
                      <td className="py-3 px-4 text-right text-gray-800">{item.totalQuantity}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        {item.avgPerDay.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">
                        {item.highestPerDay}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-600">
                        {item.lowestPerDay}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No item data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                        const count = heatmapData[actualDayIndex]?.[hour] || 0
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
