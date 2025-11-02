"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Minus, X, Pencil, Save, Trash2 } from "lucide-react"
import { dailySalesApi, ordersApi, withdrawalsApi, type Order, type Withdrawal } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface EditDailySalesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onSuccess?: () => void
}

export function EditDailySalesDialog({
  open,
  onOpenChange,
  date,
  onSuccess,
}: EditDailySalesDialogProps) {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editingWithdrawalId, setEditingWithdrawalId] = useState<string | null>(null)

  useEffect(() => {
    if (open && date) {
      fetchData()
    }
  }, [open, date])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await dailySalesApi.getDailySalesDetails(date)
      setOrders(data.orders)
      setWithdrawals(data.withdrawals)
    } catch (error) {
      console.error("Error fetching daily sales details:", error)
      toast({
        title: "Error",
        description: "Failed to load daily sales data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      // Only send allowed fields for update
      const allowedUpdates: Partial<Order> = {
        customerName: updates.customerName,
        items: updates.items,
        isPaid: updates.isPaid,
        appendedOrders: updates.appendedOrders,
      }

      await ordersApi.update(orderId, allowedUpdates)
      toast({
        title: "Success",
        description: "Order updated successfully.",
      })
      fetchData()
      setEditingOrderId(null)
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update order.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return
    }

    try {
      await ordersApi.delete(orderId)
      toast({
        title: "Success",
        description: "Order deleted successfully.",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error",
        description: "Failed to delete order.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (!window.confirm("Are you sure you want to delete this withdrawal/purchase?")) {
      return
    }

    try {
      await withdrawalsApi.delete(withdrawalId)
      toast({
        title: "Success",
        description: "Withdrawal/purchase deleted successfully.",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting withdrawal:", error)
      toast({
        title: "Error",
        description: "Failed to delete withdrawal/purchase.",
        variant: "destructive",
      })
    }
  }

  const updateOrderItem = (orderId: string, itemId: string, quantity: number) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          items: order.items.map(item =>
            item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
          )
        }
      }
      return order
    }))
  }

  const removeOrderItem = (orderId: string, itemId: string) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          items: order.items.filter(item => item.id !== itemId)
        }
      }
      return order
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Daily Sales - {formatDate(date)}
          </DialogTitle>
          <DialogDescription>
            Edit orders and withdrawals for this day. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals/Purchases ({withdrawals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4 mt-4">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders for this date
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{order.customerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.orderNumber} • {order.orderType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={order.isPaid ? "default" : "secondary"}>
                            {order.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Items:</Label>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded border"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">₱{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeOrderItem(order.id, item.id)}
                                className="h-7 w-7 p-0 text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderItem(order.id, item.id, item.quantity - 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderItem(order.id, item.id, item.quantity + 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="text-sm font-bold ml-4">
                              ₱{(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {editingOrderId === order.id ? (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrder(order.id, order)}
                          className="w-full"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingOrderId(order.id)}
                          className="w-full"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Order
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-4 mt-4">
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No withdrawals or purchases for this date
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal._id}
                      className={`border rounded-lg p-4 ${
                        withdrawal.type === "withdrawal" ? "bg-red-50" : "bg-orange-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className={`${
                                withdrawal.type === "withdrawal"
                                  ? "bg-red-600 text-white"
                                  : "bg-orange-500 text-white"
                              }`}
                            >
                              {withdrawal.type === "withdrawal" ? "💰 Withdrawal" : "🛒 Purchase"}
                            </Badge>
                            <span className="font-bold text-lg">
                              -₱{withdrawal.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{withdrawal.description}</p>
                          {withdrawal.chargedTo && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                withdrawal.chargedTo === "john"
                                  ? "border-purple-600 text-purple-600"
                                  : withdrawal.chargedTo === "elwin"
                                  ? "border-indigo-600 text-indigo-600"
                                  : "border-slate-600 text-slate-600"
                              }`}
                            >
                              {withdrawal.chargedTo === "john"
                                ? "👤 John"
                                : withdrawal.chargedTo === "elwin"
                                ? "👤 Elwin"
                                : "↔️ Split (Both)"}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWithdrawal(withdrawal._id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
