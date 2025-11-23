"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, LogIn, LogOut, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DTRStatus {
  isClockedIn: boolean
  activeDTR: {
    _id: string
    clockInTime: string
    date: string
  } | null
}

export default function DTRPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [dtrStatus, setDtrStatus] = useState<DTRStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is crew
  const isCrew = user?.role === 'crew' || user?.role === 'order_taker_crew'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && !isCrew) {
      router.push('/')
    } else if (user && isCrew) {
      fetchDTRStatus()
    }
  }, [user, authLoading, isCrew, router])

  const fetchDTRStatus = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/dtr/status/${user.id}`)
      const data = await response.json()

      if (data.success) {
        setDtrStatus(data.data)
      } else {
        setError(data.error || 'Failed to fetch DTR status')
      }
    } catch (err) {
      console.error('Error fetching DTR status:', err)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockIn = async () => {
    if (!user) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/dtr/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Clocked in successfully!')
        await fetchDTRStatus()
      } else {
        setError(data.error || 'Failed to clock in')
      }
    } catch (err) {
      console.error('Error clocking in:', err)
      setError('Failed to connect to server')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClockOut = async () => {
    if (!user) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/dtr/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Clocked out successfully! Work duration: ${data.data.workDuration} hours`)
        await fetchDTRStatus()
      } else {
        setError(data.error || 'Failed to clock out')
      }
    } catch (err) {
      console.error('Error clocking out:', err)
      setError('Failed to connect to server')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
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

  if (!user || !isCrew) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Daily Time Record</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user.name}!</p>
            </div>
          </div>
          <Link href="/dtr/history">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Clock In/Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Clock Status
            </CardTitle>
            <CardDescription>
              Current status: <span className="font-semibold">
                {dtrStatus?.isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {dtrStatus?.isClockedIn && dtrStatus.activeDTR && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">Currently Clocked In</p>
                <p className="text-sm text-muted-foreground">
                  Clock in time: <span className="font-medium text-foreground">
                    {formatTime(dtrStatus.activeDTR.clockInTime)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {dtrStatus.activeDTR.date}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {dtrStatus?.isClockedIn ? (
                <Button
                  onClick={handleClockOut}
                  disabled={isSubmitting}
                  className="flex-1"
                  variant="destructive"
                  size="lg"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Clocking Out...' : 'Clock Out'}
                </Button>
              ) : (
                <Button
                  onClick={handleClockIn}
                  disabled={isSubmitting}
                  className="flex-1"
                  size="lg"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Clocking In...' : 'Clock In'}
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p>Current time: {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Today's Date:</span>
              <span className="font-medium">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${dtrStatus?.isClockedIn ? 'text-green-600' : 'text-gray-600'}`}>
                {dtrStatus?.isClockedIn ? 'On Duty' : 'Off Duty'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
