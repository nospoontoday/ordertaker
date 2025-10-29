"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Minus, AlertCircle, Clock, Check, CreditCard, RefreshCw, Loader2 } from "lucide-react"
import { menuItemsApi, categoriesApi, ordersApi, type MenuItem as ApiMenuItem, type Category as ApiCategory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  status?: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
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
  customerName: string
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
  paymentMethod?: "cash" | "gcash" | null
  orderType?: "dine-in" | "take-out"
  appendedOrders?: AppendedOrder[]
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  image: string
  isBestSeller?: boolean
}

interface Category {
  id: string
  name: string
  image: string
}

// Fallback data if API is unavailable
const FALLBACK_CATEGORIES: Category[] = [
  { id: "coffee", name: "Coffee", image: "/coffee-cup.png" },
  { id: "food", name: "Food", image: "/food-plate.png" },
  { id: "pastry", name: "Pastry", image: "/pastry-dessert.jpg" },
]

const FALLBACK_MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Espresso",
    price: 3.5,
    category: "coffee",
    image: "/espresso-shot.png",
    isBestSeller: true,
  },
  {
    id: "2",
    name: "Cappuccino",
    price: 4.5,
    category: "coffee",
    image: "/frothy-cappuccino.png",
    isBestSeller: true,
  },
  { id: "3", name: "Latte", price: 4.5, category: "coffee", image: "/latte-art.png", isBestSeller: true },
  { id: "4", name: "Americano", price: 3.0, category: "coffee", image: "/americano-coffee.png" },
  { id: "5", name: "Macchiato", price: 4.0, category: "coffee", image: "/macchiato.jpg" },
  { id: "6", name: "Flat White", price: 4.5, category: "coffee", image: "/flat-white.jpg" },
  {
    id: "7",
    name: "Croissant",
    price: 3.5,
    category: "pastry",
    image: "/golden-croissant.png",
    isBestSeller: true,
  },
  { id: "8", name: "Muffin", price: 3.0, category: "pastry", image: "/blueberry-muffin.png", isBestSeller: true },
  { id: "9", name: "Sandwich", price: 7.5, category: "food", image: "/classic-sandwich.png", isBestSeller: true },
  { id: "10", name: "Salad", price: 8.0, category: "food", image: "/vibrant-mixed-salad.png" },
  { id: "11", name: "Pastry", price: 2.5, category: "pastry", image: "/assorted-pastries.png" },
  { id: "12", name: "Cookie", price: 2.0, category: "pastry", image: "/chocolate-chip-cookie.png" },
]

