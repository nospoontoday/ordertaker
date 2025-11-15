"use client"

import { useEffect, useState } from "react"
import { ordersApi, Order, OrderItem, AppendedOrder } from "@/lib/api"
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
import { Check, Clock, UtensilsCrossed, ChefHat, ChevronLeft, ChevronRight } from "lucide-react"

const ORDERS_PER_PAGE = 10

export function PastOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const allOrders = await ordersApi.getAll()
      // Sort orders from newest to oldest
      const sortedOrders = allOrders.sort((a, b) => b.createdAt - a.createdAt)
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

  // Pagination calculations
  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE)
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE
  const endIndex = startIndex + ORDERS_PER_PAGE
  const paginatedOrders = orders.slice(startIndex, endIndex)

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
          Showing {startIndex + 1}-{Math.min(endIndex, orders.length)} of {orders.length} orders
        </div>
      </div>

      <div className="space-y-4">
        {paginatedOrders.map((order) => {
          const allItemsServed = order.items.every((item) => item.status === "served") &&
            (order.appendedOrders?.every((appended) =>
              appended.items.every((item) => item.status === "served")
            ) ?? true)

          const allPaid = order.isPaid &&
            (order.appendedOrders?.every((appended) => appended.isPaid) ?? true)

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
                  <div className="flex gap-2">
                    {allItemsServed && (
                      <Badge className="bg-green-100 text-green-800">All Served</Badge>
                    )}
                    {allPaid && (
                      <Badge className="bg-blue-100 text-blue-800">Fully Paid</Badge>
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
                      </div>
                    ))}
                  </div>
                )}
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
    </div>
  )
}
