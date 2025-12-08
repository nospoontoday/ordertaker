"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeft, Loader2, CalendarIcon, Filter, Search, Wallet, ShoppingCart, X } from "lucide-react"
import { withdrawalsApi, Withdrawal } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns"

type FilterType = "all" | "withdrawal" | "purchase"
type FilterChargedTo = "all" | "john" | "elwin"
type DatePreset = "today" | "yesterday" | "last7days" | "thisMonth" | "custom"

export default function WithdrawalsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterChargedTo, setFilterChargedTo] = useState<FilterChargedTo>("all")
  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth")
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchWithdrawals()
  }, [startDate, endDate])

  const fetchWithdrawals = async () => {
    setIsLoading(true)
    try {
      const filters: {
        startDate?: number
        endDate?: number
        sortBy?: string
        sortOrder?: "asc" | "desc"
      } = {
        sortBy: "createdAt",
        sortOrder: "desc",
      }

      if (startDate) {
        filters.startDate = startOfDay(startDate).getTime()
      }
      if (endDate) {
        filters.endDate = endOfDay(endDate).getTime()
      }

      const data = await withdrawalsApi.getAll(filters)
      setWithdrawals(data)
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      toast({
        title: "Error",
        description: "Failed to load withdrawals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDatePreset = (preset: DatePreset) => {
    setDatePreset(preset)
    const today = new Date()

    switch (preset) {
      case "today":
        setStartDate(startOfDay(today))
        setEndDate(endOfDay(today))
        break
      case "yesterday":
        const yesterday = subDays(today, 1)
        setStartDate(startOfDay(yesterday))
        setEndDate(endOfDay(yesterday))
        break
      case "last7days":
        setStartDate(startOfDay(subDays(today, 6)))
        setEndDate(endOfDay(today))
        break
      case "thisMonth":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      case "custom":
        break
    }
  }

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    // Type filter
    if (filterType !== "all" && w.type !== filterType) return false

    // Charged to filter
    if (filterChargedTo !== "all") {
      if (filterChargedTo === "john" && w.chargedTo !== "john" && w.chargedTo !== "all") return false
      if (filterChargedTo === "elwin" && w.chargedTo !== "elwin" && w.chargedTo !== "all") return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        w.description.toLowerCase().includes(query) ||
        w.createdBy?.name?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Calculate totals
  const totals = filteredWithdrawals.reduce(
    (acc, w) => {
      if (w.type === "withdrawal") {
        acc.withdrawals += w.amount
      } else {
        acc.purchases += w.amount
      }
      acc.total += w.amount

      // Calculate by charged to
      if (w.chargedTo === "john") {
        acc.johnTotal += w.amount
      } else if (w.chargedTo === "elwin") {
        acc.elwinTotal += w.amount
      } else if (w.chargedTo === "all") {
        acc.johnTotal += w.amount / 2
        acc.elwinTotal += w.amount / 2
      }

      return acc
    },
    { withdrawals: 0, purchases: 0, total: 0, johnTotal: 0, elwinTotal: 0 }
  )

  const clearFilters = () => {
    setFilterType("all")
    setFilterChargedTo("all")
    setSearchQuery("")
  }

  const hasActiveFilters = filterType !== "all" || filterChargedTo !== "all" || searchQuery !== ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Withdrawals & Purchases</h1>
              <p className="text-sm text-slate-500">Track all operational expenses</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-slate-100" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 space-y-4 border-slate-200">
            {/* Date Presets */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Date Range</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last7days", label: "Last 7 Days" },
                  { value: "thisMonth", label: "This Month" },
                  { value: "custom", label: "Custom" },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={datePreset === preset.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDatePreset(preset.value as DatePreset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {datePreset === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Type</label>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "withdrawal", label: "Withdrawals" },
                  { value: "purchase", label: "Purchases" },
                ].map((type) => (
                  <Button
                    key={type.value}
                    variant={filterType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type.value as FilterType)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Charged To Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Charged To</label>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "john", label: "John" },
                  { value: "elwin", label: "Elwin" },
                ].map((charged) => (
                  <Button
                    key={charged.value}
                    variant={filterChargedTo === charged.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterChargedTo(charged.value as FilterChargedTo)}
                  >
                    {charged.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by description or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700">Withdrawals</span>
            </div>
            <p className="text-lg font-bold text-red-900">
              {totals.withdrawals.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">Purchases</span>
            </div>
            <p className="text-lg font-bold text-blue-900">
              {totals.purchases.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-purple-700">John's Share</span>
            </div>
            <p className="text-lg font-bold text-purple-900">
              {totals.johnTotal.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-indigo-700">Elwin's Share</span>
            </div>
            <p className="text-lg font-bold text-indigo-900">
              {totals.elwinTotal.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
            </p>
          </Card>
        </div>

        {/* Total Card */}
        <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-300">Total Expenses</span>
              <p className="text-2xl font-bold text-white">
                {totals.total.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-300">Records</span>
              <p className="text-2xl font-bold text-white">{filteredWithdrawals.length}</p>
            </div>
          </div>
        </Card>

        {/* Withdrawals List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No withdrawals or purchases found</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWithdrawals.map((withdrawal) => (
              <Card
                key={withdrawal._id}
                className={`p-4 border-l-4 ${
                  withdrawal.type === "withdrawal"
                    ? "border-l-red-500"
                    : "border-l-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={
                          withdrawal.type === "withdrawal"
                            ? "border-red-500 text-red-700 bg-red-50"
                            : "border-blue-500 text-blue-700 bg-blue-50"
                        }
                      >
                        {withdrawal.type === "withdrawal" ? "Withdrawal" : "Purchase"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          withdrawal.chargedTo === "john"
                            ? "border-purple-500 text-purple-700 bg-purple-50"
                            : withdrawal.chargedTo === "elwin"
                            ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                            : "border-slate-500 text-slate-700 bg-slate-50"
                        }
                      >
                        {withdrawal.chargedTo === "john"
                          ? "John"
                          : withdrawal.chargedTo === "elwin"
                          ? "Elwin"
                          : "Split"}
                      </Badge>
                      {withdrawal.paymentMethod && (
                        <Badge variant="secondary" className="text-xs">
                          {withdrawal.paymentMethod === "cash" ? "Cash" : "GCash"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 font-medium line-clamp-2">
                      {withdrawal.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span>{format(new Date(withdrawal.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      {withdrawal.createdBy?.name && (
                        <>
                          <span>•</span>
                          <span>by {withdrawal.createdBy.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-lg font-bold ${
                        withdrawal.type === "withdrawal" ? "text-red-600" : "text-blue-600"
                      }`}
                    >
                      {withdrawal.amount.toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </p>
                    {withdrawal.chargedTo === "all" && (
                      <p className="text-xs text-slate-500">
                        {(withdrawal.amount / 2).toLocaleString("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        })}{" "}
                        each
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
