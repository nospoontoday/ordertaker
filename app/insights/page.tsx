"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { insightsApi, type BusinessInsights } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Users, 
  ShoppingCart,
  BarChart3,
  PieChart,
  LineChart,
  Lightbulb,
  AlertCircle,
  ChefHat,
  DollarSign,
  Package
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"

export default function InsightsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [insights, setInsights] = useState<BusinessInsights | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check if user can access (all roles except crew)
  const canAccess = user?.role !== "crew"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated or doesn't have access
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.push("/login")
      } else if (!canAccess) {
        router.push("/")
        toast({
          title: "Access Denied",
          description: "You don't have permission to view business insights.",
          variant: "destructive",
        })
      }
    }
  }, [mounted, isLoading, user, canAccess, router, toast])

  const fetchInsights = async () => {
    setIsLoadingData(true)
    try {
      const data = await insightsApi.getInsights()
      setInsights(data)
    } catch (error) {
      console.error("Error fetching insights:", error)
      toast({
        title: "Error",
        description: "Failed to load business insights.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (canAccess && user) {
      fetchInsights()
    }
  }, [canAccess, user])

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300'
    }
  }

  const formatHour12 = (hour: number) => {
    if (hour === 0) return "12AM"
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return "12PM"
    return `${hour - 12}PM`
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  if (!mounted || isLoading || !user || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1">
                  Business Intelligence Insights
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Data-driven insights from the last 90 days
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={isLoadingData}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingData ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-10 w-10 animate-spin text-slate-400 mb-4" />
            <p className="text-base font-medium text-slate-500">Analyzing business data...</p>
          </div>
        )}

        {/* No Data State */}
        {!isLoadingData && !insights && (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Insights Available</h3>
            <p className="text-sm text-slate-600">
              No order data available for analysis. Insights will appear once you have sufficient sales data.
            </p>
          </Card>
        )}

        {/* Insights Content */}
        {!isLoadingData && insights && (
          <div className="space-y-8">
            {/* Alerts Section */}
            {insights.alerts && insights.alerts.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-xl font-bold text-slate-900">Active Alerts</h2>
                  <Badge className="bg-amber-600 text-white">{insights.alerts.length}</Badge>
                </div>
                <div className="space-y-3">
                  {insights.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.severity)}
                        <div className="flex-1">
                          <p className="font-semibold">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Executive Summary */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">📌 Executive Summary</h2>
              </div>
              <ul className="space-y-2">
                {insights.executiveSummary.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-emerald-700">Total Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-900">
                  ₱{insights.summary.totalRevenue.toFixed(2)}
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  {insights.summary.totalOrders} orders
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700">Avg Order Value</span>
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  ₱{insights.summary.avgOrderValue.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Per transaction
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-700">Total Customers</span>
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {insights.summary.uniqueCustomers}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Unique customers
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-orange-700">Revenue Trend</span>
                  {insights.summary.revenueTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${
                  insights.summary.revenueTrend >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {insights.summary.revenueTrend >= 0 ? '+' : ''}
                  {insights.summary.revenueTrend.toFixed(1)}%
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  Week over week
                </div>
              </Card>
            </div>

            {/* Product Performance */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">📊 Product Performance</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Best Sellers by Revenue */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Top 10 Best Sellers (Revenue)
                  </h3>
                  <div className="space-y-2">
                    {insights.productPerformance.topSellersByRevenue.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-emerald-600 text-white font-bold w-8 h-8 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.quantity} sold • {item.orderCount} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">₱{item.revenue.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">₱{item.avgRevenuePerOrder.toFixed(2)}/order</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slowest Moving Items */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Slowest Moving Items
                  </h3>
                  <div className="space-y-2">
                    {insights.productPerformance.slowMovingItems.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-red-600 text-white font-bold w-8 h-8 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.quantity} sold • {item.orderCount} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">₱{item.revenue.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">₱{item.avgRevenuePerOrder.toFixed(2)}/order</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trending Items */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trending Up */}
                {insights.productPerformance.trendingUp.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trending Up ⬆️
                    </h3>
                    <div className="space-y-2">
                      {insights.productPerformance.trendingUp.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">₱{item.revenue.toFixed(2)} revenue</p>
                          </div>
                          <Badge className="bg-emerald-600 text-white">
                            +{item.growth}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Down */}
                {insights.productPerformance.trendingDown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Trending Down ⬇️
                    </h3>
                    <div className="space-y-2">
                      {insights.productPerformance.trendingDown.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">₱{item.revenue.toFixed(2)} revenue</p>
                          </div>
                          <Badge className="bg-red-600 text-white">
                            {item.growth}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Peak & Off-Peak Times */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">⏰ Peak & Off-Peak Times</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Busiest Hours Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Busiest Hours</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={insights.peakTimes.busiestHours.map(h => ({ ...h, hourLabel: formatHour12(h.hour) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hourLabel" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`${value}`, 'Orders']}
                      />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Day of Week Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Day of Week Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={insights.peakTimes.dayOfWeekPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`₱${value.toFixed(2)}`, 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hourly Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Hourly Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Hour</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Orders</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.peakTimes.hourlyBreakdown.map((hour, index) => (
                        <tr key={index} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 text-sm font-medium text-slate-900">{formatHour12(hour.hour)}</td>
                          <td className="py-2 px-3 text-sm text-slate-600 text-right">{hour.orders}</td>
                          <td className="py-2 px-3 text-sm font-bold text-slate-900 text-right">₱{hour.revenue.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sm text-slate-600 text-right">₱{hour.avgOrderValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Customer Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">👤 Customer Insights</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* High Value Customers */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">High-Value Customers</h3>
                  <div className="space-y-2">
                    {insights.customerInsights.highValueCustomers
                      .filter(customer => customer.name.toLowerCase() !== 'daily summary - cash')
                      .slice(0, 10).map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.orders} orders • {customer.uniqueItems} unique items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">₱{customer.revenue.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">₱{customer.avgOrderValue.toFixed(2)}/order</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Combinations */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Popular Item Combinations</h3>
                  <div className="space-y-2">
                    {insights.customerInsights.popularCombinations.slice(0, 10).map((combo, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <p className="font-semibold text-slate-900">{combo.item1}</p>
                          <p className="text-sm text-slate-600">+ {combo.item2}</p>
                        </div>
                        <Badge className="bg-blue-600 text-white">
                          {combo.count}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">
                  Average Revenue per Customer: ₱{insights.customerInsights.avgRevenuePerCustomer.toFixed(2)}
                </p>
              </div>
            </Card>

            {/* Preparation Time Analysis */}
            {insights.preparationTime.overallAverage && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ChefHat className="h-5 w-5 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">⏱️ Preparation Time Analysis</h2>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900">
                    Overall Average Preparation Time: {insights.preparationTime.overallAverage.toFixed(1)} {insights.preparationTime.unit}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Slowest Preparation Times</h3>
                  <div className="space-y-2">
                    {insights.preparationTime.slowestItems.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-semibold text-slate-900">{item.itemName}</p>
                          <p className="text-xs text-slate-500">
                            Min: {item.minPrepTime.toFixed(1)}min • Max: {item.maxPrepTime.toFixed(1)}min • {item.count} orders
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{item.avgPrepTime.toFixed(1)} min</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Category Performance */}
            {insights.categoryPerformance.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="h-5 w-5 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Category Performance</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={insights.categoryPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.category} (${(entry.percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {insights.categoryPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {insights.categoryPerformance.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <p className="font-semibold text-slate-900">{category.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">₱{category.revenue.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{category.quantity} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-bold text-slate-900">💡 Recommendations</h2>
              </div>
              <div className="space-y-4">
                {insights.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={`${getPriorityColor(rec.priority)} mt-1`}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 mb-1">{rec.title}</h4>
                        <p className="text-sm text-slate-700">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily Revenue Trend */}
            {insights.dailyRevenue.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <LineChart className="h-5 w-5 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Daily Revenue Trend</h2>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={insights.dailyRevenue.map(d => ({
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    revenue: d.revenue,
                    orders: d.orders
                  }))}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => `₱${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Daily Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

