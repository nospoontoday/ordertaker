"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Check, AlertCircle, Loader2 } from "lucide-react"
import { ordersApi, menuItemsApi, type Order, type OrderItem, type MenuItem } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useOrderEvents } from "@/contexts/websocket-context"
import { classifyCategory } from "@/lib/utils/category-classifier"

interface ItemInstance {
  name: string
  orderId: string
  orderNumber?: number
  customerName: string
  itemId: string
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
  itemType: "dine-in" | "take-out"
  note?: string
  createdAt: number
  preparingAt?: number
  readyAt?: number
  preparedBy?: string
  preparedByEmail?: string
  isAppended: boolean
  appendedOrderId?: string
}

interface GroupedItem {
  name: string
  category: string
  itemType: "food" | "drinks"
  totalQuantity: number
  status: "pending" | "preparing" | "ready"
  oldestCreatedAt: number
  instances: ItemInstance[]
}

type ItemStatus = "pending" | "preparing" | "ready" | "served"

export function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ordersData, menuItemsData] = await Promise.all([
        ordersApi.getAll(),
        menuItemsApi.getAll(),
      ])
      setOrders(ordersData)
      setMenuItems(menuItemsData)
      setIsOnline(true)
    } catch (error) {
      console.error("Error fetching data:", error)
      setIsOnline(false)
      toast({
        title: "Error",
        description: "Failed to load orders and menu items.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrderUpdated = (updatedOrder: any) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === updatedOrder.id
          ? {
              ...order,
              items: updatedOrder.items?.map((item: any) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                status: item.status || "pending",
                itemType: item.itemType || "dine-in",
                note: item.note,
                preparingAt: item.preparingAt,
                readyAt: item.readyAt,
                servedAt: item.servedAt,
                preparedBy: item.preparedBy,
                preparedByEmail: item.preparedByEmail,
                servedBy: item.servedBy,
                servedByEmail: item.servedByEmail,
              })) || order.items,
              appendedOrders: (updatedOrder.appendedOrders || []).map((appended: any) => ({
                id: appended.id,
                isPaid: appended.isPaid || false,
                paymentMethod: appended.paymentMethod,
                cashAmount: appended.cashAmount,
                gcashAmount: appended.gcashAmount,
                paidAmount: appended.paidAmount,
                createdAt: appended.createdAt,
                items: appended.items.map((item: any) => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity || 1,
                  status: item.status || "pending",
                  itemType: item.itemType || "dine-in",
                  note: item.note,
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
          : order
      )
    )
  }

  const handleOrderCreated = (newOrder: any) => {
    const transformedOrder: Order = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      isPaid: newOrder.isPaid || false,
      paymentMethod: newOrder.paymentMethod,
      cashAmount: newOrder.cashAmount,
      gcashAmount: newOrder.gcashAmount,
      paidAmount: newOrder.paidAmount,
      orderType: newOrder.orderType || "dine-in",
      createdAt: newOrder.createdAt,
      allItemsServedAt: newOrder.allItemsServedAt,
      orderTakerName: newOrder.orderTakerName,
      orderTakerEmail: newOrder.orderTakerEmail,
      totalAmount: newOrder.totalAmount,
      totalPaidAmount: newOrder.totalPaidAmount,
      pendingAmount: newOrder.pendingAmount,
      notes: newOrder.notes || [],
      items: newOrder.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        status: item.status || "pending",
        itemType: item.itemType || "dine-in",
        note: item.note,
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
        cashAmount: appended.cashAmount,
        gcashAmount: appended.gcashAmount,
        paidAmount: appended.paidAmount,
        createdAt: appended.createdAt,
        items: appended.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          status: item.status || "pending",
          itemType: item.itemType || "dine-in",
          note: item.note,
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

    setOrders((prevOrders) => {
      if (prevOrders.some((o) => o.id === transformedOrder.id)) {
        return prevOrders
      }
      return [...prevOrders, transformedOrder]
    })
  }

  useOrderEvents(handleOrderCreated, handleOrderUpdated)

  const menuItemMap = useMemo(() => {
    const map = new Map<string, MenuItem>()
    menuItems.forEach((item) => {
      map.set(item.name.toLowerCase().trim(), item)
    })
    return map
  }, [menuItems])

  // Group items by name and status for batch preparation
  const groupedItems = useMemo(() => {
    const allInstances: ItemInstance[] = []

    orders.forEach((order) => {
      order.items
        .filter((item) => item.status !== "served")
        .forEach((item) => {
          allInstances.push({
            name: item.name,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            itemId: item.id,
            quantity: item.quantity,
            status: item.status,
            itemType: item.itemType || "dine-in",
            note: item.note,
            createdAt: order.createdAt,
            preparingAt: item.preparingAt,
            readyAt: item.readyAt,
            preparedBy: item.preparedBy,
            preparedByEmail: item.preparedByEmail,
            isAppended: false,
          })
        })

      order.appendedOrders?.forEach((appended) => {
        appended.items
          .filter((item) => item.status !== "served")
          .forEach((item) => {
            allInstances.push({
              name: item.name,
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              itemId: item.id,
              quantity: item.quantity,
              status: item.status,
              itemType: item.itemType || "dine-in",
              note: item.note,
              createdAt: appended.createdAt,
              preparingAt: item.preparingAt,
              readyAt: item.readyAt,
              preparedBy: item.preparedBy,
              preparedByEmail: item.preparedByEmail,
              isAppended: true,
              appendedOrderId: appended.id,
            })
          })
      })
    })

    const grouped = new Map<string, GroupedItem>()

    allInstances.forEach((instance) => {
      const nameKey = instance.name.toLowerCase().trim()
      const groupKey = `${nameKey}-${instance.status}-${instance.itemType}`
      const menuItem = menuItemMap.get(nameKey)
      const category = menuItem?.category || "unknown"
      const itemType = classifyCategory(category)

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          name: instance.name,
          category,
          itemType,
          totalQuantity: 0,
          status: instance.status,
          oldestCreatedAt: instance.createdAt,
          instances: [],
        })
      }

      const group = grouped.get(groupKey)!
      group.totalQuantity += instance.quantity
      group.instances.push(instance)

      if (instance.createdAt < group.oldestCreatedAt) {
        group.oldestCreatedAt = instance.createdAt
      }
    })

    const statusPriority = { pending: 0, preparing: 1, ready: 2 }
    return Array.from(grouped.values()).sort((a, b) => {
      const statusDiff = statusPriority[a.status] - statusPriority[b.status]
      if (statusDiff !== 0) return statusDiff
      return a.oldestCreatedAt - b.oldestCreatedAt
    })
  }, [orders, menuItemMap])

  const foodItems = groupedItems.filter((item) => item.itemType === "food")
  const drinkItems = groupedItems.filter((item) => item.itemType === "drinks")

  const updateItemStatus = async (
    instance: ItemInstance,
    newStatus: ItemStatus
  ) => {
    if (!user) return

    const updatedItem: Partial<OrderItem> = { status: newStatus }

    if (newStatus === "preparing" && !instance.preparedBy && !instance.preparedByEmail) {
      updatedItem.preparedBy = user.name
      updatedItem.preparedByEmail = user.email
      updatedItem.preparingAt = Date.now()
    } else if (newStatus === "ready") {
      updatedItem.readyAt = Date.now()
    }

    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== instance.orderId) return order

        const updatedMainItems = order.items.map((item) =>
          !instance.isAppended && item.id === instance.itemId
            ? { ...item, ...updatedItem }
            : item
        )

        const updatedAppendedOrders = order.appendedOrders?.map((appended) =>
          instance.isAppended && appended.id === instance.appendedOrderId
            ? {
                ...appended,
                items: appended.items.map((item) =>
                  item.id === instance.itemId
                    ? { ...item, ...updatedItem }
                    : item
                ),
              }
            : appended
        )

        return {
          ...order,
          items: updatedMainItems,
          appendedOrders: updatedAppendedOrders,
        }
      })
    )

    try {
      if (instance.isAppended && instance.appendedOrderId) {
        await ordersApi.updateAppendedItemStatus(
          instance.orderId,
          instance.appendedOrderId,
          instance.itemId,
          newStatus,
          updatedItem
        )
      } else {
        await ordersApi.updateItemStatus(
          instance.orderId,
          instance.itemId,
          newStatus,
          updatedItem
        )
      }
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

  const updateGroupedItemStatus = async (
    groupedItem: GroupedItem,
    newStatus: ItemStatus
  ) => {
    const updatePromises = groupedItem.instances.map((instance) =>
      updateItemStatus(instance, newStatus)
    )
    await Promise.all(updatePromises)
  }

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 border-amber-200 text-amber-700"
      case "preparing":
        return "bg-orange-50 border-orange-200 text-orange-700"
      case "ready":
        return "bg-emerald-50 border-emerald-200 text-emerald-700"
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
      default:
        return null
    }
  }

  const getNextStatus = (current: ItemStatus): ItemStatus => {
    const statuses: ItemStatus[] = ["pending", "preparing", "ready", "served"]
    const currentIndex = statuses.indexOf(current)
    return statuses[(currentIndex + 1) % statuses.length]
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
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return `${seconds}s`
    }
  }

  const getWaitingTime = (createdAt: number): number => {
    const normalizedCreatedAt = createdAt < 10000000000 ? createdAt * 1000 : createdAt
    return currentTime - normalizedCreatedAt
  }

  const getUrgencyLevel = (waitingTime: number): "normal" | "urgent" | "critical" => {
    const minutes = Math.floor(waitingTime / 60000)
    if (minutes >= 15) return "critical"
    if (minutes >= 10) return "urgent"
    return "normal"
  }

  const renderItemGroup = (groupedItem: GroupedItem) => {
    const nextStatus = getNextStatus(groupedItem.status)
    const canUpdate = nextStatus !== "served"

    const waitingTime = groupedItem.status === "pending"
      ? getWaitingTime(groupedItem.oldestCreatedAt)
      : 0
    const urgencyLevel = groupedItem.status === "pending"
      ? getUrgencyLevel(waitingTime)
      : "normal"

    const getCardStyle = () => {
      if (groupedItem.status === "pending") {
        if (urgencyLevel === "critical") {
          return "border-red-600 border-4 bg-white shadow-2xl ring-4 ring-red-200 animate-pulse"
        } else if (urgencyLevel === "urgent") {
          return "border-orange-500 border-3 bg-white shadow-xl ring-2 ring-orange-200"
        }
        return "border-amber-400 border-2 bg-amber-50/30"
      }
      return "border-2 border-slate-300 bg-slate-50/50 opacity-90 hover:shadow-lg transition-shadow"
    }

    return (
      <Card
        key={`${groupedItem.name}-${groupedItem.status}-${groupedItem.instances[0]?.itemType}`}
        className={`p-4 sm:p-6 mb-4 sm:mb-6 ${getCardStyle()}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className={`text-xl sm:text-2xl font-bold ${
                groupedItem.status === "pending" && urgencyLevel === "critical"
                  ? "text-red-900"
                  : groupedItem.status === "pending" && urgencyLevel === "urgent"
                  ? "text-orange-900"
                  : "text-slate-900"
              }`}>
                {groupedItem.name}
              </h3>
              <Badge
                variant="outline"
                className="text-sm font-bold border-slate-300"
              >
                x{groupedItem.totalQuantity}
              </Badge>
              <Badge
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(
                  groupedItem.status
                )}`}
              >
                {getStatusIcon(groupedItem.status)}
                {groupedItem.status.charAt(0).toUpperCase() +
                  groupedItem.status.slice(1)}
              </Badge>
              {groupedItem.status === "pending" && waitingTime > 0 && (
                <Badge
                  className={`text-xs font-bold px-2.5 py-1 ${
                    urgencyLevel === "critical"
                      ? "bg-red-600 text-white"
                      : urgencyLevel === "urgent"
                      ? "bg-orange-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  ⏱️ Waiting: {formatDuration(waitingTime)}
                </Badge>
              )}
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Orders:
              </p>
              <div className="flex flex-wrap gap-2">
                {groupedItem.instances.map((instance, idx) => (
                  <div
                    key={`${instance.orderId}-${instance.itemId}-${idx}`}
                    className="flex items-center gap-2"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      #{instance.orderNumber || "N/A"} - {instance.customerName}
                      {instance.quantity > 1 && ` (x${instance.quantity})`}
                    </Badge>
                    <Badge
                      className={`text-xs font-bold px-2 py-0.5 ${
                        instance.itemType === "dine-in"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-orange-600 hover:bg-orange-700 text-white"
                      }`}
                    >
                      {instance.itemType === "dine-in" ? "Dine In" : "Take Out"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {groupedItem.instances.some((i) => i.note) && (
              <div className="mb-3 space-y-1">
                {groupedItem.instances
                  .filter((i) => i.note)
                  .map((instance, idx) => (
                    <div
                      key={`note-${instance.orderId}-${instance.itemId}-${idx}`}
                      className="bg-amber-50 border-l-4 border-amber-400 p-2 rounded-r"
                    >
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-0.5">
                        📝 Note (Order #{instance.orderNumber || "N/A"}):
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-amber-800">
                        {instance.note}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-1">
              {groupedItem.instances.some((i) => i.preparingAt) && (
                <div>
                  <span className="font-semibold">Preparing:</span>{" "}
                  {groupedItem.instances
                    .filter((i) => i.preparingAt)
                    .map((i) => formatTime(i.preparingAt!))
                    .join(", ")}
                </div>
              )}
              {groupedItem.instances.some((i) => i.readyAt) && (
                <div>
                  <span className="font-semibold">Ready:</span>{" "}
                  {groupedItem.instances
                    .filter((i) => i.readyAt)
                    .map((i) => formatTime(i.readyAt!))
                    .join(", ")}
                </div>
              )}
              {groupedItem.instances.some((i) => i.preparedBy) && (
                <div>
                  <span className="font-semibold">Prepared by:</span>{" "}
                  {groupedItem.instances
                    .filter((i) => i.preparedBy)
                    .map((i) => i.preparedBy)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(", ")}
                </div>
              )}
              <div>
                <span className="font-semibold">Added:</span>{" "}
                {formatTime(groupedItem.oldestCreatedAt)}
              </div>
            </div>
          </div>

          {canUpdate && (
            <Button
              onClick={() => updateGroupedItemStatus(groupedItem, nextStatus)}
              size="lg"
              className="flex-shrink-0 h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base font-bold min-w-[120px] sm:min-w-[140px] w-full sm:w-auto"
            >
              {nextStatus === "preparing"
                ? "Start Preparing"
                : nextStatus === "ready"
                ? "Mark Ready"
                : "Next"}
            </Button>
          )}
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Kitchen Display</h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-3">
          Batch preparation view - items grouped by type and sorted FIFO
        </p>
        <div className="bg-blue-600 text-white p-3 rounded-lg shadow-md mb-4 border-l-4 border-blue-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-xs sm:text-sm mb-1">⚠️ IMPORTANT: Work from Top to Bottom</p>
              <p className="text-xs opacity-90">
                Items are sorted by priority (Pending → Preparing → Ready) and FIFO order.
                Always start with the first item at the top. Older orders are at the top - work them first to keep customers happy!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-red-50 to-white border-red-300">
          <div className="text-xs sm:text-sm font-semibold text-red-700 uppercase tracking-wide">Pending</div>
          <div className="text-2xl sm:text-3xl font-bold text-red-900 mt-1">
            {groupedItems.filter(i => i.status === 'pending').length}
          </div>
          <div className="text-xs text-red-600 mt-1">
            {groupedItems.filter(i => i.status === 'pending').length > 0 && (
              <>
                Oldest: {formatDuration(getWaitingTime(
                  Math.min(...groupedItems.filter(i => i.status === 'pending')
                    .map(i => i.oldestCreatedAt))
                ))}
              </>
            )}
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-white border-orange-300">
          <div className="text-xs sm:text-sm font-semibold text-orange-700 uppercase tracking-wide">Preparing</div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1">
            {groupedItems.filter(i => i.status === 'preparing').length}
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {groupedItems.filter(i => i.status === 'preparing').reduce((sum, i) => sum + i.totalQuantity, 0)} items
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-300">
          <div className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase tracking-wide">Ready</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1">
            {groupedItems.filter(i => i.status === 'ready').length}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            {groupedItems.filter(i => i.status === 'ready').reduce((sum, i) => sum + i.totalQuantity, 0)} items
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white border-blue-300">
          <div className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Items</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">
            {groupedItems.reduce((sum, i) => sum + i.totalQuantity, 0)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {groupedItems.length} groups
          </div>
        </Card>
      </div>

      {groupedItems.some(item => item.status === 'pending' && getUrgencyLevel(getWaitingTime(item.oldestCreatedAt)) === 'critical') && (
        <div className="bg-red-600 text-white p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 flex items-center gap-3 animate-pulse shadow-lg">
          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm sm:text-lg">🚨 URGENT: Items waiting 15+ minutes!</p>
            <p className="text-xs sm:text-sm opacity-90">Prioritize red-bordered items immediately</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="food" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="food" className="text-sm sm:text-base">
            Food Items ({foodItems.length})
          </TabsTrigger>
          <TabsTrigger value="drinks" className="text-sm sm:text-base">
            Drink Items ({drinkItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="space-y-2">
          {foodItems.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <p className="text-slate-500">No food items to prepare</p>
            </Card>
          ) : (
            <div>{foodItems.map(renderItemGroup)}</div>
          )}
        </TabsContent>

        <TabsContent value="drinks" className="space-y-2">
          {drinkItems.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <p className="text-slate-500">No drink items to prepare</p>
            </Card>
          ) : (
            <div>{drinkItems.map(renderItemGroup)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
