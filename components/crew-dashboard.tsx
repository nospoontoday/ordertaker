"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Check, Clock, AlertCircle, Plus, CreditCard, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { ordersApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useOrderEvents } from "@/contexts/websocket-context"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
  preparingAt?: number
  readyAt?: number
  servedAt?: number
  preparedBy?: string
  preparedByEmail?: string
  servedBy?: string
  servedByEmail?: string
}

interface AppendedOrder {
  id: string
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
  paymentMethod?: "cash" | "gcash" | null
}

interface Order {
  id: string
  orderNumber?: number
  customerName: string
  items: OrderItem[]
  createdAt: number
  isPaid: boolean
  paymentMethod?: "cash" | "gcash" | null
  orderType: "dine-in" | "take-out"
  appendedOrders?: AppendedOrder[]
  allItemsServedAt?: number
  orderTakerName?: string
  orderTakerEmail?: string
}

type ItemStatus = "pending" | "preparing" | "ready" | "served"

export function CrewDashboard({ onAppendItems }: { onAppendItems: (orderId: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [expandedServed, setExpandedServed] = useState<Set<string>>(new Set())
  const [expandedCompleted, setExpandedCompleted] = useState<string | null>(null)
  const [todayDate, setTodayDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const { toast } = useToast()
  const { user } = useAuth()

  // Role-based permission checks
  // Order Taker: Can take orders, mark as paid, append items, delete orders/items
  // Crew: Can ONLY update item status (pending → preparing → ready)
  // Order Taker + Crew: Can do both (status updates + payments/deletes/appends/mark served)
  // Super Admin: Has all permissions
  const isOrderTaker = user?.role === "order_taker" || user?.role === "super_admin" || user?.role === "order_taker_crew"
  const isCrew = user?.role === "crew" || user?.role === "order_taker_crew"
  const canManagePayments = isOrderTaker
  const canDeleteOrders = isOrderTaker
  const canAppendItems = isOrderTaker

  // WebSocket real-time event handlers
  const handleOrderCreated = (newOrder: any) => {
    console.log('WebSocket: Order created', newOrder)

    // Transform and add the new order
    const transformedOrder: Order = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      isPaid: newOrder.isPaid || false,
      paymentMethod: newOrder.paymentMethod,
      orderType: newOrder.orderType || "dine-in",
      createdAt: newOrder.createdAt,
      allItemsServedAt: newOrder.allItemsServedAt,
      orderTakerName: newOrder.orderTakerName,
      orderTakerEmail: newOrder.orderTakerEmail,
      items: newOrder.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        status: item.status || "pending",
        itemType: item.itemType || "dine-in",
        preparingAt: item.preparingAt,
        readyAt: item.readyAt,
        servedAt: item.servedAt,
        preparedBy: item.preparedBy,
        preparedByEmail: item.preparedByEmail,
        servedBy: item.servedBy,
        servedByEmail: item.servedByEmail,
      })),
      appendedOrders: (newOrder.appendedOrders || []).map((appended: any) => ({
        id: appended.id,
        isPaid: appended.isPaid || false,
        paymentMethod: appended.paymentMethod,
        createdAt: appended.createdAt,
        items: appended.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          status: item.status || "pending",
          itemType: item.itemType || "dine-in",
          preparingAt: item.preparingAt,
          readyAt: item.readyAt,
          servedAt: item.servedAt,
          preparedBy: item.preparedBy,
          preparedByEmail: item.preparedByEmail,
          servedBy: item.servedBy,
          servedByEmail: item.servedByEmail,
        })),
      })),
    }

    setOrders(prevOrders => {
      // Check if order already exists
      if (prevOrders.some(o => o.id === transformedOrder.id)) {
        return prevOrders
      }
      return [...prevOrders, transformedOrder]
    })

    // Auto-expand new order
    setExpandedOrders(prev => new Set(prev).add(transformedOrder.id))

    toast({
      title: "New Order",
      description: `Order #${newOrder.orderNumber} for ${newOrder.customerName} has been created.`,
    })
  }

  const handleOrderUpdated = (updatedOrder: any) => {
    console.log('WebSocket: Order updated', updatedOrder)
    console.log('WebSocket: Appended orders:', updatedOrder.appendedOrders)

    // Transform and update the order
    const transformedOrder: Order = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      customerName: updatedOrder.customerName,
      isPaid: updatedOrder.isPaid || false,
      paymentMethod: updatedOrder.paymentMethod,
      orderType: updatedOrder.orderType || "dine-in",
      createdAt: updatedOrder.createdAt,
      allItemsServedAt: updatedOrder.allItemsServedAt,
      orderTakerName: updatedOrder.orderTakerName,
      orderTakerEmail: updatedOrder.orderTakerEmail,
      items: updatedOrder.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        status: item.status || "pending",
        itemType: item.itemType || "dine-in",
        preparingAt: item.preparingAt,
        readyAt: item.readyAt,
        servedAt: item.servedAt,
        preparedBy: item.preparedBy,
        preparedByEmail: item.preparedByEmail,
        servedBy: item.servedBy,
        servedByEmail: item.servedByEmail,
      })),
      appendedOrders: (updatedOrder.appendedOrders || []).map((appended: any) => ({
        id: appended.id,
        isPaid: appended.isPaid || false,
        paymentMethod: appended.paymentMethod,
        createdAt: appended.createdAt,
        items: appended.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          status: item.status || "pending",
          itemType: item.itemType || "dine-in",
          preparingAt: item.preparingAt,
          readyAt: item.readyAt,
          servedAt: item.servedAt,
          preparedBy: item.preparedBy,
          preparedByEmail: item.preparedByEmail,
          servedBy: item.servedBy,
          servedByEmail: item.servedByEmail,
        })),
      })),
    }

    console.log('WebSocket: Transformed order:', transformedOrder)
    console.log('WebSocket: Transformed appended orders count:', transformedOrder.appendedOrders?.length || 0)
    if (transformedOrder.appendedOrders && transformedOrder.appendedOrders.length > 0) {
      transformedOrder.appendedOrders.forEach((appended, index) => {
        console.log(`Appended order ${index}:`, {
          id: appended.id,
          isPaid: appended.isPaid,
          itemCount: appended.items.length,
          itemStatuses: appended.items.map(item => item.status)
        })
      })
    }

    setOrders(prevOrders => {
      const index = prevOrders.findIndex(o => o.id === transformedOrder.id)
      if (index === -1) {
        // Order doesn't exist yet, add it
        console.log('WebSocket: Adding new order to state')
        return [...prevOrders, transformedOrder]
      }
      // Update existing order
      console.log('WebSocket: Updating existing order in state')
      const newOrders = [...prevOrders]
      newOrders[index] = transformedOrder
      return newOrders
    })
  }

  const handleOrderDeleted = (orderId: string) => {
    console.log('WebSocket: Order deleted', orderId)

    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId))

    toast({
      title: "Order Deleted",
      description: "An order has been deleted.",
      variant: "destructive",
    })
  }

  // Set up WebSocket event listeners
  const { isConnected } = useOrderEvents(
    handleOrderCreated,
    handleOrderUpdated,
    handleOrderDeleted
  )

  // Load orders from API with localStorage fallback
  useEffect(() => {
    fetchOrders()
    const today = new Date()
    setTodayDate(today.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }))

    // Auto-refresh every 30 seconds (backup for WebSocket)
    const interval = setInterval(() => {
      fetchOrders(true) // Silent refresh
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async (silent = false) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      // Try to fetch from API
      const apiOrders = await ordersApi.getAll({ sortBy: 'createdAt', sortOrder: 'asc' })

      // Transform API data to match component interface
      const transformedOrders = apiOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        isPaid: order.isPaid || false,
        paymentMethod: order.paymentMethod || null,
        orderType: order.orderType || "dine-in",
        createdAt: order.createdAt,
        allItemsServedAt: order.allItemsServedAt,
        orderTakerName: order.orderTakerName,
        orderTakerEmail: order.orderTakerEmail,
        items: order.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          status: item.status || "pending",
          itemType: item.itemType || "dine-in",
          preparingAt: item.preparingAt,
          readyAt: item.readyAt,
          servedAt: item.servedAt,
          preparedBy: item.preparedBy,
          preparedByEmail: item.preparedByEmail,
          servedBy: item.servedBy,
          servedByEmail: item.servedByEmail,
        })),
        appendedOrders: (order.appendedOrders || []).map((appended: any) => ({
          id: appended.id,
          isPaid: appended.isPaid || false,
          paymentMethod: appended.paymentMethod || null,
          createdAt: appended.createdAt,
          items: appended.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            status: item.status || "pending",
            itemType: item.itemType || "dine-in",
            preparingAt: item.preparingAt,
            readyAt: item.readyAt,
            servedAt: item.servedAt,
            preparedBy: item.preparedBy,
            preparedByEmail: item.preparedByEmail,
            servedBy: item.servedBy,
            servedByEmail: item.servedByEmail,
          })),
        })),
      }))

      setOrders(transformedOrders)
      setIsOnline(true)

      // Cache in localStorage
      localStorage.setItem("orders", JSON.stringify(transformedOrders))

      // Expand active orders
      const activeOrderIds = new Set<string>(transformedOrders.filter((o: Order) => !isOrderFullyComplete(o)).map((o: Order) => o.id))
      setExpandedOrders(activeOrderIds)
    } catch (error) {
      console.error("Error fetching orders from API, using localStorage:", error)
      setIsOnline(false)

      // Fall back to localStorage
      const saved = localStorage.getItem("orders")
      if (saved) {
        const parsed = JSON.parse(saved)
        const initialized = parsed.map((order: any) => ({
          ...order,
          isPaid: order.isPaid || false,
          paymentMethod: order.paymentMethod || null,
          orderType: order.orderType || "dine-in",
          items: order.items.map((item: any) => ({
            ...item,
            quantity: item.quantity || 1,
            status: item.status || "pending",
          })),
          appendedOrders: (order.appendedOrders || []).map((appended: any) => ({
            ...appended,
            isPaid: appended.isPaid || false,
            paymentMethod: appended.paymentMethod || null,
            items: appended.items.map((item: any) => ({
              ...item,
              quantity: item.quantity || 1,
              status: item.status || "pending",
            })),
          })),
        }))
        setOrders(initialized)

        const activeOrderIds = new Set<string>(initialized.filter((o: Order) => !isOrderFullyComplete(o)).map((o: Order) => o.id))
        setExpandedOrders(activeOrderIds)
      }

      if (!silent) {
        toast({
          title: "Offline Mode",
          description: "Showing cached orders. Will sync when online.",
          variant: "default",
        })
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  // Save orders to localStorage
  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders))
  }, [orders])

  const toggleOrderExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const toggleServedExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedServed)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedServed(newExpanded)
  }

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: ItemStatus) => {
    // Find the item to check for crew assignment
    const order = orders.find(o => o.id === orderId)
    const item = order?.items.find(i => i.id === itemId)

    if (!item) return

    // Validation: Only crew who prepared the item can update it (unless order taker)
    if (!isOrderTaker && item.preparedByEmail && item.preparedByEmail !== user?.email) {
      toast({
        title: "Permission Denied",
        description: "Only the crew member who prepared this item can update its status.",
        variant: "destructive",
      })
      return
    }

    // Prepare updated item with crew tracking
    const updatedItem: Partial<OrderItem> = { status: newStatus }

    // When moving to "preparing", assign the crew member
    if (newStatus === "preparing" && !item.preparedBy && !item.preparedByEmail) {
      updatedItem.preparedBy = user?.name
      updatedItem.preparedByEmail = user?.email
      updatedItem.preparingAt = Date.now()
    } else if (newStatus === "ready") {
      updatedItem.readyAt = Date.now()
    } else if (newStatus === "served") {
      updatedItem.servedAt = Date.now()
      updatedItem.servedBy = user?.name
      updatedItem.servedByEmail = user?.email
    }

    // Update local state immediately for responsiveness
    setOrders(
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              items: order.items.map((item) => (item.id === itemId ? { ...item, ...updatedItem } : item)),
            }
          : order,
      ),
    )

    // Sync to API
    try {
      await ordersApi.updateItemStatus(orderId, itemId, newStatus, updatedItem)
      setIsOnline(true)
    } catch (error) {
      console.error("Error updating item status:", error)
      setIsOnline(false)
      toast({
        title: "Offline Mode",
        description: "Status updated locally. Will sync when online.",
        variant: "default",
      })
    }
  }

  const updateAppendedItemStatus = async (
    orderId: string,
    appendedOrderId: string,
    itemId: string,
    newStatus: ItemStatus,
  ) => {
    console.log('updateAppendedItemStatus called:', { orderId, appendedOrderId, itemId, newStatus })

    // Find the item to check for crew assignment
    const order = orders.find(o => o.id === orderId)
    const appendedOrder = order?.appendedOrders?.find(a => a.id === appendedOrderId)
    const item = appendedOrder?.items.find(i => i.id === itemId)

    if (!item) return

    // Validation: Only crew who prepared the item can update it (unless order taker)
    if (!isOrderTaker && item.preparedByEmail && item.preparedByEmail !== user?.email) {
      toast({
        title: "Permission Denied",
        description: "Only the crew member who prepared this item can update its status.",
        variant: "destructive",
      })
      return
    }

    // Prepare updated item with crew tracking
    const updatedItem: Partial<OrderItem> = { status: newStatus }

    // When moving to "preparing", assign the crew member
    if (newStatus === "preparing" && !item.preparedBy && !item.preparedByEmail) {
      updatedItem.preparedBy = user?.name
      updatedItem.preparedByEmail = user?.email
      updatedItem.preparingAt = Date.now()
    } else if (newStatus === "ready") {
      updatedItem.readyAt = Date.now()
    } else if (newStatus === "served") {
      updatedItem.servedAt = Date.now()
      updatedItem.servedBy = user?.name
      updatedItem.servedByEmail = user?.email
    }

    // Update local state immediately
    setOrders(
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              appendedOrders: (order.appendedOrders || []).map((appended) =>
                appended.id === appendedOrderId
                  ? {
                      ...appended,
                      items: appended.items.map((item) => (item.id === itemId ? { ...item, ...updatedItem } : item)),
                    }
                  : appended,
              ),
            }
          : order,
      ),
    )

    // Sync to API using the dedicated appended item status endpoint
    try {
      const result = await ordersApi.updateAppendedItemStatus(orderId, appendedOrderId, itemId, newStatus, updatedItem)
      console.log('API update successful:', result)
      setIsOnline(true)
    } catch (error) {
      console.error("Error updating appended item status:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to update item status.",
        variant: "destructive",
      })
    }
  }

  const markAppendedAsPaid = async (orderId: string, appendedOrderId: string, paymentMethod: "cash" | "gcash") => {
    // Update local state immediately
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            appendedOrders: (order.appendedOrders || []).map((appended) =>
              appended.id === appendedOrderId ? { ...appended, isPaid: true, paymentMethod } : appended,
            ),
          }
        : order,
    )
    setOrders(updatedOrders)

    // Sync to API
    try {
      await ordersApi.toggleAppendedPayment(orderId, appendedOrderId, true, paymentMethod)
      setIsOnline(true)
      toast({
        title: "Payment Recorded",
        description: `Appended order marked as paid via ${paymentMethod.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Error marking appended order as paid:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to mark appended order as paid.",
        variant: "destructive",
      })
    }
  }

  const deleteAppendedOrder = async (orderId: string, appendedOrderId: string) => {
    // Update local state immediately
    setOrders(
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              appendedOrders: (order.appendedOrders || []).filter((appended) => appended.id !== appendedOrderId),
            }
          : order,
      ),
    )

    // Sync to API
    try {
      await ordersApi.deleteAppended(orderId, appendedOrderId)
      setIsOnline(true)
      toast({
        title: "Appended Order Deleted",
        description: "Appended order has been removed successfully.",
      })
    } catch (error) {
      console.error("Error deleting appended order:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to delete appended order.",
        variant: "destructive",
      })
    }
  }

  const markAsPaid = async (orderId: string, paymentMethod: "cash" | "gcash") => {
    // Update local state immediately
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, isPaid: true, paymentMethod } : order)))

    // Sync to API
    try {
      await ordersApi.togglePayment(orderId, true, paymentMethod)
      setIsOnline(true)
      toast({
        title: "Payment Recorded",
        description: `Order marked as paid via ${paymentMethod.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Error marking as paid:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to mark as paid.",
        variant: "destructive",
      })
    }
  }

  const markAllAsPaid = async (orderId: string, paymentMethod: "cash" | "gcash") => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    // Update local state immediately - mark main order and all appended orders as paid with payment method
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              isPaid: true,
              paymentMethod,
              appendedOrders: (o.appendedOrders || []).map((appended) => ({
                ...appended,
                isPaid: true,
                paymentMethod,
              })),
            }
          : o,
      ),
    )

    // Sync to API
    try {
      // Mark main order as paid with payment method
      await ordersApi.togglePayment(orderId, true, paymentMethod)

      // Mark all appended orders as paid with payment method
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        await Promise.all(
          order.appendedOrders.map((appended) => ordersApi.toggleAppendedPayment(orderId, appended.id, true, paymentMethod)),
        )
      }

      setIsOnline(true)
      toast({
        title: "All Paid",
        description: `All orders have been marked as paid via ${paymentMethod.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Error marking all as paid:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to mark all as paid.",
        variant: "destructive",
      })
    }
  }

  const deleteOrder = async (orderId: string) => {
    // Update local state immediately
    setOrders(orders.filter((order) => order.id !== orderId))

    // Sync to API
    try {
      await ordersApi.delete(orderId)
      setIsOnline(true)
      toast({
        title: "Order Deleted",
        description: "Order has been removed successfully.",
      })
    } catch (error) {
      console.error("Error deleting order:", error)
      setIsOnline(false)
      toast({
        title: "Offline Mode",
        description: "Order deleted locally. Will sync when online.",
        variant: "default",
      })
    }
  }

  const deleteItemFromOrder = async (orderId: string, itemId: string) => {
    console.log('deleteItemFromOrder called:', { orderId, itemId })
    const order = orders.find((o) => o.id === orderId)
    if (!order) {
      console.log('Order not found')
      return
    }

    console.log('Order found, items count:', order.items.length)

    // Check if this is the last item
    if (order.items.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete the last item. Delete the entire order instead.",
        variant: "destructive",
      })
      return
    }

    // Update local state immediately
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.filter((item) => item.id !== itemId),
            }
          : o,
      ),
    )

    // Sync to API by updating the order with filtered items
    try {
      const updatedItems = order.items.filter((item) => item.id !== itemId)
      console.log('Updating order items via API:', updatedItems)
      await ordersApi.update(orderId, { items: updatedItems })
      console.log('API update successful')
      setIsOnline(true)
      toast({
        title: "Item Deleted",
        description: "Item has been removed from the order.",
      })
    } catch (error) {
      console.error("Error deleting item from main order:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  const deleteItemFromAppendedOrder = async (orderId: string, appendedOrderId: string, itemId: string) => {
    console.log('deleteItemFromAppendedOrder called:', { orderId, appendedOrderId, itemId })
    const order = orders.find((o) => o.id === orderId)
    const appendedOrder = order?.appendedOrders?.find((a) => a.id === appendedOrderId)

    if (!order || !appendedOrder) {
      console.log('Order or appended order not found')
      return
    }

    console.log('Appended order found, items count:', appendedOrder.items.length)

    // Check if this is the last item in the appended order - if so, delete the entire appended order
    if (appendedOrder.items.length === 1) {
      console.log('Last item in appended order - deleting entire appended order')
      await deleteAppendedOrder(orderId, appendedOrderId)
      return
    }

    // Update local state immediately
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              appendedOrders: (o.appendedOrders || []).map((appended) =>
                appended.id === appendedOrderId
                  ? {
                      ...appended,
                      items: appended.items.filter((item) => item.id !== itemId),
                    }
                  : appended,
              ),
            }
          : o,
      ),
    )

    // Sync to API by updating the entire order
    try {
      const updatedAppendedOrders = order.appendedOrders!.map((appended) =>
        appended.id === appendedOrderId
          ? {
              ...appended,
              items: appended.items.filter((item) => item.id !== itemId),
            }
          : appended,
      )
      console.log('Updating appended orders via API:', updatedAppendedOrders)
      await ordersApi.update(orderId, { appendedOrders: updatedAppendedOrders })
      console.log('API update successful')
      setIsOnline(true)
      toast({
        title: "Item Deleted",
        description: "Item has been removed from the appended order.",
      })
    } catch (error) {
      console.error("Error deleting item from appended order:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 border-amber-200 text-amber-700"
      case "preparing":
        return "bg-orange-50 border-orange-200 text-orange-700"
      case "ready":
        return "bg-emerald-50 border-emerald-200 text-emerald-700"
      case "served":
        return "bg-slate-50 border-slate-200 text-slate-600"
      default:
        return "bg-slate-50 border-slate-200 text-slate-600"
    }
  }

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="w-4 h-4" />
      case "preparing":
        return <Clock className="w-4 h-4" />
      case "ready":
        return <Check className="w-4 h-4" />
      case "served":
        return <Check className="w-4 h-4" />
      default:
        return null
    }
  }

  const canDeleteOrder = (order: Order): boolean => {
    // Check if all items in main order are still pending
    const mainItemsPending = order.items.every((item) => item.status === "pending")

    // Check if all items in appended orders are still pending
    const appendedItemsPending =
      !order.appendedOrders ||
      order.appendedOrders.length === 0 ||
      order.appendedOrders.every((appended) => appended.items.every((item) => item.status === "pending"))

    return mainItemsPending && appendedItemsPending
  }

  const canDeleteAppendedOrder = (appendedOrder: AppendedOrder): boolean => {
    return appendedOrder.items.every((item) => item.status === "pending")
  }

  const getNextStatus = (current: ItemStatus): ItemStatus => {
    const statuses: ItemStatus[] = ["pending", "preparing", "ready", "served"]
    const currentIndex = statuses.indexOf(current)
    return statuses[(currentIndex + 1) % statuses.length]
  }

  const getStatusButtonLabel = (status: ItemStatus): string => {
    switch (status) {
      case "pending":
        return "Start Preparing"
      case "preparing":
        return "Ready to Serve"
      case "ready":
        return "Mark Served"
      case "served":
        return "Served"
      default:
        return "Next"
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds || milliseconds <= 0) return ""
    
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60
      if (remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`
      }
      return `${hours}h`
    }
    
    if (minutes > 0) {
      return `${minutes} min`
    }
    
    return `${seconds} sec`
  }

  const calculateOrderTime = (order: Order): string | null => {
    if (!order.allItemsServedAt || !order.createdAt) {
      return null
    }
    
    // Base order time from creation to when all items are served
    const baseDuration = order.allItemsServedAt - order.createdAt
    
    // Sum of prep times for all appended items
    let appendedPrepTimeSum = 0
    if (order.appendedOrders && order.appendedOrders.length > 0) {
      order.appendedOrders.forEach((appended) => {
        appended.items.forEach((item) => {
          if (item.preparingAt && item.servedAt) {
            appendedPrepTimeSum += (item.servedAt - item.preparingAt)
          }
        })
      })
    }
    
    // Total time = base order time + sum of appended items prep times
    const totalDuration = baseDuration + appendedPrepTimeSum
    return formatDuration(totalDuration)
  }

  const calculateItemPrepTime = (item: OrderItem): string | null => {
    if (!item.preparingAt || !item.servedAt) {
      return null
    }
    const duration = item.servedAt - item.preparingAt
    return formatDuration(duration)
  }

  const getCrewDisplay = (item: OrderItem, field: 'prepared' | 'served'): string | null => {
    const name = field === 'prepared' ? item.preparedBy : item.servedBy
    const email = field === 'prepared' ? item.preparedByEmail : item.servedByEmail

    if (name) {
      return name
    }
    if (email) {
      return email.split('@')[0]
    }
    return null
  }

  const getOrderTakerDisplay = (order: Order): string | null => {
    if (order.orderTakerName) {
      return order.orderTakerName
    }
    if (order.orderTakerEmail) {
      // Remove @domain.com part
      return order.orderTakerEmail.split('@')[0]
    }
    return null
  }

  const getOrderTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const areAllItemsServed = (items: OrderItem[]): boolean => {
    return items.length > 0 && items.every((item) => item.status === "served")
  }

  const areAllItemsPaid = (order: Order): boolean => {
    const mainOrderPaid = order.isPaid

    // Explicitly check if there are any unpaid appended orders
    const hasUnpaidAppendedOrders = order.appendedOrders && order.appendedOrders.length > 0 &&
      order.appendedOrders.some((appended) => !appended.isPaid)

    if (hasUnpaidAppendedOrders) {
      return false
    }

    const appendedOrdersPaid =
      !order.appendedOrders || order.appendedOrders.length === 0
        ? true
        : order.appendedOrders.every((appended) => appended.isPaid)

    return mainOrderPaid && appendedOrdersPaid
  }

  const isOrderFullyComplete = (order: Order): boolean => {
    const mainItemsServed = areAllItemsServed(order.items)

    // Explicitly check for any unserved items in appended orders
    const hasUnservedAppendedItems = order.appendedOrders && order.appendedOrders.length > 0 &&
      order.appendedOrders.some((appended) => {
        return appended.items.some((item) => item.status !== "served")
      })

    if (hasUnservedAppendedItems) {
      return false
    }

    // Explicitly check for any unpaid appended orders
    const hasUnpaidAppendedOrders = order.appendedOrders && order.appendedOrders.length > 0 &&
      order.appendedOrders.some((appended) => !appended.isPaid)

    if (hasUnpaidAppendedOrders) {
      return false
    }

    const appendedOrdersServed =
      !order.appendedOrders || order.appendedOrders.length === 0
        ? true
        : order.appendedOrders.every((appended) => areAllItemsServed(appended.items))
    const allPaid = areAllItemsPaid(order)
    const isComplete = mainItemsServed && appendedOrdersServed && allPaid

    // Debug logging for orders with appended orders
    if (order.appendedOrders && order.appendedOrders.length > 0) {
      console.log(`Checking if order ${order.id} (${order.customerName}) is complete:`, {
        mainItemsServed,
        hasUnservedAppendedItems,
        hasUnpaidAppendedOrders,
        appendedOrdersServed,
        allPaid,
        isComplete,
        appendedCount: order.appendedOrders.length,
        appendedDetails: order.appendedOrders.map(a => ({
          id: a.id,
          isPaid: a.isPaid,
          itemStatuses: a.items.map(i => i.status)
        }))
      })
    }

    return isComplete
  }

  const isOrderServedNotPaid = (order: Order): boolean => {
    const mainItemsServed = areAllItemsServed(order.items)
    const appendedOrdersServed =
      !order.appendedOrders || order.appendedOrders.length === 0
        ? true
        : order.appendedOrders.every((appended) => areAllItemsServed(appended.items))
    const allServed = mainItemsServed && appendedOrdersServed
    const notFullyPaid = !areAllItemsPaid(order)
    return allServed && notFullyPaid
  }

  const activeOrders = orders.filter((o) => !isOrderFullyComplete(o) && !isOrderServedNotPaid(o))
  const servedNotPaidOrders = orders.filter((o) => isOrderServedNotPaid(o))
  const completedOrders = orders.filter((o) => isOrderFullyComplete(o))

  // Helper function to get the latest timestamp for an order (main order or most recent appended order)
  const getLatestOrderTimestamp = (order: Order): number => {
    let latestTimestamp = order.createdAt

    if (order.appendedOrders && order.appendedOrders.length > 0) {
      const latestAppendedTimestamp = Math.max(...order.appendedOrders.map((a) => a.createdAt))
      latestTimestamp = Math.max(latestTimestamp, latestAppendedTimestamp)
    }

    return latestTimestamp
  }

  const sortedActiveOrders = [...activeOrders].sort((a, b) => getLatestOrderTimestamp(a) - getLatestOrderTimestamp(b))
  const sortedServedNotPaidOrders = [...servedNotPaidOrders].sort((a, b) => getLatestOrderTimestamp(a) - getLatestOrderTimestamp(b))

  const getPaymentSummary = (order: Order) => {
    const mainOrderPaid = order.isPaid
    const appendedOrdersPaid = order.appendedOrders?.filter((a) => a.isPaid).length || 0
    const totalAppendedOrders = order.appendedOrders?.length || 0
    return { mainOrderPaid, appendedOrdersPaid, totalAppendedOrders }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Order Dashboard</h1>
              <p className="text-sm text-slate-500 font-medium">{todayDate}</p>
            </div>
            <div className="flex items-center gap-3">
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700">Offline</span>
                </div>
              )}
              {isConnected && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">Live</span>
                </div>
              )}
              <button
                onClick={() => fetchOrders()}
                disabled={isLoading}
                className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 transition-transform ${isLoading ? "animate-spin" : "group-hover:rotate-180"} duration-500`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-4" />
            <p className="text-base font-medium text-slate-500">Loading orders...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Orders */}
          {sortedActiveOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <h2 className="text-base font-bold tracking-wide uppercase text-slate-800">Active Orders</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 to-transparent" />
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {sortedActiveOrders.length}
                </span>
              </div>
              <div className="space-y-3">
              {sortedActiveOrders.map((order) => {
                const { mainOrderPaid, appendedOrdersPaid, totalAppendedOrders } = getPaymentSummary(order)
                const isExpanded = expandedOrders.has(order.id)
                return (
                  <Card
                    key={order.id}
                    className="group relative overflow-hidden bg-white border border-slate-200/80 shadow-sm transition-all duration-300 cursor-pointer"
                  >

                    <div onClick={() => toggleOrderExpanded(order.id)} className="relative px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="flex items-center gap-3">
                            {order.orderNumber && (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold shadow-sm">
                                #{order.orderNumber}
                              </span>
                            )}
                            <h3 className="font-bold text-base text-slate-900 truncate">{order.customerName}</h3>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-600">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatTime(order.createdAt)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                            {totalAppendedOrders > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">+{totalAppendedOrders}</span>
                              </>
                            )}
                            {getOrderTakerDisplay(order) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-slate-500">Order by: {getOrderTakerDisplay(order)}</span>
                              </>
                            )}
                          </div>

                          {(mainOrderPaid || (totalAppendedOrders > 0 && appendedOrdersPaid > 0)) && (
                            <div className="flex flex-wrap items-center gap-2">
                              {mainOrderPaid && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm">
                                  <Check className="w-3.5 h-3.5" />
                                  Paid
                                </span>
                              )}
                              {totalAppendedOrders > 0 && appendedOrdersPaid > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-sm">
                                  {appendedOrdersPaid}/{totalAppendedOrders} Paid
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          const mainTotal = getOrderTotal(order.items)
                          const appendedTotal =
                            order.appendedOrders?.reduce((sum, a) => sum + getOrderTotal(a.items), 0) || 0
                          const totalAmount = mainTotal + appendedTotal

                          const unpaidMainTotal = mainOrderPaid ? 0 : mainTotal
                          const unpaidAppendedTotal =
                            order.appendedOrders?.reduce(
                              (sum, a) => sum + (a.isPaid ? 0 : getOrderTotal(a.items)),
                              0,
                            ) || 0
                          const unpaidTotal = unpaidMainTotal + unpaidAppendedTotal

                          const allPaid = mainOrderPaid && (!order.appendedOrders || order.appendedOrders.every((a) => a.isPaid))

                          if (allPaid) {
                            return (
                              <Badge variant="outline" className="font-bold text-sm text-emerald-700 border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5">
                                ₱{totalAmount.toFixed(2)}
                              </Badge>
                            )
                          }

                          // Only show overall payment buttons if main order is unpaid
                          // If main order is paid and only appended orders are unpaid, don't show (redundant)
                          if (unpaidTotal > 0 && canManagePayments && !mainOrderPaid) {
                            return (
                              <div className="flex gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAllAsPaid(order.id, "cash")
                                  }}
                                  size="sm"
                                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md transition-all"
                                >
                                  💵 ₱{unpaidTotal.toFixed(2)}
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAllAsPaid(order.id, "gcash")
                                  }}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md transition-all"
                                >
                                  Ⓖ ₱{unpaidTotal.toFixed(2)}
                                </Button>
                              </div>
                            )
                          }

                          return null
                        })()}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                        {/* Main Order Section - Hide section if all items are served AND user is crew only */}
                        {(isOrderTaker || order.items.some(item => item.status !== "served")) && (
                          <div className="bg-slate-50/80 p-5 border border-slate-200/80 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-slate-700">Main Order</p>
                              </div>
                              {canManagePayments && totalAppendedOrders > 0 && (
                                mainOrderPaid ? (
                                  <Badge variant="outline" className="border-2 border-slate-300 text-slate-700 bg-white px-3 py-1.5 text-xs font-bold flex items-center gap-2 shadow-sm">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    {order.paymentMethod?.toUpperCase() || 'N/A'}
                                  </Badge>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsPaid(order.id, 'cash')
                                      }}
                                      size="sm"
                                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md"
                                    >
                                      💵 ₱{getOrderTotal(order.items).toFixed(2)}
                                    </Button>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsPaid(order.id, 'gcash')
                                      }}
                                      size="sm"
                                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md"
                                    >
                                      Ⓖ ₱{getOrderTotal(order.items).toFixed(2)}
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="space-y-2.5">
                              {order.items.filter(item => isOrderTaker || item.status !== "served").map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                    <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                                    <Badge variant="outline" className="text-xs font-bold border-slate-300">
                                      x{item.quantity}
                                    </Badge>
                                    <Badge
                                      className={`text-xs font-bold px-2 py-0.5 ${
                                        item.itemType === "dine-in"
                                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                                          : "bg-orange-600 hover:bg-orange-700 text-white"
                                      }`}
                                    >
                                      {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(item.status)}`}>
                                      {getStatusIcon(item.status)}
                                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                    {getCrewDisplay(item, 'prepared') && (
                                      <span className="text-xs text-slate-600">
                                        Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                                      </span>
                                    )}
                                    {getCrewDisplay(item, 'served') && (
                                      <span className="text-xs text-slate-600">
                                        Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {item.status === "pending" && canDeleteOrders && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteItemFromOrder(order.id, item.id)
                                      }}
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {/* Crew can change: pending → preparing, preparing → ready */}
                                  {/* Order Taker can change: ready → served */}
                                  {((isCrew && (item.status === "pending" || item.status === "preparing")) ||
                                    (isOrderTaker && item.status === "ready")) && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        updateItemStatus(order.id, item.id, getNextStatus(item.status))
                                      }}
                                      size="sm"
                                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-4 py-2 shadow-sm hover:shadow-md whitespace-nowrap"
                                    >
                                      {getStatusButtonLabel(item.status)}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        )}

                        {/* Appended Orders Section */}
                        {totalAppendedOrders > 0 && (
                          <div className="bg-slate-50/80 p-5 border border-slate-200/80 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-slate-700">
                                  Appended Orders ({totalAppendedOrders})
                                </p>
                              </div>
                            </div>
                            <div className="space-y-4">
                            {order.appendedOrders!.map((appended, index) => (
                              // Hide appended order if all items are served AND user is crew only
                              (isOrderTaker || appended.items.some(item => item.status !== "served")) && (
                                <div
                                  key={appended.id}
                                  className="rounded-xl p-5 border-2 border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-white shadow-sm"
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">Appended #{index + 1}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">{formatTime(appended.createdAt)}</p>
                                  </div>
                                  {canManagePayments && (
                                    appended.isPaid ? (
                                      <Badge variant="outline" className="border-2 border-slate-300 text-slate-700 bg-white px-3 py-1.5 text-xs font-bold flex items-center gap-2 shadow-sm">
                                        <CreditCard className="w-3.5 h-3.5" />
                                        {appended.paymentMethod?.toUpperCase() || 'N/A'}
                                      </Badge>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            markAppendedAsPaid(order.id, appended.id, 'cash')
                                          }}
                                          size="sm"
                                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md"
                                        >
                                          💵 ₱{getOrderTotal(appended.items).toFixed(2)}
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            markAppendedAsPaid(order.id, appended.id, 'gcash')
                                          }}
                                          size="sm"
                                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md"
                                        >
                                          Ⓖ ₱{getOrderTotal(appended.items).toFixed(2)}
                                        </Button>
                                      </div>
                                    )
                                  )}
                                  </div>

                                  <div className="space-y-2.5 mb-4">
                                    {appended.items.filter(item => isOrderTaker || item.status !== "served").map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                          <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                                          <Badge variant="outline" className="text-xs font-bold border-slate-300">
                                            x{item.quantity}
                                          </Badge>
                                          <Badge
                                            className={`text-xs font-bold px-2 py-0.5 ${
                                              item.itemType === "dine-in"
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "bg-orange-600 hover:bg-orange-700 text-white"
                                            }`}
                                          >
                                            {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(item.status)}`}>
                                            {getStatusIcon(item.status)}
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                          </Badge>
                                          {getCrewDisplay(item, 'prepared') && (
                                            <span className="text-xs text-slate-600">
                                              Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                                            </span>
                                          )}
                                          {getCrewDisplay(item, 'served') && (
                                            <span className="text-xs text-slate-600">
                                              Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.status === "pending" && canDeleteOrders && (
                                          <Button
                                            onClick={(e) => {
                                              console.log('Appended item delete button clicked!')
                                              e.stopPropagation()
                                              deleteItemFromAppendedOrder(order.id, appended.id, item.id)
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                        {/* Crew can change: pending → preparing, preparing → ready */}
                                        {/* Order Taker can change: ready → served */}
                                        {((isCrew && (item.status === "pending" || item.status === "preparing")) ||
                                          (isOrderTaker && item.status === "ready")) && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              updateAppendedItemStatus(
                                                order.id,
                                                appended.id,
                                                item.id,
                                                getNextStatus(item.status),
                                              )
                                            }}
                                            size="sm"
                                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs px-3 py-2 shadow-sm hover:shadow-md whitespace-nowrap"
                                          >
                                            {getStatusButtonLabel(item.status)}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {canDeleteAppendedOrder(appended) && canDeleteOrders && (
                                  <Button
                                    onClick={() => deleteAppendedOrder(order.id, appended.id)}
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-semibold text-xs py-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Delete Appended Order
                                  </Button>
                                )}
                              </div>
                            )))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {canAppendItems && (
                          <div className="pt-4 px-2 flex gap-2 flex-wrap">
                            <Button
                              onClick={() => onAppendItems(order.id)}
                              className="flex-1 min-w-32 font-bold bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm hover:shadow-md"
                            >
                              <Plus className="w-4 h-4 mr-1.5" />
                              Append Items
                            </Button>
                            {canDeleteOrder(order) && canDeleteOrders && (
                              <Button
                                onClick={() => deleteOrder(order.id)}
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-semibold"
                              >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Delete Order
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

          {/* Served (Not Paid) */}
          {sortedServedNotPaidOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h2 className="text-base font-bold tracking-wide uppercase text-slate-800">Served (Not Paid)</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 to-transparent" />
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {sortedServedNotPaidOrders.length}
                </span>
              </div>
              <div className="space-y-3">
              {sortedServedNotPaidOrders.map((order) => {
                const { mainOrderPaid, appendedOrdersPaid, totalAppendedOrders } = getPaymentSummary(order)
                const isExpanded = expandedServed.has(order.id)
                return (
                  <Card
                    key={order.id}
                    className="group relative overflow-hidden bg-white border border-slate-200/80 shadow-sm transition-all duration-300 cursor-pointer"
                  >

                    <div onClick={() => toggleServedExpanded(order.id)} className="relative px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="flex items-center gap-3">
                            {order.orderNumber && (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm font-bold shadow-sm">
                                #{order.orderNumber}
                              </span>
                            )}
                            <h3 className="font-bold text-base text-slate-900 truncate">{order.customerName}</h3>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-600">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatTime(order.createdAt)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                            {totalAppendedOrders > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">+{totalAppendedOrders}</span>
                              </>
                            )}
                            {getOrderTakerDisplay(order) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-slate-500">Order by: {getOrderTakerDisplay(order)}</span>
                              </>
                            )}
                            {calculateOrderTime(order) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                                  <Clock className="w-3.5 h-3.5" />
                                  {calculateOrderTime(order)}
                                </span>
                              </>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Awaiting Payment
                          </span>
                        </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          const mainTotal = getOrderTotal(order.items)
                          const appendedTotal =
                            order.appendedOrders?.reduce((sum, a) => sum + getOrderTotal(a.items), 0) || 0
                          const totalAmount = mainTotal + appendedTotal

                          const unpaidMainTotal = mainOrderPaid ? 0 : mainTotal
                          const unpaidAppendedTotal =
                            order.appendedOrders?.reduce(
                              (sum, a) => sum + (a.isPaid ? 0 : getOrderTotal(a.items)),
                              0,
                            ) || 0
                          const unpaidTotal = unpaidMainTotal + unpaidAppendedTotal

                          const allPaid = mainOrderPaid && (!order.appendedOrders || order.appendedOrders.every((a) => a.isPaid))

                          if (allPaid) {
                            return (
                              <Badge variant="outline" className="font-bold text-sm text-emerald-700 border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5">
                                ₱{totalAmount.toFixed(2)}
                              </Badge>
                            )
                          }

                          // Show unpaid badge for all users (Order Taker, Order Taker + Crew, and Crew)
                          if (unpaidTotal > 0) {
                            return (
                              <Badge variant="outline" className="font-bold text-sm text-amber-700 border-2 border-amber-200 bg-amber-50 px-3 py-1.5">
                                ₱{unpaidTotal.toFixed(2)}
                              </Badge>
                            )
                          }

                          return null
                        })()}
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-5 border-t border-slate-200/80 pt-5">
                        {/* Main Order Section */}
                        <div className="bg-slate-50/80 p-5 border border-slate-200/80 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm font-bold uppercase tracking-wider text-slate-700">Main Order</p>
                            </div>
                            {canManagePayments && (
                              mainOrderPaid ? (
                                <Badge variant="outline" className="border-2 border-gray-400 text-gray-700 bg-gray-50 px-3 py-1.5 text-sm font-semibold flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  Paid: {order.paymentMethod?.toUpperCase() || 'N/A'}
                                </Badge>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsPaid(order.id, 'cash')
                                    }}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs"
                                  >
                                    💵 Cash ₱{getOrderTotal(order.items).toFixed(2)}
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsPaid(order.id, 'gcash')
                                    }}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                                  >
                                    Ⓖ GCash ₱{getOrderTotal(order.items).toFixed(2)}
                                  </Button>
                                </div>
                              )
                            )}
                          </div>

                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 bg-background p-3 rounded border border-border"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{item.name}</p>
                                    <Badge variant="outline" className="text-xs">
                                      x{item.quantity}
                                    </Badge>
                                    <Badge
                                      className={`text-xs font-bold ${
                                        item.itemType === "dine-in"
                                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                                          : "bg-orange-600 hover:bg-orange-700 text-white"
                                      }`}
                                    >
                                      {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge className={`${getStatusColor(item.status)}`}>
                                      <span className="mr-1">{getStatusIcon(item.status)}</span>
                                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                    {calculateItemPrepTime(item) && (
                                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Prep: {calculateItemPrepTime(item)}
                                      </span>
                                    )}
                                    {getCrewDisplay(item, 'prepared') && (
                                      <span className="text-xs text-slate-600">
                                        Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                                      </span>
                                    )}
                                    {getCrewDisplay(item, 'served') && (
                                      <span className="text-xs text-slate-600">
                                        Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Appended Orders Section */}
                        {totalAppendedOrders > 0 && (
                          <div className="bg-slate-50/80 p-5 border border-slate-200/80 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-slate-700">
                                  Appended Orders ({totalAppendedOrders})
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                            {order.appendedOrders!.map((appended, index) => (
                              <div
                                key={appended.id}
                                className="rounded-lg p-4 border-2 border-border bg-muted/30"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-sm font-semibold">Appended #{index + 1}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{formatTime(appended.createdAt)}</p>
                                  </div>
                                  {canManagePayments && (
                                    appended.isPaid ? (
                                      <Badge variant="outline" className="border-2 border-gray-400 text-gray-700 bg-gray-50 px-3 py-1.5 text-sm font-semibold flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        Paid: {appended.paymentMethod?.toUpperCase() || 'N/A'}
                                      </Badge>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            markAppendedAsPaid(order.id, appended.id, 'cash')
                                          }}
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs"
                                        >
                                          💵 Cash ₱{getOrderTotal(appended.items).toFixed(2)}
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            markAppendedAsPaid(order.id, appended.id, 'gcash')
                                          }}
                                          size="sm"
                                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                                        >
                                          Ⓖ GCash ₱{getOrderTotal(appended.items).toFixed(2)}
                                        </Button>
                                      </div>
                                    )
                                  )}
                                </div>

                                <div className="space-y-2">
                                  {appended.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between gap-3 bg-background p-2 rounded border border-border"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-sm">{item.name}</p>
                                          <Badge variant="outline" className="text-xs">
                                            x{item.quantity}
                                          </Badge>
                                          <Badge
                                            className={`text-xs font-bold ${
                                              item.itemType === "dine-in"
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "bg-orange-600 hover:bg-orange-700 text-white"
                                            }`}
                                          >
                                            {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                                            <span className="mr-1">{getStatusIcon(item.status)}</span>
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                          </Badge>
                                          {calculateItemPrepTime(item) && (
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              Prep: {calculateItemPrepTime(item)}
                                            </span>
                                          )}
                                          {getCrewDisplay(item, 'prepared') && (
                                            <span className="text-xs text-slate-600">
                                              Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                                            </span>
                                          )}
                                          {getCrewDisplay(item, 'served') && (
                                            <span className="text-xs text-slate-600">
                                              Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {canAppendItems && (
                          <div className="pt-4 px-2 flex gap-2">
                            <Button
                              onClick={() => onAppendItems(order.id)}
                              className="flex-1 min-w-32 font-bold bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm hover:shadow-md"
                            >
                              <Plus className="w-4 h-4 mr-1.5" />
                              Append Items
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h2 className="text-base font-bold tracking-wide uppercase text-slate-800">Completed Orders</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 to-transparent" />
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {completedOrders.length}
                </span>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-400 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    <div
                      onClick={() => setExpandedCompleted(expandedCompleted === order.id ? null : order.id)}
                      className="relative cursor-pointer p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3">
                          {order.orderNumber && (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-sm">
                              #{order.orderNumber}
                            </span>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-slate-900">{order.customerName}</p>
                            {calculateOrderTime(order) && (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {calculateOrderTime(order)}
                              </span>
                            )}
                            {getOrderTakerDisplay(order) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs font-medium text-slate-500">Order by: {getOrderTakerDisplay(order)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                            expandedCompleted === order.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                  {expandedCompleted === order.id && (
                    <div className="mt-3 border-t border-border pt-3 px-4 pb-4 space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            <span>
                              {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
                            </span>
                            <Badge
                              className={`text-xs font-bold px-2 py-0.5 rounded-md border shadow-sm ${
                                item.itemType === "dine-in"
                                  ? "bg-blue-600 border-blue-700 text-white"
                                  : "bg-orange-600 border-orange-700 text-white"
                              }`}
                            >
                              {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                            </Badge>
                            {order.paymentMethod && (
                              <Badge
                                className={`text-xs font-bold px-2 py-0.5 rounded-md border shadow-sm ${
                                  order.paymentMethod === "cash"
                                    ? "bg-emerald-600 border-emerald-700 text-white"
                                    : "bg-blue-500 border-blue-600 text-white"
                                }`}
                              >
                                {order.paymentMethod === "cash" ? "💵 Cash" : "Ⓖ GCash"}
                              </Badge>
                            )}
                            {calculateItemPrepTime(item) && (
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Prep: {calculateItemPrepTime(item)}
                              </span>
                            )}
                            {getCrewDisplay(item, 'prepared') && (
                              <span className="text-xs text-slate-600">
                                Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                              </span>
                            )}
                            {getCrewDisplay(item, 'served') && (
                              <span className="text-xs text-slate-600">
                                Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                              </span>
                            )}
                          </div>
                          <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.appendedOrders && order.appendedOrders.length > 0 && (
                        <>
                          <div className="border-t border-border pt-2 mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Appended Orders:</p>
                            {order.appendedOrders.map((appended) => (
                              <div key={appended.id} className="mb-2">
                                {appended.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2 flex-wrap flex-1">
                                      <span>
                                        {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
                                      </span>
                                      <Badge
                                        className={`text-xs font-bold px-2 py-0.5 rounded-md border shadow-sm ${
                                          item.itemType === "dine-in"
                                            ? "bg-blue-600 border-blue-700 text-white"
                                            : "bg-orange-600 border-orange-700 text-white"
                                        }`}
                                      >
                                        {item.itemType === "dine-in" ? "🍽️ Dine In" : "🥡 Take Out"}
                                      </Badge>
                                      {appended.paymentMethod && (
                                        <Badge
                                          className={`text-xs font-bold px-2 py-0.5 rounded-md border shadow-sm ${
                                            appended.paymentMethod === "cash"
                                              ? "bg-emerald-600 border-emerald-700 text-white"
                                              : "bg-blue-500 border-blue-600 text-white"
                                          }`}
                                        >
                                          {appended.paymentMethod === "cash" ? "💵 Cash" : "Ⓖ GCash"}
                                        </Badge>
                                      )}
                                      {calculateItemPrepTime(item) && (
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Prep: {calculateItemPrepTime(item)}
                                        </span>
                                      )}
                                      {getCrewDisplay(item, 'prepared') && (
                                        <span className="text-xs text-slate-600">
                                          Prepared by: <span className="font-semibold">{getCrewDisplay(item, 'prepared')}</span>
                                        </span>
                                      )}
                                      {getCrewDisplay(item, 'served') && (
                                        <span className="text-xs text-slate-600">
                                          Served by: <span className="font-semibold">{getCrewDisplay(item, 'served')}</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="border-t border-slate-200/80 pt-3 mt-2">
                        {(() => {
                          const mainCash = order.paymentMethod === 'cash' ? getOrderTotal(order.items) : 0
                          const appendedCash = order.appendedOrders?.reduce((sum, appended) => {
                            return sum + (appended.paymentMethod === 'cash' ? getOrderTotal(appended.items) : 0)
                          }, 0) || 0
                          const totalCash = mainCash + appendedCash

                          const mainGcash = order.paymentMethod === 'gcash' ? getOrderTotal(order.items) : 0
                          const appendedGcash = order.appendedOrders?.reduce((sum, appended) => {
                            return sum + (appended.paymentMethod === 'gcash' ? getOrderTotal(appended.items) : 0)
                          }, 0) || 0
                          const totalGcash = mainGcash + appendedGcash

                          const orderTotal = getOrderTotal(order.items) +
                            (order.appendedOrders?.reduce((sum, appended) => sum + getOrderTotal(appended.items), 0) || 0)

                          const hasBothPaymentMethods = totalCash > 0 && totalGcash > 0

                          return (
                            <>
                              <div className="flex justify-between font-semibold text-sm mb-2">
                                <span className="flex items-center gap-1.5">
                                  Total:
                                  {!hasBothPaymentMethods && totalCash > 0 && (
                                    <Badge className="bg-emerald-600 border border-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">💵 Cash</Badge>
                                  )}
                                  {!hasBothPaymentMethods && totalGcash > 0 && (
                                    <Badge className="bg-blue-500 border border-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">Ⓖ GCash</Badge>
                                  )}
                                </span>
                                <span>₱{orderTotal.toFixed(2)}</span>
                              </div>
                              {/* Payment Breakdown - only show if both payment methods used */}
                              {hasBothPaymentMethods && (
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5">
                                      <Badge className="bg-emerald-600 border border-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">💵</Badge>
                                      <span className="font-semibold">Cash</span>
                                    </span>
                                    <span className="font-bold">₱{totalCash.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5">
                                      <Badge className="bg-blue-500 border border-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">Ⓖ</Badge>
                                      <span className="font-semibold">GCash</span>
                                    </span>
                                    <span className="font-bold">₱{totalGcash.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      {canAppendItems && (
                        <div className="pt-3 mt-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppendItems(order.id)
                            }}
                            size="sm"
                            className="w-full font-bold bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-sm hover:shadow-md"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Append Items
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
