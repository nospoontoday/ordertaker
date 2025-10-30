"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, CalendarIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WithdrawalDialog({ open, onOpenChange, onSuccess }: WithdrawalDialogProps) {
  const { user } = useAuth()
  const [type, setType] = useState<"withdrawal" | "purchase">("withdrawal")
  const [amount, setAmount] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [chargedTo, setChargedTo] = useState<"john" | "elwin" | "all">("john")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setType("withdrawal")
      setAmount("")
      setDescription("")
      setPaymentMethod(null)
      setSelectedDate(new Date()) // Reset to today when dialog opens
      setChargedTo("john") // Default to john
    }
  }, [open])

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return
    }

    if (!description.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate timestamp for selected date at a specific time (default to 10 AM of that day)
      const selectedDateTime = new Date(selectedDate)
      selectedDateTime.setHours(10, 0, 0, 0) // Set to 10 AM of the selected date
      const createdAtTimestamp = selectedDateTime.getTime()

      const withdrawalData = {
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        createdAt: createdAtTimestamp, // Use selected date timestamp
        createdBy: {
          userId: user?.id,
          name: user?.name,
          email: user?.email,
        },
        paymentMethod: paymentMethod || null,
        chargedTo: chargedTo, // Who this withdrawal/purchase is charged to
      }

      // Import and use the API
      const { withdrawalsApi } = await import("@/lib/api")
      await withdrawalsApi.create(withdrawalData)

      // Success - reset and close
      setAmount("")
      setDescription("")
      setPaymentMethod(null)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating withdrawal:", error)
      // Error handling can be added here with toast notification
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = () => {
    return (
      amount &&
      parseFloat(amount) > 0 &&
      description.trim().length > 0
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Record Withdrawal / Purchase</DialogTitle>
          <DialogDescription>
            Record operational expenses like water, gas, miscellaneous fees, or cash withdrawals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setType("withdrawal")}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all border-2 shadow-sm ${
                  type === "withdrawal"
                    ? "bg-red-50 border-red-600 text-red-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                💰 Withdrawal
              </button>
              <button
                onClick={() => setType("purchase")}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all border-2 shadow-sm ${
                  type === "purchase"
                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                🛒 Purchase
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Amount (₱)</label>
            <Input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="text-2xl font-bold text-center"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Water refill, Gas for generator, Miscellaneous fees..."
              className="min-h-[80px]"
              maxLength={500}
            />
            <div className="text-xs text-slate-500 text-right">
              {description.length}/500
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Date for This {type === "withdrawal" ? "Withdrawal" : "Purchase"}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-slate-500">
              Select the date when this {type === "withdrawal" ? "withdrawal" : "purchase"} occurred. Defaults to today.
            </p>
          </div>

          {/* Charged To */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Charged To</label>
            <div className="flex gap-3">
              <button
                onClick={() => setChargedTo("john")}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                  chargedTo === "john"
                    ? "bg-purple-50 border-purple-600 text-purple-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                👤 John
              </button>
              <button
                onClick={() => setChargedTo("elwin")}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                  chargedTo === "elwin"
                    ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                👤 Elwin
              </button>
              <button
                onClick={() => setChargedTo("all")}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                  chargedTo === "all"
                    ? "bg-slate-50 border-slate-600 text-slate-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                ↔️ Split (Both)
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select who this {type === "withdrawal" ? "withdrawal" : "purchase"} is charged to. "Split" divides the amount equally between John and Elwin.
            </p>
          </div>

          {/* Payment Method (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Payment Method (Optional)</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod(paymentMethod === "cash" ? null : "cash")}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                  paymentMethod === "cash"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentMethod(paymentMethod === "gcash" ? null : "gcash")}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                  paymentMethod === "gcash"
                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-md"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                Ⓖ GCash
              </button>
            </div>
          </div>

          {/* Summary */}
          {isValid() && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600">
                  {type === "withdrawal" ? "Withdrawal" : "Purchase"} Amount:
                </span>
                <span className="text-xl font-bold text-slate-900">
                  ₱{parseFloat(amount || "0").toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={
                    chargedTo === "john" ? "bg-purple-600 text-white" :
                    chargedTo === "elwin" ? "bg-indigo-600 text-white" :
                    "bg-slate-600 text-white"
                  }
                >
                  {chargedTo === "john" ? "👤 John" :
                   chargedTo === "elwin" ? "👤 Elwin" :
                   "↔️ Split (Both)"}
                </Badge>
                {chargedTo === "all" && (
                  <span className="text-xs text-slate-600">
                    (₱{(parseFloat(amount || "0") / 2).toFixed(2)} each)
                  </span>
                )}
              </div>
              {paymentMethod && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={paymentMethod === "cash" ? "border-emerald-600 text-emerald-700" : "border-blue-600 text-blue-700"}
                  >
                    {paymentMethod === "cash" ? "💵 Cash" : "Ⓖ GCash"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid() || isSubmitting}
              className={`flex-1 bg-gradient-to-r ${
                type === "withdrawal"
                  ? "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  : "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              } text-white font-bold shadow-sm hover:shadow-md transition-all`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                `Record ${type === "withdrawal" ? "Withdrawal" : "Purchase"}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

