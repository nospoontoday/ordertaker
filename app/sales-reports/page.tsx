"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { dailySalesApi, type DailySalesSummary } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Calendar, TrendingDown, TrendingUp, ChevronDown, ChevronUp, CheckCircle2, Trash2, Pencil, BarChart3, PieChart, LineChart, GlassWater } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditDailySalesDialog } from "@/components/edit-daily-sales-dialog"
import { LineChart as RechartsLineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts"

export default function SalesReportsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [dailySales, setDailySales] = useState<DailySalesSummary[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [allDailySales, setAllDailySales] = useState<DailySalesSummary[]>([])

  // Check if user can access (all roles except crew)
  const canAccess = user?.role !== "crew"
  // Check if user is super admin
  const isSuperAdmin = user?.role === "super_admin"

  // Analytics Data - Computed from all sales data
  const analyticsData = useMemo(() => {
    if (allDailySales.length === 0) return null

    // Sort by date (oldest to newest for trends)
    const sortedSales = [...allDailySales].sort((a, b) => a.date.localeCompare(b.date))

    // 1. Sales Trend Data
    const salesTrend = sortedSales.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: day.totalSales,
      net: day.netSales,
      expenses: day.totalPurchases + day.totalWithdrawals
    }))

    // 2. Category Performance
    const categoryTotals: Record<string, number> = {}
    allDailySales.forEach(day => {
      Object.entries(day.itemsByCategory).forEach(([category, items]) => {
        if (!categoryTotals[category]) categoryTotals[category] = 0
        items.forEach(item => {
          categoryTotals[category] += item.total
        })
      })
    })
    const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: parseFloat(value.toFixed(2))
    })).sort((a, b) => b.value - a.value)

    // 3. Top Selling Items
    const itemTotals: Record<string, { quantity: number; revenue: number }> = {}
    allDailySales.forEach(day => {
      Object.values(day.itemsByCategory).forEach(items => {
        items.forEach(item => {
          if (!itemTotals[item.name]) {
            itemTotals[item.name] = { quantity: 0, revenue: 0 }
          }
          itemTotals[item.name].quantity += item.quantity
          itemTotals[item.name].revenue += item.total
        })
      })
    })
    const topItems = Object.entries(itemTotals)
      .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // 4. Payment Method Distribution
    const totalCash = allDailySales.reduce((sum, day) => sum + day.totalCash, 0)
    const totalGcash = allDailySales.reduce((sum, day) => sum + day.totalGcash, 0)
    const paymentMethodData = [
      { name: 'Cash', value: parseFloat(totalCash.toFixed(2)) },
      { name: 'GCash', value: parseFloat(totalGcash.toFixed(2)) }
    ]

    // 5. Owner Performance
    const johnTotal = allDailySales.reduce((sum, day) => sum + (day.netTotalsByOwner?.john || 0), 0)
    const elwinTotal = allDailySales.reduce((sum, day) => sum + (day.netTotalsByOwner?.elwin || 0), 0)
    const ownerData = [
      { name: 'John', net: parseFloat(johnTotal.toFixed(2)) },
      { name: 'Elwin', net: parseFloat(elwinTotal.toFixed(2)) }
    ]

    // 6. Summary Statistics
    const totalRevenue = allDailySales.reduce((sum, day) => sum + day.totalSales, 0)
    const totalExpenses = allDailySales.reduce((sum, day) => sum + day.totalPurchases + day.totalWithdrawals, 0)
    const totalNet = allDailySales.reduce((sum, day) => sum + day.netSales, 0)
    const avgDailySales = totalRevenue / allDailySales.length
    const avgDailyNet = totalNet / allDailySales.length

    // 7. Weekly comparison (if we have enough data)
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const previousWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const lastWeekSales = allDailySales
      .filter(day => new Date(day.date) >= lastWeek)
      .reduce((sum, day) => sum + day.totalSales, 0)
    
    const previousWeekSales = allDailySales
      .filter(day => {
        const date = new Date(day.date)
        return date >= previousWeek && date < lastWeek
      })
      .reduce((sum, day) => sum + day.totalSales, 0)
    
    const weekOverWeekGrowth = previousWeekSales > 0 
      ? ((lastWeekSales - previousWeekSales) / previousWeekSales) * 100 
      : 0

    // 8. Average drinks served per day (cold-coffee + cold-drink-no-coffee)
    const totalDrinksServed = allDailySales.reduce((sum, day) => {
      const coldCoffeeItems = day.itemsByCategory["cold-coffee"] || []
      const coldDrinkNoCoffeeItems = day.itemsByCategory["cold-drink-no-coffee"] || []
      const dayDrinks = [...coldCoffeeItems, ...coldDrinkNoCoffeeItems]
        .reduce((itemSum, item) => itemSum + item.quantity, 0)
      return sum + dayDrinks
    }, 0)
    const avgDrinksPerDay = allDailySales.length > 0 ? totalDrinksServed / allDailySales.length : 0

    return {
      salesTrend,
      categoryData,
      topItems,
      paymentMethodData,
      ownerData,
      summary: {
        totalRevenue,
        totalExpenses,
        totalNet,
        avgDailySales,
        avgDailyNet,
        weekOverWeekGrowth,
        daysTracked: allDailySales.length,
        totalDrinksServed,
        avgDrinksPerDay
      }
    }
  }, [allDailySales])

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
          description: "You don't have permission to view sales reports.",
          variant: "destructive",
        })
      }
    }
  }, [mounted, isLoading, user, canAccess, router, toast])

  const fetchDailySales = async (page: number = 1) => {
    setIsLoadingData(true)
    try {
      const response = await dailySalesApi.getDailySales(page, 10)
      setDailySales(response.data)
      setPagination(response.pagination)
      
      // Expand the latest (first) date by default
      if (response.data.length > 0) {
        setExpandedDates(new Set([response.data[0].date]))
      }

      // Fetch all sales data for analytics (limit to last 30 days for performance)
      if (page === 1) {
        try {
          const allDataResponse = await dailySalesApi.getDailySales(1, 30)
          setAllDailySales(allDataResponse.data)
        } catch (err) {
          console.error("Error fetching analytics data:", err)
        }
      }
    } catch (error) {
      console.error("Error fetching daily sales:", error)
      toast({
        title: "Error",
        description: "Failed to load daily sales reports.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const isExpanded = (date: string) => expandedDates.has(date)

  useEffect(() => {
    if (canAccess && user) {
      fetchDailySales(1)
    }
  }, [canAccess, user])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDailySales(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleValidateReport = async (date: string) => {
    if (!user || !isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only super admin can validate daily reports.",
        variant: "destructive",
      })
      return
    }

    try {
      await dailySalesApi.validateDailyReport(date, {
        id: user.id,
        email: user.email,
        name: user.name || "",
        role: user.role,
      })

      toast({
        title: "Success",
        description: "Daily report marked as validated.",
      })

      // Refresh the data to show updated validation status
      fetchDailySales(pagination.page)
    } catch (error) {
      console.error("Error validating daily report:", error)
      toast({
        title: "Error",
        description: "Failed to validate daily report.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteReport = async (date: string) => {
    if (!user || !isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only super admin can delete daily reports.",
        variant: "destructive",
      })
      return
    }

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the sales report for ${formatDate(date)}? This action cannot be undone.`)) {
      return
    }

    try {
      await dailySalesApi.deleteDailyReport(date, user.id)

      toast({
        title: "Success",
        description: "Daily sales report deleted successfully.",
      })

      // Refresh the data
      fetchDailySales(pagination.page)
    } catch (error) {
      console.error("Error deleting daily report:", error)
      toast({
        title: "Error",
        description: "Failed to delete daily report.",
        variant: "destructive",
      })
    }
  }

  const handleEditReport = (date: string) => {
    if (!user || !isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only super admin can edit daily reports.",
        variant: "destructive",
      })
      return
    }
    setEditingDate(date)
    setEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    fetchDailySales(pagination.page)
  }

  const formatDate = (dateString: string) => {
    // Parse YYYY-MM-DD as local date to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

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
                  Daily Sales Reports
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  View detailed sales summaries by day
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/historical-order')}
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Create Daily Summary</span>
                <span className="sm:hidden">Create</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDailySales(pagination.page)}
                disabled={isLoadingData}
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingData ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Analytics Dashboard */}
        {analyticsData && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
                <Badge className="bg-blue-100 text-blue-700 text-xs">
                  Last {analyticsData.summary.daysTracked} days
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {showAnalytics && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-700">Total Revenue</span>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      ₱{analyticsData.summary.totalRevenue.toFixed(2)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Avg: ₱{analyticsData.summary.avgDailySales.toFixed(2)}/day
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-orange-700">Total Expenses</span>
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      ₱{analyticsData.summary.totalExpenses.toFixed(2)}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Purchases + Withdrawals
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-emerald-700">Net Profit</span>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">
                      ₱{analyticsData.summary.totalNet.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">
                      Avg: ₱{analyticsData.summary.avgDailyNet.toFixed(2)}/day
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-700">Growth Rate</span>
                      {analyticsData.summary.weekOverWeekGrowth >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className={`text-2xl font-bold ${
                      analyticsData.summary.weekOverWeekGrowth >= 0 ? 'text-purple-900' : 'text-red-700'
                    }`}>
                      {analyticsData.summary.weekOverWeekGrowth >= 0 ? '+' : ''}
                      {analyticsData.summary.weekOverWeekGrowth.toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      Week over week
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-cyan-700">Drinks Served</span>
                      <GlassWater className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="text-2xl font-bold text-cyan-900">
                      {analyticsData.summary.totalDrinksServed} cups
                    </div>
                    <div className="text-xs text-cyan-600 mt-1">
                      Avg: {analyticsData.summary.avgDrinksPerDay.toFixed(1)} cups/day
                    </div>
                  </Card>
                </div>

                {/* Sales Trend Chart */}
                <div className="mb-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-blue-600" />
                      Sales Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.salesTrend}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
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
                        <ReferenceLine 
                          y={analyticsData.summary.avgDailySales} 
                          stroke="#ef4444" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{ 
                            value: `Avg: ₱${analyticsData.summary.avgDailySales.toFixed(2)}`, 
                            position: 'insideTopRight',
                            fill: '#ef4444',
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fill="url(#colorSales)"
                          name="Daily Sales"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Key Insights */}
                <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Key Insights & Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Best Performing Category</h4>
                      <p className="text-sm text-slate-600">
                        {analyticsData.categoryData[0]?.name} leads with ₱{analyticsData.categoryData[0]?.value.toFixed(2)} in revenue. 
                        Consider stocking more items in this category.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Top Revenue Generator</h4>
                      <p className="text-sm text-slate-600">
                        {analyticsData.topItems[0]?.name} is your top seller with ₱{analyticsData.topItems[0]?.revenue.toFixed(2)}. 
                        Ensure this item is always in stock.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Payment Preference</h4>
                      <p className="text-sm text-slate-600">
                        {analyticsData.paymentMethodData[0].value > analyticsData.paymentMethodData[1].value ? 
                          `Customers prefer ${analyticsData.paymentMethodData[0].name} (${((analyticsData.paymentMethodData[0].value / (analyticsData.paymentMethodData[0].value + analyticsData.paymentMethodData[1].value)) * 100).toFixed(0)}%)` :
                          `Customers prefer ${analyticsData.paymentMethodData[1].name} (${((analyticsData.paymentMethodData[1].value / (analyticsData.paymentMethodData[0].value + analyticsData.paymentMethodData[1].value)) * 100).toFixed(0)}%)`
                        }. Optimize for this payment method.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Growth Trend</h4>
                      <p className="text-sm text-slate-600">
                        {analyticsData.summary.weekOverWeekGrowth >= 0 ? 
                          `Sales are growing by ${analyticsData.summary.weekOverWeekGrowth.toFixed(1)}%! Keep up the great work.` :
                          `Sales declined by ${Math.abs(analyticsData.summary.weekOverWeekGrowth).toFixed(1)}%. Consider promotional strategies.`
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-10 w-10 animate-spin text-slate-400 mb-4" />
            <p className="text-base font-medium text-slate-500">Loading sales reports...</p>
          </div>
        )}

        {/* Daily Sales Section Header */}
        {!isLoadingData && dailySales.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              Daily Sales Details
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Detailed breakdown of sales, expenses, and transactions by date
            </p>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent mt-4" />
          </div>
        )}

        {/* Daily Sales List */}
        {!isLoadingData && dailySales.length === 0 && (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Sales Data</h3>
            <p className="text-sm text-slate-600">
              No daily sales reports available yet. Sales will appear here once orders are completed.
            </p>
          </Card>
        )}

        {!isLoadingData && dailySales.length > 0 && (
          <div className="space-y-4">
            {dailySales.map((daily, index) => {
              const expanded = isExpanded(daily.date)
              const isLatest = index === 0 // First item is latest

              // Owner breakdown calculations (ensure accurate split between John and Elwin)
              const johnSales = daily.salesByOwner?.john || 0
              const elwinSales = daily.salesByOwner?.elwin || 0

              const splitWithdrawals = daily.withdrawalsByOwner?.all || 0
              const splitPurchases = daily.purchasesByOwner?.all || 0

              const johnWithdrawals =
                (daily.withdrawalsByOwner?.john || 0) + splitWithdrawals / 2
              const elwinWithdrawals =
                (daily.withdrawalsByOwner?.elwin || 0) + splitWithdrawals / 2

              const johnPurchases =
                (daily.purchasesByOwner?.john || 0) + splitPurchases / 2
              const elwinPurchases =
                (daily.purchasesByOwner?.elwin || 0) + splitPurchases / 2

              // Calculate total drinks served (cold-coffee + cold-drink-no-coffee)
              const coldCoffeeItems = daily.itemsByCategory["cold-coffee"] || []
              const coldDrinkNoCoffeeItems = daily.itemsByCategory["cold-drink-no-coffee"] || []
              const drinksServed = [...coldCoffeeItems, ...coldDrinkNoCoffeeItems]
                .reduce((sum, item) => sum + item.quantity, 0)

              return (
              <Card key={daily.date} className="bg-white border border-slate-200/80 shadow-sm">
                {/* Date Header - Clickable for toggle */}
                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 cursor-pointer hover:bg-slate-50 transition-colors ${expanded || isLatest ? 'border-b border-slate-200' : ''}`}
                  onClick={() => !isLatest && toggleDate(daily.date)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 flex-shrink-0" />
                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">{formatDate(daily.date)}</h2>
                    {isLatest && (
                      <Badge className="bg-blue-600 text-white font-bold text-xs px-2 py-1 rounded-md flex-shrink-0">
                        Latest
                      </Badge>
                    )}
                    {daily.isValidated && (
                      <Badge className="bg-emerald-600 text-white font-bold text-xs px-2 py-1 rounded-md flex items-center gap-1 flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        Validated
                      </Badge>
                    )}
                    {drinksServed > 0 && (
                      <Badge className="bg-cyan-600 text-white font-bold text-xs px-2 py-1 rounded-md flex items-center gap-1 flex-shrink-0">
                        <GlassWater className="h-3 w-3" />
                        {drinksServed} drinks
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      {/* Gross Sales */}
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5 sm:mb-1 whitespace-nowrap">
                          Gross Sales
                        </div>
                        <div className="text-sm sm:text-lg font-bold text-slate-700 whitespace-nowrap">
                          ₱{daily.totalSales.toFixed(2)}
                        </div>
                      </div>
                      {/* Separator */}
                      <div className="hidden sm:block h-12 w-[1px] bg-slate-300" />
                      {/* Net Sales */}
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5 sm:mb-1 whitespace-nowrap">
                          Net Sales
                        </div>
                        <div className={`text-base sm:text-2xl font-bold ${daily.netSales >= 0 ? 'text-emerald-600' : 'text-red-600'} whitespace-nowrap`}>
                          ₱{daily.netSales.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
                      {isSuperAdmin && !daily.isValidated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleValidateReport(daily.date)
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Validate
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditReport(daily.date)
                            }}
                            className="gap-1.5 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteReport(daily.date)
                            }}
                            className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </>
                      )}
                      {!isLatest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDate(daily.date)
                          }}
                          className="ml-4"
                        >
                          {expanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {(expanded || isLatest) && (
                  <div className="px-6 pb-6">

                {/* Items by Category */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Items Sold (by Category)</h3>
                  {Object.keys(daily.itemsByCategory).length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No items sold on this day.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(daily.itemsByCategory).map(([category, items]) => (
                        <div key={category} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                          <h4 className="font-bold text-slate-900 mb-3 capitalize">{category}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Item
                                  </th>
                                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Price
                                  </th>
                                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Quantity
                                  </th>
                                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => (
                                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                                    <td className="py-2 px-3 text-sm font-medium text-slate-900">
                                      {item.name}
                                    </td>
                                    <td className="py-2 px-3 text-sm text-slate-600 text-right">
                                      ₱{item.price.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-sm text-slate-600 text-right font-semibold">
                                      {item.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-sm font-bold text-slate-900 text-right">
                                      ₱{item.total.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Withdrawals and Purchases */}
                {(daily.withdrawals.length > 0 || daily.purchases.length > 0) && (
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Withdrawals & Purchases</h3>
                    <div className="space-y-3">
                      {daily.withdrawals.map((withdrawal, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-red-600 text-white font-bold text-xs">💰 Withdrawal</Badge>
                              <span className="text-sm font-bold text-red-700">-₱{withdrawal.amount.toFixed(2)}</span>
                              <Badge className={`text-xs font-bold ${
                                withdrawal.paymentMethod === 'gcash' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                              }`}>
                                {withdrawal.paymentMethod === 'gcash' ? 'Ⓖ GCash' : '💵 Cash'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{withdrawal.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {withdrawal.chargedTo && (
                                <Badge className={`text-xs font-bold ${
                                  withdrawal.chargedTo === 'john' ? 'bg-purple-600 text-white' :
                                  withdrawal.chargedTo === 'elwin' ? 'bg-indigo-600 text-white' :
                                  'bg-slate-600 text-white'
                                }`}>
                                  {withdrawal.chargedTo === 'john' ? '👤 John' :
                                   withdrawal.chargedTo === 'elwin' ? '👤 Elwin' :
                                   '↔️ Split (Both)'}
                                </Badge>
                              )}
                              {withdrawal.createdBy && (
                                <p className="text-xs text-slate-500">
                                  by {withdrawal.createdBy.name || withdrawal.createdBy.email || "Unknown"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {daily.purchases.map((purchase, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-orange-500 text-white font-bold text-xs">🛒 Purchase</Badge>
                              <span className="text-sm font-bold text-orange-700">-₱{purchase.amount.toFixed(2)}</span>
                              <Badge className={`text-xs font-bold ${
                                purchase.paymentMethod === 'gcash' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                              }`}>
                                {purchase.paymentMethod === 'gcash' ? 'Ⓖ GCash' : '💵 Cash'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{purchase.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {purchase.chargedTo && (
                                <Badge className={`text-xs font-bold ${
                                  purchase.chargedTo === 'john' ? 'bg-purple-600 text-white' :
                                  purchase.chargedTo === 'elwin' ? 'bg-indigo-600 text-white' :
                                  'bg-slate-600 text-white'
                                }`}>
                                  {purchase.chargedTo === 'john' ? '👤 John' :
                                   purchase.chargedTo === 'elwin' ? '👤 Elwin' :
                                   '↔️ Split (Both)'}
                                </Badge>
                              )}
                              {purchase.createdBy && (
                                <p className="text-xs text-slate-500">
                                  by {purchase.createdBy.name || purchase.createdBy.email || "Unknown"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Section - Super Admin Only */}

                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-1">
                          Validation Status
                        </h4>
                        {daily.isValidated ? (
                          <p className="text-xs text-slate-600">
                            Validated by {daily.validatedBy?.name || daily.validatedBy?.email || "Admin"}
                            {daily.validatedAt && (
                              <span className="ml-2">
                                on {new Date(daily.validatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            This report has not been validated yet
                          </p>
                        )}
                      </div>
                      {!daily.isValidated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateReport(daily.date)}
                          className="gap-2 text-xs"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Validated
                        </Button>
                      )}
                    </div>
                  </div>


                {/* Summary Footer */}
                <div className="mt-6 pt-4 border-t-2 border-slate-300">
                  {/* Overall Summary */}
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Overall Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">
                          Total Sales
                        </div>
                        <div className="text-lg font-bold text-slate-900">₱{daily.totalSales.toFixed(2)}</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="text-xs text-orange-600 mb-1 uppercase tracking-wide font-semibold">
                          Total Purchases
                        </div>
                        <div className="text-lg font-bold text-orange-600">-₱{daily.totalPurchases.toFixed(2)}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-red-600 mb-1 uppercase tracking-wide font-semibold">
                          Total Withdrawals
                        </div>
                        <div className="text-lg font-bold text-red-600">-₱{daily.totalWithdrawals.toFixed(2)}</div>
                      </div>
                      <div className={`rounded-lg p-3 border-2 ${
                        daily.netSales >= 0
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-red-50 border-red-300"
                      }`}>
                        <div className={`text-xs mb-1 uppercase tracking-wide font-semibold ${
                          daily.netSales >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                          Net Balance
                        </div>
                        <div className={`text-xl font-bold ${
                          daily.netSales >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                          ₱{daily.netSales.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Owner Breakdown */}
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Owner Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      {/* John */}
                      <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-300">
                        <div className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
                          <span>👤</span> John
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-purple-700 font-semibold">Sales:</span>
                            <span className="text-purple-900 font-bold">₱{johnSales.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600 font-semibold">Withdrawals:</span>
                            <span className="text-red-700 font-bold">-₱{johnWithdrawals.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-600 font-semibold">Purchases:</span>
                            <span className="text-orange-700 font-bold">-₱{johnPurchases.toFixed(2)}</span>
                          </div>
                          <div className="pt-2 border-t border-purple-200">
                            <div className="flex justify-between">
                              <span className="text-purple-800 font-bold">Net Total:</span>
                              <span className={`text-lg font-bold ${
                                (daily.netTotalsByOwner?.john || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}>
                                ₱{(daily.netTotalsByOwner?.john || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Elwin */}
                      <div className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-300">
                        <div className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                          <span>👤</span> Elwin
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-indigo-700 font-semibold">Sales:</span>
                            <span className="text-indigo-900 font-bold">₱{elwinSales.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600 font-semibold">Withdrawals:</span>
                            <span className="text-red-700 font-bold">-₱{elwinWithdrawals.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-600 font-semibold">Purchases:</span>
                            <span className="text-orange-700 font-bold">-₱{elwinPurchases.toFixed(2)}</span>
                          </div>
                          <div className="pt-2 border-t border-indigo-200">
                            <div className="flex justify-between">
                              <span className="text-indigo-800 font-bold">Net Total:</span>
                              <span className={`text-lg font-bold ${
                                (daily.netTotalsByOwner?.elwin || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}>
                                ₱{(daily.netTotalsByOwner?.elwin || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* All (Split Items) */}
                      {(daily.withdrawalsByOwner?.all > 0 || daily.purchasesByOwner?.all > 0) && (
                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                          <div className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span>↔️</span> All (Split)
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600 font-semibold">Withdrawals:</span>
                              <span className="text-red-700 font-bold">-₱{daily.withdrawalsByOwner?.all?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-orange-600 font-semibold">Purchases:</span>
                              <span className="text-orange-700 font-bold">-₱{daily.purchasesByOwner?.all?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-xs text-slate-600">
                                Split equally between John and Elwin
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="mb-4">
                    <h4 className="text-md font-bold text-slate-900 mb-3 border-b pb-2">Payment Method Breakdown</h4>

                    {/* Cash Breakdown */}
                    <div className="mb-4">
                      <h5 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <span>💵</span> Cash
                      </h5>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-semibold">Gross Cash (from sales):</span>
                          <span className="text-slate-900 font-bold">₱{daily.grossCash?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600 font-semibold">Cash Withdrawals:</span>
                          <span className="text-red-700 font-bold">-₱{daily.totalCashWithdrawals?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-orange-600 font-semibold">Cash Purchases:</span>
                          <span className="text-orange-700 font-bold">-₱{daily.totalCashPurchases?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-300">
                          <div className="flex justify-between">
                            <span className="text-emerald-700 font-bold">Net Cash Received:</span>
                            <span className="text-lg font-bold text-emerald-700">₱{daily.totalCash.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* GCash Breakdown */}
                    <div>
                      <h5 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <span>Ⓖ</span> GCash
                      </h5>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-semibold">Gross GCash (from sales):</span>
                          <span className="text-slate-900 font-bold">₱{daily.grossGcash?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600 font-semibold">GCash Withdrawals:</span>
                          <span className="text-red-700 font-bold">-₱{daily.totalGcashWithdrawals?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-orange-600 font-semibold">GCash Purchases:</span>
                          <span className="text-orange-700 font-bold">-₱{daily.totalGcashPurchases?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-300">
                          <div className="flex justify-between">
                            <span className="text-blue-700 font-bold">Net GCash Received:</span>
                            <span className="text-lg font-bold text-blue-700">₱{daily.totalGcash.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  </div>
                )}
              </Card>
            )
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoadingData && dailySales.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {pagination.totalPages > 1 ? (
                <>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total days)
                </>
              ) : (
                <>
                  {pagination.total} {pagination.total === 1 ? 'day' : 'days'} of sales data
                </>
              )}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="px-4 py-2 text-sm font-semibold text-slate-900">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingDate && (
        <EditDailySalesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          date={editingDate}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

