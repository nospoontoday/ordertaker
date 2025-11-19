"use client"

import { useEffect, useState } from "react"
import { ordersApi, Order, OrderItem, AppendedOrder } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Check, Clock, UtensilsCrossed, ChefHat, ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const ORDERS_PER_PAGE = 10

export function PastOrders() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadOrders()
  }, [])

  const migrateLegacyOrders = async (orders: Order[]) => {
    // Migrate legacy orders that don't have paidAsWholeOrder flag
    const ordersToUpdate: Order[] = []

    for (const order of orders) {
      // Skip if no appended orders or already has the flag
      if (!order.appendedOrders || order.appendedOrders.length === 0 || order.paidAsWholeOrder) {
        continue
      }

      // Check if all orders are paid
      const mainPaid = order.isPaid
      const allAppendedPaid = order.appendedOrders.every(a => a.isPaid)

      if (!mainPaid || !allAppendedPaid) {
        continue
      }

      // Calculate totals
      const mainTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const appendedTotal = order.appendedOrders.reduce((sum, appended) => {
        return sum + appended.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0)
      }, 0)
      const overallTotal = mainTotal + appendedTotal

      // Check if this looks like a whole order payment
      // Criteria: Main order has amountReceived and it's >= overall total
      if (order.amountReceived !== undefined && order.amountReceived >= overallTotal) {
        // This is likely a whole order payment - migrate it
        ordersToUpdate.push(order)
      }
    }

    // Update orders in database
    if (ordersToUpdate.length > 0) {
      console.log(`Migrating ${ordersToUpdate.length} legacy orders to add paidAsWholeOrder flag`)

      for (const order of ordersToUpdate) {
        try {
          // Update main order
          await ordersApi.togglePayment(
            order.id,
            true,
            order.paymentMethod || undefined,
            order.cashAmount,
            order.gcashAmount,
            order.amountReceived,
            true // paidAsWholeOrder
          )

          // Update all appended orders
          if (order.appendedOrders) {
            for (const appended of order.appendedOrders) {
              if (appended.isPaid) {
                await ordersApi.toggleAppendedPayment(
                  order.id,
                  appended.id,
                  true,
                  appended.paymentMethod || undefined,
                  appended.cashAmount,
                  appended.gcashAmount,
                  appended.amountReceived,
                  true // paidAsWholeOrder
                )
              }
            }
          }
        } catch (error) {
          console.error(`Error migrating order ${order.id}:`, error)
        }
      }

      console.log(`Successfully migrated ${ordersToUpdate.length} orders`)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const allOrders = await ordersApi.getAll()

      // Run migration for legacy orders
      await migrateLegacyOrders(allOrders)

      // Reload orders after migration to get updated data
      const updatedOrders = await ordersApi.getAll()

      // Sort orders from newest to oldest
      const sortedOrders = updatedOrders.sort((a, b) => b.createdAt - a.createdAt)
      setOrders(sortedOrders)
    } catch (error) {
      console.error("Error loading past orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    newStatus: "pending" | "preparing" | "ready" | "served",
    isAppended: boolean = false,
    appendedId?: string
  ) => {
    try {
      if (isAppended && appendedId) {
        await ordersApi.updateAppendedItemStatus(orderId, appendedId, itemId, newStatus)
      } else {
        await ordersApi.updateItemStatus(orderId, itemId, newStatus)
      }
      await loadOrders()
    } catch (error) {
      console.error("Error updating item status:", error)
    }
  }

  const togglePayment = async (
    orderId: string,
    currentStatus: boolean,
    isAppended: boolean = false,
    appendedId?: string
  ) => {
    try {
      if (isAppended && appendedId) {
        await ordersApi.toggleAppendedPayment(orderId, appendedId, !currentStatus)
      } else {
        await ordersApi.togglePayment(orderId, !currentStatus)
      }
      await loadOrders()
    } catch (error) {
      console.error("Error toggling payment:", error)
    }
  }

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !user?.id) return

    try {
      setIsDeleting(true)
      await ordersApi.delete(orderToDelete.id, user.id)
      toast({
        title: "Order deleted",
        description: `Order #${orderToDelete.orderNumber || orderToDelete.id.split('-')[1]} has been deleted successfully.`,
      })
      await loadOrders()
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
    } catch (error: any) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />
      case "preparing":
        return <ChefHat className="h-3 w-3" />
      case "ready":
        return <UtensilsCrossed className="h-3 w-3" />
      case "served":
        return <Check className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
        return "bg-blue-100 text-blue-800"
      case "ready":
        return "bg-purple-100 text-purple-800"
      case "served":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderOrderItems = (
    items: OrderItem[],
    orderId: string,
    isAppended: boolean = false,
    appendedId?: string
  ) => {
    return items.map((item) => (
      <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
        <div className="flex-1">
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-gray-600">
            Qty: {item.quantity} × ₱{item.price} = ₱{item.quantity * item.price}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={item.status}
            onValueChange={(value) =>
              updateItemStatus(
                orderId,
                item.id,
                value as "pending" | "preparing" | "ready" | "served",
                isAppended,
                appendedId
              )
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="capitalize">{item.status}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="preparing">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-3 w-3" />
                  Preparing
                </div>
              </SelectItem>
              <SelectItem value="ready">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-3 w-3" />
                  Ready
                </div>
              </SelectItem>
              <SelectItem value="served">
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  Served
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">No orders found.</div>
      </div>
    )
  }

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()

    // Search by customer name
    if (order.customerName.toLowerCase().includes(searchLower)) return true

    // Search by order number
    if (order.orderNumber?.toString().includes(searchQuery)) return true

    // Search by items in main order
    if (order.items.some((item) => item.name.toLowerCase().includes(searchLower))) return true

    // Search by items in appended orders
    if (order.appendedOrders?.some((appended) =>
      appended.items.some((item) => item.name.toLowerCase().includes(searchLower))
    )) return true

    return false
  })

  // Pagination calculations (use filtered orders)
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE
  const endIndex = startIndex + ORDERS_PER_PAGE
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Past Orders</h1>
        <div className="text-sm text-gray-600">
          Showing {filteredOrders.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
          {searchQuery && ` (filtered from ${orders.length})`}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, order #, or item..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1) // Reset to first page when searching
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setCurrentPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* No results message */}
      {filteredOrders.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-gray-400 mb-2">
            <Search className="w-12 h-12 mx-auto mb-3" />
          </div>
          <div className="text-lg font-semibold text-gray-700 mb-1">No orders found</div>
          <div className="text-sm text-gray-500">
            No orders match your search "{searchQuery}"
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-4"
          >
            Clear search
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {paginatedOrders.map((order) => {
          const allItemsServed = order.items.every((item) => item.status === "served") &&
            (order.appendedOrders?.every((appended) =>
              appended.items.every((item) => item.status === "served")
            ) ?? true)

          const allPaid = order.isPaid &&
            (order.appendedOrders?.every((appended) => appended.isPaid) ?? true)

          // Check if at least one order is paid but not all
          const anyPaid = order.isPaid || (order.appendedOrders?.some((appended) => appended.isPaid) ?? false)
          const partiallyPaid = anyPaid && !allPaid

          return (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.customerName}</CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      Order #{order.orderNumber || order.id.split('-')[1]} • {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      {allItemsServed && (
                        <Badge className="bg-green-100 text-green-800">All Served</Badge>
                      )}
                      {allPaid && (
                        <Badge className="bg-blue-100 text-blue-800">Fully Paid</Badge>
                      )}
                      {partiallyPaid && (
                        <Badge className="bg-amber-100 text-amber-800">Partially Paid</Badge>
                      )}
                    </div>
                    {user?.role === "super_admin" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(order)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Main Order */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Main Order</h3>
                    <Button
                      size="sm"
                      variant={order.isPaid ? "default" : "outline"}
                      onClick={() => togglePayment(order.id, order.isPaid)}
                    >
                      {order.isPaid ? "Paid ✓" : "Mark as Paid"}
                    </Button>
                  </div>
                  {renderOrderItems(order.items, order.id)}

                  {/* Payment Information - Only show if not part of whole order payment */}
                  {order.isPaid && !order.paidAsWholeOrder && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-semibold text-blue-900 mb-2">Payment Details</div>
                      <div className="space-y-1 text-sm">
                        {order.paymentMethod && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Payment Method:</span>
                            <span className="font-medium capitalize">
                              {order.paymentMethod === 'split' ? 'Split Payment' : order.paymentMethod === 'gcash' ? 'GCash' : 'Cash'}
                            </span>
                          </div>
                        )}
                        {/* Order Total */}
                        {(() => {
                          const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                          return (
                            <div className="flex justify-between pt-1 border-t border-blue-200">
                              <span className="text-gray-700 font-semibold">Total:</span>
                              <span className="font-semibold text-blue-900">₱{orderTotal.toFixed(2)}</span>
                            </div>
                          )
                        })()}
                        {/* Amount Received - only show for Cash and Split payments (GCash is always exact) */}
                        {order.paymentMethod !== 'gcash' && (() => {
                          const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                          let amountReceived = orderTotal // Default fallback to order total

                          // Priority 1: Check for amountReceived field (the actual amount entered by user)
                          if (order.amountReceived !== undefined) {
                            amountReceived = order.amountReceived
                          }
                          // Priority 2: For split payments, sum cash + gcash
                          else if (order.paymentMethod === 'split' && (order.cashAmount !== undefined || order.gcashAmount !== undefined)) {
                            amountReceived = (order.cashAmount || 0) + (order.gcashAmount || 0)
                          }
                          // Priority 3: Use paidAmount if available
                          else if (order.paidAmount !== undefined) {
                            amountReceived = order.paidAmount
                          }
                          // Priority 4: Use cashAmount
                          else if (order.cashAmount !== undefined) {
                            amountReceived = order.cashAmount
                          }

                          // For split payments, change = amountReceived - cashAmount
                          // For cash payments, change = amountReceived - orderTotal
                          const change = order.paymentMethod === 'split'
                            ? amountReceived - (order.cashAmount || 0)
                            : amountReceived - orderTotal
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Amount Received:</span>
                                <span className="font-medium">₱{amountReceived.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-blue-200">
                                <span className="text-gray-700 font-semibold">Change:</span>
                                <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₱{change.toFixed(2)}
                                </span>
                              </div>
                            </>
                          )
                        })()}
                        {order.paymentMethod === 'split' && (
                          <>
                            {order.cashAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-700">Cash:</span>
                                <span className="font-medium">₱{order.cashAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {order.gcashAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-700">GCash:</span>
                                <span className="font-medium">₱{order.gcashAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Appended Orders */}
                {order.appendedOrders && order.appendedOrders.length > 0 && (
                  <div className="space-y-4">
                    {order.appendedOrders.map((appended, index) => (
                      <div key={appended.id} className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">
                            Appended Order #{index + 1}
                            <span className="text-sm text-gray-600 ml-2">
                              {formatDate(appended.createdAt)}
                            </span>
                          </h3>
                          <Button
                            size="sm"
                            variant={appended.isPaid ? "default" : "outline"}
                            onClick={() => togglePayment(order.id, appended.isPaid || false, true, appended.id)}
                          >
                            {appended.isPaid ? "Paid ✓" : "Mark as Paid"}
                          </Button>
                        </div>
                        {renderOrderItems(appended.items, order.id, true, appended.id)}

                        {/* Appended Order Payment Information - Only show if not part of whole order payment */}
                        {appended.isPaid && !appended.paidAsWholeOrder && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-semibold text-blue-900 mb-2">Payment Details</div>
                            <div className="space-y-1 text-sm">
                              {appended.paymentMethod && (
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Payment Method:</span>
                                  <span className="font-medium capitalize">
                                    {appended.paymentMethod === 'split' ? 'Split Payment' : appended.paymentMethod === 'gcash' ? 'GCash' : 'Cash'}
                                  </span>
                                </div>
                              )}
                              {/* Appended Order Total */}
                              {(() => {
                                const appendedTotal = appended.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                                return (
                                  <div className="flex justify-between pt-1 border-t border-blue-200">
                                    <span className="text-gray-700 font-semibold">Total:</span>
                                    <span className="font-semibold text-blue-900">₱{appendedTotal.toFixed(2)}</span>
                                  </div>
                                )
                              })()}
                              {/* Amount Received - only show for Cash and Split payments (GCash is always exact) */}
                              {appended.paymentMethod !== 'gcash' && (() => {
                                const appendedTotal = appended.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                                let amountReceived = appendedTotal // Default fallback to order total

                                // Priority 1: Check for amountReceived field (the actual amount entered by user)
                                if (appended.amountReceived !== undefined) {
                                  amountReceived = appended.amountReceived
                                }
                                // Priority 2: For split payments, sum cash + gcash
                                else if (appended.paymentMethod === 'split' && (appended.cashAmount !== undefined || appended.gcashAmount !== undefined)) {
                                  amountReceived = (appended.cashAmount || 0) + (appended.gcashAmount || 0)
                                }
                                // Priority 3: Use paidAmount if available
                                else if (appended.paidAmount !== undefined) {
                                  amountReceived = appended.paidAmount
                                }
                                // Priority 4: Use cashAmount
                                else if (appended.cashAmount !== undefined) {
                                  amountReceived = appended.cashAmount
                                }

                                // For split payments, change = amountReceived - cashAmount
                                // For cash payments, change = amountReceived - appendedTotal
                                const change = appended.paymentMethod === 'split'
                                  ? amountReceived - (appended.cashAmount || 0)
                                  : amountReceived - appendedTotal
                                return (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-700">Amount Received:</span>
                                      <span className="font-medium">₱{amountReceived.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-blue-200">
                                      <span className="text-gray-700 font-semibold">Change:</span>
                                      <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ₱{change.toFixed(2)}
                                      </span>
                                    </div>
                                  </>
                                )
                              })()}
                              {appended.paymentMethod === 'split' && (
                                <>
                                  {appended.cashAmount !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-700">Cash:</span>
                                      <span className="font-medium">₱{appended.cashAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {appended.gcashAmount !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-700">GCash:</span>
                                      <span className="font-medium">₱{appended.gcashAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall Payment Summary */}
                {(() => {
                  // Calculate main order total
                  const mainOrderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

                  // Calculate appended orders total
                  const appendedOrdersTotal = (order.appendedOrders || []).reduce((sum, appended) => {
                    return sum + appended.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0)
                  }, 0)

                  // Calculate overall total
                  const overallTotal = mainOrderTotal + appendedOrdersTotal

                  // Calculate payment method breakdown
                  let totalCash = 0
                  let totalGcash = 0

                  // Main order payment
                  if (order.isPaid) {
                    if (order.paymentMethod === 'cash') {
                      totalCash += order.cashAmount || order.paidAmount || mainOrderTotal
                    } else if (order.paymentMethod === 'gcash') {
                      totalGcash += order.gcashAmount || order.paidAmount || mainOrderTotal
                    } else if (order.paymentMethod === 'split') {
                      totalCash += order.cashAmount || 0
                      totalGcash += order.gcashAmount || 0
                    }
                  }

                  // Appended orders payments
                  (order.appendedOrders || []).forEach((appended) => {
                    if (appended.isPaid) {
                      const appendedTotal = appended.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                      if (appended.paymentMethod === 'cash') {
                        totalCash += appended.cashAmount || appended.paidAmount || appendedTotal
                      } else if (appended.paymentMethod === 'gcash') {
                        totalGcash += appended.gcashAmount || appended.paidAmount || appendedTotal
                      } else if (appended.paymentMethod === 'split') {
                        totalCash += appended.cashAmount || 0
                        totalGcash += appended.gcashAmount || 0
                      }
                    }
                  })

                  // Only show overall summary if there are multiple orders (main + appended)
                  const hasMultipleOrders = order.appendedOrders && order.appendedOrders.length > 0

                  // Check if this was a whole order payment
                  const isPaidAsWholeOrder = order.paidAsWholeOrder ||
                    (order.appendedOrders && order.appendedOrders.some(a => a.paidAsWholeOrder))

                  if (hasMultipleOrders) {
                    // Get payment method from main order (where whole order payment details are stored)
                    const paymentMethod = order.paymentMethod
                    const amountReceived = order.amountReceived

                    return (
                      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border-2 border-emerald-200">
                        <div className="text-base font-bold text-emerald-900 mb-3">Overall Payment Summary</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center pb-2 border-b-2 border-emerald-300">
                            <span className="text-gray-800 font-bold text-base">Overall Total:</span>
                            <span className="font-bold text-emerald-900 text-lg">₱{overallTotal.toFixed(2)}</span>
                          </div>
                          {totalCash > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-semibold">💵 Cash:</span>
                              <span className="font-semibold text-emerald-800">₱{totalCash.toFixed(2)}</span>
                            </div>
                          )}
                          {totalGcash > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-semibold">Ⓖ GCash:</span>
                              <span className="font-semibold text-blue-800">₱{totalGcash.toFixed(2)}</span>
                            </div>
                          )}
                          {/* Show amount received and change only when paid as whole order */}
                          {isPaidAsWholeOrder && amountReceived !== undefined && paymentMethod !== 'gcash' && (
                            <>
                              <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-300">
                                <span className="text-gray-700 font-semibold">Amount Received:</span>
                                <span className="font-semibold text-purple-800">₱{amountReceived.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Change:</span>
                                <span className={`font-semibold ${(amountReceived - (paymentMethod === 'split' ? totalCash : overallTotal)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₱{(amountReceived - (paymentMethod === 'split' ? totalCash : overallTotal)).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)

              if (!showPage) {
                // Show ellipsis for skipped pages
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-gray-400">
                      ...
                    </span>
                  )
                }
                return null
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageClick(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order #{orderToDelete?.orderNumber || orderToDelete?.id.split('-')[1]} for {orderToDelete?.customerName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
