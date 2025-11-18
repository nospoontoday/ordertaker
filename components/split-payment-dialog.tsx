"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface SplitPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalAmount: number
  onConfirm: (cashAmount: number, gcashAmount: number, amountReceived: number) => void
  orderNumber?: number
  customerName?: string
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
  orderNumber,
  customerName,
}: SplitPaymentDialogProps) {
  const [cashAmount, setCashAmount] = useState<string>("")
  const [gcashAmount, setGcashAmount] = useState<number>(totalAmount)
  const [amountReceived, setAmountReceived] = useState<number>(totalAmount)

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500, 1000]

  // Update GCash amount when cash amount changes
  useEffect(() => {
    const cash = parseFloat(cashAmount) || 0
    const remaining = totalAmount - cash
    setGcashAmount(remaining >= 0 ? remaining : 0)
  }, [cashAmount, totalAmount])

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCashAmount("")
      setGcashAmount(totalAmount)
      setAmountReceived(totalAmount)
    }
  }, [open, totalAmount])

  const handleQuickAmount = (amount: number) => {
    setCashAmount(amount.toString())
  }

  const handleCashInputChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value) || 0
      if (numValue <= totalAmount) {
        setCashAmount(value)
      }
    }
  }

  const handleConfirm = () => {
    const cash = parseFloat(cashAmount) || 0
    const gcash = gcashAmount

    if (cash + gcash !== totalAmount) {
      return // Invalid split
    }

    if (cash < 0 || gcash < 0) {
      return // Negative amounts not allowed
    }

    if (amountReceived < totalAmount) {
      return // Amount received must be >= total
    }

    onConfirm(cash, gcash, amountReceived)
    onOpenChange(false)
  }

  const isValid = () => {
    const cash = parseFloat(cashAmount) || 0
    return cash > 0 && cash < totalAmount && gcashAmount > 0 && amountReceived >= totalAmount
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Split Payment</DialogTitle>
          <DialogDescription>
            {orderNumber && customerName && (
              <span className="text-sm text-slate-600">
                Order #{orderNumber} - {customerName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total Amount */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
            <span className="text-sm font-semibold text-slate-600">Total Amount</span>
            <span className="text-2xl font-bold text-slate-900">₱{totalAmount.toFixed(2)}</span>
          </div>

          {/* Amount Received Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">💰 Amount Received</label>
              <Badge className="bg-purple-600 text-white">Required</Badge>
            </div>

            <Input
              type="number"
              step="0.01"
              min={totalAmount}
              placeholder="0.00"
              value={amountReceived}
              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              className="text-2xl font-bold text-center h-14 border-2 border-purple-200 focus:border-purple-500"
            />
          </div>

          {/* Cash Amount Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">💵 Cash Amount</label>
              <Badge className="bg-emerald-600 text-white">Required</Badge>
            </div>

            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={cashAmount}
              onChange={(e) => handleCashInputChange(e.target.value)}
              className="text-2xl font-bold text-center h-14 border-2 border-emerald-200 focus:border-emerald-500"
            />

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-semibold text-xs sm:text-sm"
                  disabled={amount > totalAmount}
                >
                  ₱{amount}
                </Button>
              ))}
            </div>
          </div>

          {/* GCash Amount (Auto-calculated) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Ⓖ GCash Amount</label>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Auto-calculated
              </Badge>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-3xl font-bold text-center text-blue-700">
                ₱{gcashAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Summary */}
          {isValid() && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border-2 border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Payment breakdown:</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">💰 Amount Received</span>
                  <span className="font-bold text-purple-700">₱{amountReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">💵 Cash</span>
                  <span className="font-bold text-emerald-700">₱{parseFloat(cashAmount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ⓖ GCash</span>
                  <span className="font-bold text-blue-700">₱{gcashAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-300 flex justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900">₱{totalAmount.toFixed(2)}</span>
                </div>
                {amountReceived >= parseFloat(cashAmount || "0") && parseFloat(cashAmount || "0") > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-300 flex justify-between">
                    <span className="font-semibold text-orange-600">Change</span>
                    <span className="font-bold text-orange-600">₱{(amountReceived - parseFloat(cashAmount || "0")).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid()}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold"
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