export function OrderTaker({
  appendingOrderId,
  onAppendComplete,
}: { appendingOrderId: string | null; onAppendComplete: () => void }) {
  const [customerName, setCustomerName] = useState("")
  const [orderType, setOrderType] = useState<"dine-in" | "take-out">("dine-in")
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [newItems, setNewItems] = useState<OrderItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isAppending, setIsAppending] = useState(false)
  const [appendingOrder, setAppendingOrder] = useState<Order | null>(null)
  const [todayDate, setTodayDate] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // API state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(FALLBACK_MENU_ITEMS)
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDailySales, setShowDailySales] = useState(false)
  const [allOrders, setAllOrders] = useState<Order[]>([])

  // Toast for notifications
  const { toast } = useToast()

  // Load menu data from API with fallback
  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    setIsLoadingData(true)
    try {
      const [itemsData, categoriesData] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
      ])

      // Transform API data to match component interface
      const transformedItems: MenuItem[] = itemsData.map((item) => ({
        id: item._id || item.id || "",
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image,
        isBestSeller: item.isBestSeller,
      }))

      const transformedCategories: Category[] = categoriesData.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: cat.image,
      }))

      setMenuItems(transformedItems)
      setCategories(transformedCategories)
      setIsOnline(true)

      // Cache the data in localStorage
      localStorage.setItem("cachedMenuItems", JSON.stringify(transformedItems))
      localStorage.setItem("cachedCategories", JSON.stringify(transformedCategories))
    } catch (error) {
      console.error("Error fetching menu data from API, using fallback:", error)
      setIsOnline(false)

      // Try to load from cache
      try {
        const cachedItems = localStorage.getItem("cachedMenuItems")
        const cachedCategories = localStorage.getItem("cachedCategories")

        if (cachedItems) {
          setMenuItems(JSON.parse(cachedItems))
        }
        if (cachedCategories) {
          setCategories(JSON.parse(cachedCategories))
        }
      } catch (cacheError) {
        console.error("Error loading cached data:", cacheError)
        // Fall back to hardcoded data (already set as initial state)
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  // Fetch all orders from API for daily sales
  const fetchAllOrders = async () => {
    try {
      const ordersData = await ordersApi.getAll()
      setAllOrders(ordersData)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  // Load orders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("orders")
    if (saved) {
      setOrders(JSON.parse(saved))
    }
    const today = new Date()
    setTodayDate(today.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }))

    // Fetch all orders for daily sales
    fetchAllOrders()
  }, [])

  useEffect(() => {
    if (appendingOrderId) {
      const saved = localStorage.getItem("orders")
      if (saved) {
        const allOrders = JSON.parse(saved)
        const orderToAppend = allOrders.find((o: Order) => o.id === appendingOrderId)
        if (orderToAppend) {
          setCustomerName(orderToAppend.customerName)
          setCurrentOrder([...orderToAppend.items])
          setAppendingOrder(orderToAppend)
          setNewItems([])
          setIsAppending(true)
        }
      }
    }
  }, [appendingOrderId])

  // Save orders to localStorage
  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders))
  }, [orders])

  const addItem = (menuItem: MenuItem) => {
    const targetArray = isAppending ? newItems : currentOrder
    const setTargetArray = isAppending ? setNewItems : setCurrentOrder

    const existingItem = targetArray.find((item) => item.id === menuItem.id)

    if (existingItem) {
      setTargetArray(
        targetArray.map((item) => (item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item)),
      )
    } else {
      setTargetArray([...targetArray, { ...menuItem, quantity: 1, itemType: "dine-in" }])
    }
  }

  const incrementQuantity = (itemId: string) => {
    setNewItems(newItems.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item)))
  }

  const decrementQuantity = (itemId: string) => {
    setNewItems(
      newItems
        .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const removeItem = (itemId: string) => {
    setNewItems(newItems.filter((item) => item.id !== itemId))
  }

  const submitOrder = async () => {
    if (!customerName.trim() || (isAppending ? newItems.length === 0 : currentOrder.length === 0)) return

    setIsSubmitting(true)

    try {
      if (isAppending && appendingOrderId) {
        // Append items to existing order
        const itemsToAppend = newItems.map((item) => ({ ...item, status: "pending" as const }))

        try {
          // Try to append via API
          await ordersApi.appendItems(appendingOrderId, itemsToAppend, Date.now(), false)

          toast({
            title: "Success!",
            description: "Items appended to order successfully.",
          })
        } catch (error) {
          console.error("Error appending items to API, using localStorage:", error)

          toast({
            title: "Offline Mode",
            description: "Items appended locally. Will sync when online.",
            variant: "default",
          })
        }

        // Update local state regardless (for offline mode)
        const newAppendedOrder: AppendedOrder = {
          id: `appended-${Date.now()}`,
          items: itemsToAppend,
          createdAt: Date.now(),
          isPaid: false,
        }

        setOrders(
          orders.map((order) =>
            order.id === appendingOrderId
              ? {
                  ...order,
                  appendedOrders: [...(order.appendedOrders || []), newAppendedOrder],
                }
              : order,
          ),
        )

        setIsAppending(false)
        setCustomerName("")
        setCurrentOrder([])
        setNewItems([])
        setAppendingOrder(null)
        onAppendComplete()
      } else {
        // Create new order
        const currentOrderType = orderType; // Capture current value before any state changes
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          customerName: customerName.trim(),
          items: currentOrder.map((item) => ({ ...item, status: "pending" as const })),
          createdAt: Date.now(),
          isPaid: false,
          orderType: currentOrderType,
          appendedOrders: [],
        }

        console.log('Creating order with type:', currentOrderType)

        try {
          // Try to save to API first
          await ordersApi.create({
            id: newOrder.id,
            customerName: newOrder.customerName,
            items: newOrder.items.map((item) => ({
              ...item,
              status: (item.status || "pending") as "pending" | "preparing" | "ready" | "served",
            })),
            createdAt: newOrder.createdAt,
            isPaid: newOrder.isPaid,
            orderType: newOrder.orderType || "dine-in",
            appendedOrders: [],
          })

          toast({
            title: "Order Submitted!",
            description: `Order for ${newOrder.customerName} has been created.`,
          })

          setIsOnline(true)
        } catch (error) {
          console.error("Error saving order to API, using localStorage:", error)

          toast({
            title: "Offline Mode",
            description: "Order saved locally. Will sync when online.",
            variant: "default",
          })

          setIsOnline(false)
        }

        // Update local state (for both online and offline)
        setOrders([newOrder, ...orders])

        // Reset form AFTER order is created
        setCustomerName("")
        setCurrentOrder([])
        setOrderType("dine-in")
      }
    } catch (error) {
      console.error("Error submitting order:", error)

      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelAppend = () => {
    setIsAppending(false)
    setCustomerName("")
    setCurrentOrder([])
    setNewItems([])
    setAppendingOrder(null)
    onAppendComplete()
  }

  const getStatusColor = (status?: string) => {
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

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="w-3 h-3" />
      case "preparing":
        return <Clock className="w-3 h-3" />
      case "ready":
        return <Check className="w-3 h-3" />
      case "served":
        return <Check className="w-3 h-3" />
      default:
        return null
    }
  }

  const getDisplayedItems = () => {
    if (selectedCategory) {
      return menuItems.filter((item) => item.category === selectedCategory)
    }
    return menuItems.filter((item) => item.isBestSeller)
  }

  // Calculate daily sales from completed orders (fully paid)
  const calculateDailySales = () => {
    const today = new Date().setHours(0, 0, 0, 0)
    const completedOrders = allOrders.filter((order) => {
      const orderDate = new Date(order.createdAt).setHours(0, 0, 0, 0)
      const isToday = orderDate === today

      // Check if main order is paid
      const mainOrderPaid = order.isPaid === true && order.paymentMethod

      // Check if all appended orders are paid (or no appended orders)
      const allAppendedPaid = !order.appendedOrders ||
        order.appendedOrders.length === 0 ||
        order.appendedOrders.every((appended) => appended.isPaid === true && appended.paymentMethod)

      return isToday && mainOrderPaid && allAppendedPaid
    })

    let totalCash = 0
    let totalGcash = 0

    completedOrders.forEach((order) => {
      // Calculate main order total
      const mainTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      // Add to cash or gcash based on payment method
      if (order.isPaid && order.paymentMethod) {
        if (order.paymentMethod === "cash") {
          totalCash += mainTotal
        } else if (order.paymentMethod === "gcash") {
          totalGcash += mainTotal
        }
      }

      // Calculate appended orders totals
      if (order.appendedOrders) {
        order.appendedOrders.forEach((appended) => {
          const appendedTotal = appended.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          if (appended.isPaid && appended.paymentMethod) {
            if (appended.paymentMethod === "cash") {
              totalCash += appendedTotal
            } else if (appended.paymentMethod === "gcash") {
              totalGcash += appendedTotal
            }
          }
        })
      }
    })

    return {
      totalCash,
      totalGcash,
      totalSales: totalCash + totalGcash,
    }
  }

  const dailySales = calculateDailySales()

  const totalNewItems = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalExistingItems = currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalAll = totalNewItems + totalExistingItems
  const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
  const existingItemCount = currentOrder.reduce((sum, item) => sum + item.quantity, 0)
  const currentOrderTotal = isAppending ? totalAll : totalExistingItems

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Order Taker</h1>
              <p className="text-sm text-slate-500 font-medium">{todayDate}</p>
            </div>
            <div className="flex items-center gap-3">
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700">Offline</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!showDailySales) {
                    fetchAllOrders() // Refresh orders when showing
                  }
                  setShowDailySales(!showDailySales)
                }}
                className="gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <CreditCard className="h-4 w-4" />
                {showDailySales ? "Hide" : "Show"} Daily Sales
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMenuData}
                disabled={isLoadingData}
                className="gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingData ? "animate-spin" : ""}`} />
                Refresh Menu
              </Button>
            </div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

      {/* Daily Sales Stats */}
      {showDailySales && (
        <Card className="mb-6 p-5 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 border border-slate-200/80 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <CreditCard className="w-5 h-5" />
            Daily Sales Summary
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Sales</div>
              <div className="text-2xl font-bold text-slate-900">₱{dailySales.totalSales.toFixed(2)}</div>
            </div>
            {dailySales.totalCash > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
                <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                  <Badge className="bg-emerald-600 border border-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">💵</Badge>
                  Cash
                </div>
                <div className="text-2xl font-bold text-emerald-600">₱{dailySales.totalCash.toFixed(2)}</div>
              </div>
            )}
            {dailySales.totalGcash > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
                <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                  <Badge className="bg-blue-500 border border-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">Ⓖ</Badge>
                  GCash
                </div>
                <div className="text-2xl font-bold text-blue-500">₱{dailySales.totalGcash.toFixed(2)}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6 text-slate-900">Menu</h2>

          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-24">
              <RefreshCw className="h-10 w-10 animate-spin text-slate-400 mb-4" />
              <p className="text-base font-medium text-slate-500">Loading menu...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Categories</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {/* Best Sellers button */}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all flex-shrink-0 border shadow-sm ${
                      selectedCategory === null
                        ? "bg-blue-600 text-white border-blue-700 shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl ${selectedCategory === null ? "bg-blue-700/30" : "bg-slate-100"}`}>⭐</div>
                    <span className={`text-xs font-bold text-center ${selectedCategory === null ? "text-white" : "text-slate-700"}`}>Best Sellers</span>
                  </button>

                  {/* Category buttons */}
                  {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all flex-shrink-0 border shadow-sm ${
                    selectedCategory === category.id
                      ? "bg-blue-600 text-white border-blue-700 shadow-md"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    className={`w-16 h-16 rounded-lg object-cover ${selectedCategory === category.id ? "ring-2 ring-blue-300" : ""}`}
                  />
                  <span className={`text-xs font-bold text-center ${selectedCategory === category.id ? "text-white" : "text-slate-700"}`}>{category.name}</span>
                </button>
              ))}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {getDisplayedItems().map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="flex flex-col items-center justify-start gap-2.5 p-4 rounded-lg bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all h-full"
              >
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                {item.isBestSeller && <Badge className="bg-amber-500 border border-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">Best Seller</Badge>}
                <span className="text-sm font-semibold text-center text-slate-900">{item.name}</span>
                <span className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</span>
              </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className={`p-5 sticky top-4 bg-white border border-slate-200/80 shadow-sm ${isAppending ? "border-2 border-blue-300 bg-blue-50/30" : ""}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900">{isAppending ? "Append Items" : "Current Order"}</h3>
              {isAppending && (
                <span className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm">
                  Appending
                </span>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-700 mb-2">Customer Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter name"
                className="w-full border-slate-200 focus:border-slate-400"
                disabled={isAppending}
              />
            </div>


            {isAppending && appendingOrder && (
              <div className="mb-5 pb-5 border-b border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Existing Items</p>
                  {appendingOrder.isPaid && (
                    <Badge className="bg-emerald-600 border border-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Paid
                    </Badge>
                  )}
                </div>
                <div className="space-y-2.5 max-h-40 overflow-y-auto">
                  {currentOrder.map((item) => (
                    <div key={item.id} className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <Badge variant="outline" className="text-xs font-bold border-slate-300">x{item.quantity}</Badge>
                      </div>
                      {item.status && (
                        <Badge className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAppending && (
              <div className="mb-5">
                <p className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">New Items to Add</p>
                {newItems.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium">No new items added</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {newItems.map((item) => (
                      <div key={item.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/60 gap-2">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                            <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => decrementQuantity(item.id)}
                              className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4 text-red-600" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                            <button
                              onClick={() => incrementQuantity(item.id)}
                              className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200"
                              aria-label="Remove item"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              const updated = newItems.map((i) =>
                                i.id === item.id ? { ...i, itemType: "dine-in" as const } : i
                              )
                              setNewItems(updated)
                            }}
                            className={`flex-1 px-2.5 py-1.5 text-xs rounded-md font-bold transition-all shadow-sm ${
                              item.itemType === "dine-in"
                                ? "bg-blue-600 border border-blue-700 text-white shadow-md"
                                : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            🍽️ Dine In
                          </button>
                          <button
                            onClick={() => {
                              const updated = newItems.map((i) =>
                                i.id === item.id ? { ...i, itemType: "take-out" as const } : i
                              )
                              setNewItems(updated)
                            }}
                            className={`flex-1 px-2.5 py-1.5 text-xs rounded-md font-bold transition-all shadow-sm ${
                              item.itemType === "take-out"
                                ? "bg-orange-600 border border-orange-700 text-white shadow-md"
                                : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            🥡 Take Out
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isAppending && (
              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                {currentOrder.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium">No items added</p>
                ) : (
                  currentOrder.map((item) => (
                    <div key={item.id} className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 gap-2">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                          <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            const updated = currentOrder.map((i) =>
                              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
                            )
                            setCurrentOrder(updated)
                          }}
                          className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4 text-emerald-600" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const updated = currentOrder
                              .map((i) => (i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                              .filter((i) => i.quantity > 0)
                            setCurrentOrder(updated)
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4 text-red-600" />
                        </button>
                        <button
                          onClick={() => {
                            const updated = currentOrder.filter((i) => i.id !== item.id)
                            setCurrentOrder(updated)
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200"
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const updated = currentOrder.map((i) =>
                              i.id === item.id ? { ...i, itemType: "dine-in" as const } : i
                            )
                            setCurrentOrder(updated)
                          }}
                          className={`flex-1 px-2.5 py-1.5 text-xs rounded-md font-bold transition-all shadow-sm ${
                            item.itemType === "dine-in"
                              ? "bg-blue-600 border border-blue-700 text-white shadow-md"
                              : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          🍽️ Dine In
                        </button>
                        <button
                          onClick={() => {
                            const updated = currentOrder.map((i) =>
                              i.id === item.id ? { ...i, itemType: "take-out" as const } : i
                            )
                            setCurrentOrder(updated)
                          }}
                          className={`flex-1 px-2.5 py-1.5 text-xs rounded-md font-bold transition-all shadow-sm ${
                            item.itemType === "take-out"
                              ? "bg-orange-600 border border-orange-700 text-white shadow-md"
                              : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          🥡 Take Out
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="border-t border-slate-200/80 pt-4 mb-5">
              {isAppending ? (
                <>
                  <div className="flex justify-between items-center mb-2.5 text-sm">
                    <span className="text-slate-600 font-medium">Existing:</span>
                    <span className="font-bold text-slate-900">₱{totalExistingItems.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2.5 text-sm">
                    <span className="text-slate-600 font-medium">New Items:</span>
                    <span className="font-bold text-slate-900">₱{totalNewItems.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-slate-900">New Total:</span>
                    <span className="text-xl font-bold text-slate-900">₱{totalAll.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Existing: {existingItemCount} items • New: {newItemCount} items
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-slate-900">Total:</span>
                    <span className="text-xl font-bold text-slate-900">₱{currentOrderTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Items: {existingItemCount}</div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitOrder}
                disabled={!customerName.trim() || (isAppending ? newItems.length === 0 : currentOrder.length === 0) || isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold h-12 shadow-sm hover:shadow-md transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  isAppending ? "Update Order" : "Submit Order"
                )}
              </Button>
              {isAppending && (
                <Button onClick={cancelAppend} variant="outline" className="flex-1 border-slate-300 hover:border-slate-400 hover:bg-slate-50 font-semibold" disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
