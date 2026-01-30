"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Banknote,
  QrCode,
  User,
  ShoppingBag,
  Trash2
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ordersApi, type Order } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useOrderEvents } from "@/contexts/websocket-context"
import { formatOrderCode } from "@/lib/order-code-generator"
import { cn } from "@/lib/utils"

export function OnlineOrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<"all" | "cash" | "gcash">("all")
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  
  const { toast } = useToast()

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const data = await ordersApi.getOnlineOrders()
      setOrders(data)
    } catch (error) {
      console.error("Error fetching online orders:", error)
      toast({
        title: "Error",
        description: "Failed to fetch online orders",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Listen for real-time updates
  useOrderEvents({
    onOnlineOrderCreated: (order) => {
      setOrders((prev) => [order, ...prev])
    },
    onOnlineOrderConfirmed: (order) => {
      setOrders((prev) => prev.filter((o) => o._id !== order._id))
    },
    onOrderDeleted: (orderId) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId && o._id !== orderId))
    },
  })

  const handleConfirmPayment = async (orderId: string) => {
    setConfirmingOrderId(orderId)
    try {
      await ordersApi.confirmOnlinePayment(orderId)
      setOrders((prev) => prev.filter((o) => o._id !== orderId))
      toast({
        title: "Payment confirmed",
        description: "Order has been moved to the kitchen queue.",
      })
    } catch (error) {
      console.error("Error confirming payment:", error)
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      })
    } finally {
      setConfirmingOrderId(null)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId)
    try {
      await ordersApi.deleteOnlineOrder(orderId)
      setOrders((prev) => prev.filter((o) => o._id !== orderId))
      toast({
        title: "Order deleted",
        description: "The online order has been removed.",
      })
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      })
    } finally {
      setDeletingOrderId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.onlineOrderCode?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesPayment = 
      filterPaymentMethod === "all" || 
      order.selectedPaymentMethod === filterPaymentMethod

    return matchesSearch && matchesPayment
  })

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getTimeSince = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ago`
  }

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Online Orders</h1>
            <p className="text-sm text-slate-500">
              {orders.length} pending order{orders.length !== 1 ? 's' : ''} awaiting payment confirmation
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or order code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterPaymentMethod === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPaymentMethod("all")}
            >
              All
            </Button>
            <Button
              variant={filterPaymentMethod === "gcash" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPaymentMethod("gcash")}
              className="gap-1"
            >
              <QrCode className="h-4 w-4" />
              GCash
            </Button>
            <Button
              variant={filterPaymentMethod === "cash" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPaymentMethod("cash")}
              className="gap-1"
            >
              <Banknote className="h-4 w-4" />
              Cash
            </Button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-600">No pending online orders</p>
          <p className="text-sm text-slate-500">
            {searchQuery || filterPaymentMethod !== "all" 
              ? "Try adjusting your filters" 
              : "New orders will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="p-4 hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(order.createdAt)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{getTimeSince(order.createdAt)}</span>
                  </div>
                </div>
                <Badge 
                  className={cn(
                    "font-mono text-sm",
                    order.selectedPaymentMethod === "gcash" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {order.onlineOrderCode ? formatOrderCode(order.onlineOrderCode) : "N/A"}
                </Badge>
              </div>

              {/* Payment Method */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg mb-3",
                order.selectedPaymentMethod === "gcash" ? "bg-blue-50" : "bg-emerald-50"
              )}>
                {order.selectedPaymentMethod === "gcash" ? (
                  <>
                    <QrCode className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">GCash Payment</span>
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Cash Payment</span>
                  </>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-1 mb-3 max-h-[120px] overflow-y-auto">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.quantity}x {item.name}
                      {item.itemType === "take-out" && (
                        <Badge variant="outline" className="ml-1 text-[10px] py-0">TO</Badge>
                      )}
                    </span>
                    <span className="text-slate-900 font-medium">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-lg font-bold text-blue-600">
                  ₱{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => handleConfirmPayment(order._id!)}
                  disabled={confirmingOrderId === order._id || deletingOrderId === order._id}
                >
                  {confirmingOrderId === order._id ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      disabled={confirmingOrderId === order._id || deletingOrderId === order._id}
                    >
                      {deletingOrderId === order._id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Online Order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the order from <strong>{order.customerName}</strong> with code <strong>{order.onlineOrderCode ? formatOrderCode(order.onlineOrderCode) : "N/A"}</strong>.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteOrder(order._id!)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
