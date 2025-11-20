"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, TrendingUp, Users } from "lucide-react"
import { ordersApi, withdrawalsApi, type Withdrawal } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  customerName: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    status: "pending" | "preparing" | "ready" | "served"
  }>
  createdAt: number | string
  isPaid: boolean
  paymentMethod?: "cash" | "gcash" | "split" | null
  cashAmount?: number
  gcashAmount?: number
  orderTakerName?: string
  orderTakerEmail?: string
  appendedOrders?: Array<{
    id: string
    items: Array<{
      id: string
      name: string
      price: number
      quantity: number
      status: "pending" | "preparing" | "ready" | "served"
    }>
    createdAt: number
    isPaid?: boolean
    paymentMethod?: "cash" | "gcash" | "split" | null
    cashAmount?: number
    gcashAmount?: number
  }>
}

interface MonthlySalesReportProps {
  month: number // 0-11 (January = 0)
  year: number
}

export function MonthlySalesReport({ month, year }: MonthlySalesReportProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  useEffect(() => {
    fetchData()
  }, [month, year])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ordersData, withdrawalsData] = await Promise.all([
        ordersApi.getAll(),
        withdrawalsApi.getAll(),
      ])
      setOrders(ordersData)
      setWithdrawals(withdrawalsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch monthly sales data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const monthlySales = useMemo(() => {
    // Get the month range
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

    // Filter completed orders in the month
    const completedOrders = orders.filter((order) => {
      let orderTime: number
      if (typeof order.createdAt === "number") {
        orderTime = order.createdAt
      } else {
        orderTime = new Date(order.createdAt).getTime()
      }

      const isInMonth = orderTime >= monthStart.getTime() && orderTime <= monthEnd.getTime()
      const mainOrderPaid = order.isPaid === true
      const allAppendedPaid =
        !order.appendedOrders ||
        order.appendedOrders.length === 0 ||
        order.appendedOrders.every((appended) => appended.isPaid === true)

      return isInMonth && mainOrderPaid && allAppendedPaid
    })

    // Calculate overall totals
    let totalCash = 0
    let totalGcash = 0
    const userSales: Record<
      string,
      { name: string; email: string; cash: number; gcash: number; orderCount: number }
    > = {}

    completedOrders.forEach((order) => {
      // Get user identifier
      const userName = order.orderTakerName || "Unknown"
      const userEmail = order.orderTakerEmail || ""
      const userKey = userEmail || userName

      // Initialize user if not exists
      if (!userSales[userKey]) {
        userSales[userKey] = {
          name: userName,
          email: userEmail,
          cash: 0,
          gcash: 0,
          orderCount: 0,
        }
      }

      // Increment order count
      userSales[userKey].orderCount++

      // Calculate total of all items (main + appended)
      const mainTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      
      let appendedTotal = 0
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        order.appendedOrders.forEach((appended) => {
          if (appended.isPaid) {
            appendedTotal += appended.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          }
        })
      }
      
      const totalOrderAmount = mainTotal + appendedTotal

      // Add to overall totals and user totals
      if (order.isPaid) {
        if (order.paymentMethod === "cash") {
          totalCash += totalOrderAmount
          userSales[userKey].cash += totalOrderAmount
        } else if (order.paymentMethod === "gcash") {
          totalGcash += totalOrderAmount
          userSales[userKey].gcash += totalOrderAmount
        } else if (order.paymentMethod === "split") {
          // For split payments, use actual amounts (already includes appended orders)
          const cashAmt = order.cashAmount || 0
          const gcashAmt = order.gcashAmount || 0
          totalCash += cashAmt
          totalGcash += gcashAmt
          userSales[userKey].cash += cashAmt
          userSales[userKey].gcash += gcashAmt
        } else {
          // Legacy orders without payment method
          totalCash += totalOrderAmount
          userSales[userKey].cash += totalOrderAmount
        }
      }
    })

    // Calculate withdrawals/purchases for the month
    let totalWithdrawals = 0
    let totalPurchases = 0

    withdrawals.forEach((withdrawal) => {
      let withdrawalTime: number
      if (typeof withdrawal.createdAt === "number") {
        withdrawalTime = withdrawal.createdAt
      } else {
        withdrawalTime = new Date(withdrawal.createdAt).getTime()
      }

      const isInMonth = withdrawalTime >= monthStart.getTime() && withdrawalTime <= monthEnd.getTime()

      if (isInMonth) {
        if (withdrawal.type === "withdrawal") {
          totalWithdrawals += withdrawal.amount
        } else if (withdrawal.type === "purchase") {
          totalPurchases += withdrawal.amount
        }
      }
    })

    const totalDeductions = totalWithdrawals + totalPurchases
    const totalSales = totalCash + totalGcash
    const netSales = totalSales - totalDeductions

    return {
      totalCash,
      totalGcash,
      totalSales,
      totalWithdrawals,
      totalPurchases,
      totalDeductions,
      netSales,
      userSales: Object.values(userSales).sort((a, b) => (b.cash + b.gcash) - (a.cash + a.gcash)),
      orderCount: completedOrders.length,
    }
  }, [orders, withdrawals, month, year])

  // Filter for John and Elwin specifically
  const johnSales = monthlySales.userSales.find(
    (user) => user.name.toLowerCase().includes("john") || user.email.toLowerCase().includes("john")
  )
  const elwinSales = monthlySales.userSales.find(
    (user) => user.name.toLowerCase().includes("elwin") || user.email.toLowerCase().includes("elwin")
  )

  if (isLoading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="text-slate-500">Loading monthly sales report...</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Monthly Sales Report</h2>
            <p className="text-sm text-slate-600 font-medium">{monthName}</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Overall Financial Summary */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
          <TrendingUp className="w-5 h-5" />
          Overall Financial Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Sales</div>
            <div className="text-2xl font-bold text-slate-900">₱{monthlySales.totalSales.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">{monthlySales.orderCount} orders</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <Badge className="bg-emerald-600 border border-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded-md">
                💵
              </Badge>
              Cash
            </div>
            <div className="text-2xl font-bold text-emerald-600">₱{monthlySales.totalCash.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <Badge className="bg-blue-500 border border-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-md">
                Ⓖ
              </Badge>
              GCash
            </div>
            <div className="text-2xl font-bold text-blue-500">₱{monthlySales.totalGcash.toFixed(2)}</div>
          </div>
        </div>

        {/* Deductions */}
        {(monthlySales.totalWithdrawals > 0 || monthlySales.totalPurchases > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pt-4 border-t border-slate-200">
            {monthlySales.totalWithdrawals > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                  <Badge className="bg-red-600 border border-red-700 text-white font-bold text-xs px-2 py-0.5 rounded-md">
                    💰
                  </Badge>
                  Withdrawals
                </div>
                <div className="text-2xl font-bold text-red-600">-₱{monthlySales.totalWithdrawals.toFixed(2)}</div>
              </div>
            )}
            {monthlySales.totalPurchases > 0 && (
              <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                  <Badge className="bg-orange-500 border border-orange-600 text-white font-bold text-xs px-2 py-0.5 rounded-md">
                    🛒
                  </Badge>
                  Purchases
                </div>
                <div className="text-2xl font-bold text-orange-600">-₱{monthlySales.totalPurchases.toFixed(2)}</div>
              </div>
            )}
            <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-md">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">
                Total Deductions
              </div>
              <div className="text-2xl font-bold text-slate-900">-₱{monthlySales.totalDeductions.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Net Sales */}
        <div className="pt-4 border-t-2 border-slate-300">
          <div className="bg-gradient-to-r from-slate-100 to-white rounded-lg p-4 border-2 border-slate-300 shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Net Sales</div>
              <div
                className={`text-3xl font-bold ${monthlySales.netSales >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                ₱{monthlySales.netSales.toFixed(2)}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Sales - Total Deductions</div>
          </div>
        </div>
      </Card>

      {/* John's Summary */}
      {johnSales && (
        <Card className="p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-blue-600" />
            John's Financial Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Sales</div>
              <div className="text-xl font-bold text-slate-900">
                ₱{(johnSales.cash + johnSales.gcash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{johnSales.orderCount} orders</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Cash</div>
              <div className="text-xl font-bold text-emerald-600">₱{johnSales.cash.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">GCash</div>
              <div className="text-xl font-bold text-blue-500">₱{johnSales.gcash.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Contribution</div>
              <div className="text-xl font-bold text-blue-600">
                {monthlySales.totalSales > 0
                  ? (((johnSales.cash + johnSales.gcash) / monthlySales.totalSales) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Elwin's Summary */}
      {elwinSales && (
        <Card className="p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 border border-purple-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-purple-600" />
            Elwin's Financial Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Sales</div>
              <div className="text-xl font-bold text-slate-900">
                ₱{(elwinSales.cash + elwinSales.gcash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{elwinSales.orderCount} orders</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Cash</div>
              <div className="text-xl font-bold text-emerald-600">₱{elwinSales.cash.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">GCash</div>
              <div className="text-xl font-bold text-blue-500">₱{elwinSales.gcash.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Contribution</div>
              <div className="text-xl font-bold text-purple-600">
                {monthlySales.totalSales > 0
                  ? (((elwinSales.cash + elwinSales.gcash) / monthlySales.totalSales) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* All Users Summary */}
      {monthlySales.userSales.length > 0 && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <DollarSign className="w-5 h-5" />
            All Users Summary
          </h3>

          <div className="space-y-3">
            {monthlySales.userSales.map((user, index) => (
              <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    {user.email && <div className="text-xs text-slate-500">{user.email}</div>}
                  </div>
                  <Badge variant="outline" className="text-slate-700 font-semibold">
                    {user.orderCount} orders
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-slate-600">Total</div>
                    <div className="font-bold text-slate-900">₱{(user.cash + user.gcash).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Cash</div>
                    <div className="font-bold text-emerald-600">₱{user.cash.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">GCash</div>
                    <div className="font-bold text-blue-500">₱{user.gcash.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
