"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, ArrowLeft, Calendar, Users, Download } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DTRRecord {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    role: string
  }
  clockInTime: string
  clockOutTime: string | null
  date: string
  status: 'clocked_in' | 'clocked_out'
  workDuration: string | null
  notes: string
}

interface UserStat {
  user: {
    _id: string
    name: string
    email: string
    role: string
  }
  totalDays: number
  totalHours: string
}

interface DTRData {
  records: DTRRecord[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  userStats: UserStat[]
}

export default function DTRAdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [dtrData, setDtrData] = useState<DTRData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('all')

  // Check if user is admin
  const isAdmin = user?.role === 'super_admin'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && !isAdmin) {
      router.push('/')
    } else if (user && isAdmin) {
      // Set default date range (current month)
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(firstDay.toISOString().split('T')[0])
      setEndDate(lastDay.toISOString().split('T')[0])
    }
  }, [user, authLoading, isAdmin, router])

  useEffect(() => {
    if (user && isAdmin && startDate && endDate) {
      fetchDTRRecords()
    }
  }, [user, isAdmin, startDate, endDate])

  const fetchDTRRecords = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        startDate,
        endDate,
        limit: '1000'
      })

      const response = await fetch(`${API_BASE_URL}/dtr/all?${params}`)
      const data = await response.json()

      if (data.success) {
        setDtrData(data.data)
      } else {
        setError(data.error || 'Failed to fetch DTR records')
      }
    } catch (err) {
      console.error('Error fetching DTR records:', err)
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

  const filteredRecords = dtrData?.records.filter(record => {
    if (selectedUser === 'all') return true
    return record.userId._id === selectedUser
  }) || []

  const exportToCSV = () => {
    if (!filteredRecords.length) return

    const headers = ['Name', 'Email', 'Date', 'Clock In', 'Clock Out', 'Duration (hrs)', 'Status']
    const rows = filteredRecords.map(record => [
      record.userId.name,
      record.userId.email,
      record.date,
      formatTime(record.clockInTime),
      record.clockOutTime ? formatTime(record.clockOutTime) : 'Still clocked in',
      record.workDuration || '-',
      record.status === 'clocked_out' ? 'Completed' : 'In Progress'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dtr-report-${startDate}-to-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

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

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">DTR Management</h1>
              <p className="text-sm text-muted-foreground">View and manage crew attendance records</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user">Filter by User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {dtrData?.userStats.map((stat) => (
                      <SelectItem key={stat.user._id} value={stat.user._id}>
                        {stat.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={fetchDTRRecords} variant="default">
                Apply Filters
              </Button>
              <Button onClick={exportToCSV} variant="outline" disabled={!filteredRecords.length}>
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* User Stats */}
        {dtrData && dtrData.userStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Crew Summary
              </CardTitle>
              <CardDescription>
                Total attendance summary for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Days Worked</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dtrData.userStats.map((stat) => (
                      <TableRow key={stat.user._id}>
                        <TableCell className="font-medium">{stat.user.name}</TableCell>
                        <TableCell>{stat.user.email}</TableCell>
                        <TableCell>
                          <span className="capitalize">{stat.user.role.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell className="text-right">{stat.totalDays}</TableCell>
                        <TableCell className="text-right font-medium">{stat.totalHours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Records</CardTitle>
            <CardDescription>
              {filteredRecords.length} record(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration (hrs)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {record.userId.name}
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
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
                <p className="text-muted-foreground">No records found for the selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
