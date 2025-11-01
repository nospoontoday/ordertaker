"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { dailySalesApi, type DailySalesSummary } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Calendar, TrendingDown, TrendingUp, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

  // Check if user can access (all roles except crew)
  const canAccess = user?.role !== "crew"
  // Check if user is super admin
  const isSuperAdmin = user?.role === "super_admin"

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
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-10 w-10 animate-spin text-slate-400 mb-4" />
            <p className="text-base font-medium text-slate-500">Loading sales reports...</p>
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
              
              return (
              <Card key={daily.date} className="bg-white border border-slate-200/80 shadow-sm">
                {/* Date Header - Clickable for toggle */}
                <div 
                  className={`flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors ${expanded || isLatest ? 'border-b border-slate-200' : ''}`}
                  onClick={() => !isLatest && toggleDate(daily.date)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <h2 className="text-xl font-bold text-slate-900">{formatDate(daily.date)}</h2>
                    {isLatest && (
                      <Badge className="bg-blue-600 text-white font-bold text-xs px-2 py-1 rounded-md">
                        Latest
                      </Badge>
                    )}
                    {daily.isValidated && (
                      <Badge className="bg-emerald-600 text-white font-bold text-xs px-2 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Validated
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                        Net Sales
                      </div>
                      <div className={`text-2xl font-bold ${daily.netSales >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₱{daily.netSales.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                            <span className="text-purple-900 font-bold">₱{daily.salesByOwner?.john?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600 font-semibold">Withdrawals:</span>
                            <span className="text-red-700 font-bold">-₱{daily.withdrawalsByOwner?.john?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-600 font-semibold">Purchases:</span>
                            <span className="text-orange-700 font-bold">-₱{daily.purchasesByOwner?.john?.toFixed(2) || "0.00"}</span>
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
                            <span className="text-indigo-900 font-bold">₱{daily.salesByOwner?.elwin?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600 font-semibold">Withdrawals:</span>
                            <span className="text-red-700 font-bold">-₱{daily.withdrawalsByOwner?.elwin?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-600 font-semibold">Purchases:</span>
                            <span className="text-orange-700 font-bold">-₱{daily.purchasesByOwner?.elwin?.toFixed(2) || "0.00"}</span>
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
                    <h4 className="text-md font-bold text-slate-900 mb-3">Payment Methods</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <div className="text-xs text-emerald-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                          <span>💵</span> Cash Received
                        </div>
                        <div className="text-lg font-bold text-emerald-700">₱{daily.totalCash.toFixed(2)}</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-xs text-blue-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                          <span>Ⓖ</span> GCash Received
                        </div>
                        <div className="text-lg font-bold text-blue-700">₱{daily.totalGcash.toFixed(2)}</div>
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
    </div>
  )
}

