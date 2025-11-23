"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, ArrowLeft, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DTRRecord {
  _id: string
  clockInTime: string
  clockOutTime: string | null
  date: string
  status: 'clocked_in' | 'clocked_out'
  workDuration: string | null
  notes: string
}

interface MonthlySummary {
  records: DTRRecord[]
  totalDays: number
  totalHours: string
  month: number
  year: number
}

export default function DTRHistoryPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)

  // Check if user is crew
  const isCrew = user?.role === 'crew' || user?.role === 'order_taker_crew'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && !isCrew) {
      router.push('/')
    } else if (user && isCrew) {
      fetchMonthlySummary()
    }
  }, [user, authLoading, isCrew, selectedYear, selectedMonth, router])

  const fetchMonthlySummary = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(
        `${API_BASE_URL}/dtr/summary/${user.id}/${selectedYear}/${selectedMonth}`
      )
      const data = await response.json()

      if (data.success) {
        setSummary(data.data)
      } else {
        setError(data.error || 'Failed to fetch DTR records')
      }
    } catch (err) {
      console.error('Error fetching DTR summary:', err)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    const today = new Date()
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1

    if (!isCurrentMonth) {
      if (selectedMonth === 12) {
        setSelectedMonth(1)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  const isCurrentMonth = () => {
    const today = new Date()
    return selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isCrew) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dtr">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">DTR History</h1>
            <p className="text-sm text-muted-foreground">{user.name}'s attendance records</p>
          </div>
        </div>

        {/* Month Selector */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Days Worked</CardDescription>
                <CardTitle className="text-3xl">{summary.totalDays}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Hours</CardDescription>
                <CardTitle className="text-3xl">{summary.totalHours}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Hours/Day</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.totalDays > 0
                    ? (parseFloat(summary.totalHours) / summary.totalDays).toFixed(2)
                    : '0'}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {summary?.records.length || 0} record(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && summary.records.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration (hrs)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.records.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {record.date}
                        </TableCell>
                        <TableCell>{formatTime(record.clockInTime)}</TableCell>
                        <TableCell>
                          {record.clockOutTime ? formatTime(record.clockOutTime) : (
                            <span className="text-yellow-600 font-medium">Still clocked in</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.workDuration || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'clocked_out'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status === 'clocked_out' ? 'Completed' : 'In Progress'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No records found for this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
