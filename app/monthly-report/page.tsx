"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MonthlySalesReport } from "@/components/monthly-sales-report"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function MonthlyReportPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  // Check if user has access (super_admin only)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  if (user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to view monthly reports.</p>
          <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
        </Card>
      </div>
    )
  }

  const goToPreviousMonth = () => {
    setSelectedDate((prev) => {
      const newMonth = prev.month - 1
      if (newMonth < 0) {
        return { month: 11, year: prev.year - 1 }
      }
      return { month: newMonth, year: prev.year }
    })
  }

  const goToNextMonth = () => {
    setSelectedDate((prev) => {
      const newMonth = prev.month + 1
      if (newMonth > 11) {
        return { month: 0, year: prev.year + 1 }
      }
      return { month: newMonth, year: prev.year }
    })
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    setSelectedDate({ month: now.getMonth(), year: now.getFullYear() })
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return selectedDate.month === now.getMonth() && selectedDate.year === now.getFullYear()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => router.push("/")} size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[180px]">
                <div className="text-lg font-bold text-slate-900">
                  {new Date(selectedDate.year, selectedDate.month).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {!isCurrentMonth() && (
              <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
                Current Month
              </Button>
            )}
            {isCurrentMonth() && <div className="w-[100px]" />}
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Monthly Sales Report */}
        <MonthlySalesReport month={selectedDate.month} year={selectedDate.year} />
      </div>
    </div>
  )
}
