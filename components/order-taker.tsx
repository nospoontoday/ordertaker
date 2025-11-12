"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Minus, AlertCircle, Clock, Check, CreditCard, RefreshCw, Loader2, DollarSign, Calendar, TrendingUp } from "lucide-react"
import { menuItemsApi, categoriesApi, ordersApi, withdrawalsApi, getImageUrl, type MenuItem as ApiMenuItem, type Category as ApiCategory, type Withdrawal } from "@/lib/api"
import { orderDB } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { WithdrawalDialog } from "@/components/withdrawal-dialog"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  status?: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
  note?: string
}

interface AppendedOrder {
  id: string
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
  paymentMethod?: "cash" | "gcash" | "split" | null
  cashAmount?: number
  gcashAmount?: number
}

interface OrderNote {
  id: string
  content: string
  createdAt: number
  createdBy?: string
  createdByEmail?: string
}

interface Order {
  id: string
  customerName: string
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
  paymentMethod?: "cash" | "gcash" | "split" | null
  cashAmount?: number
  gcashAmount?: number
  orderType?: "dine-in" | "take-out"
  appendedOrders?: AppendedOrder[]
  notes?: OrderNote[]
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
  const [orderNote, setOrderNote] = useState("")
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
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)

  // Toast for notifications
  const { toast } = useToast()
  const { user } = useAuth()

  // Check if user can access withdrawal feature (all roles except crew)
  const canWithdraw = user?.role !== "crew"
  const isAdmin = user?.role === "super_admin"

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
      console.log('Fetching all orders for daily sales...')
      const ordersData = await ordersApi.getAll()
      console.log('Fetched orders:', {
        count: ordersData.length,
        paidCount: ordersData.filter(o => o.isPaid).length,
        orders: ordersData.slice(0, 5).map(o => ({
          id: o.id,
          customerName: o.customerName,
          isPaid: o.isPaid,
          paymentMethod: o.paymentMethod,
          createdAt: new Date(o.createdAt).toISOString()
        }))
      })
      setAllOrders(ordersData)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch orders for daily sales.",
        variant: "destructive",
      })
    }
  }

  // Fetch withdrawals for daily sales
  const fetchWithdrawals = async () => {
    try {
      const withdrawalsData = await withdrawalsApi.getAll()
      setWithdrawals(withdrawalsData)
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
    }
  }

  // Load orders from IndexedDB
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const cachedOrders = await orderDB.getAllOrders()
        setOrders(cachedOrders)
      } catch (error) {
        console.error("Failed to load orders from IndexedDB:", error)
      }
    }

    loadOrders()
    const today = new Date()
    setTodayDate(today.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }))

    // Fetch all orders for daily sales
    fetchAllOrders()
    // Fetch withdrawals for daily sales
    fetchWithdrawals()
  }, [])

  useEffect(() => {
    if (appendingOrderId) {
      const loadAppendingOrder = async () => {
        try {
          const orderToAppend = await orderDB.getOrder(appendingOrderId)
          if (orderToAppend) {
            setCustomerName(orderToAppend.customerName)
            setCurrentOrder([...orderToAppend.items])
            setAppendingOrder(orderToAppend)
            setNewItems([])
            setIsAppending(true)
          }
        } catch (error) {
          console.error("Failed to load appending order:", error)
        }
      }

      loadAppendingOrder()
    }
  }, [appendingOrderId])

  // Save orders to IndexedDB
  useEffect(() => {
    if (orders.length > 0) {
      orderDB.saveOrders(orders.map((order: Order) => ({ ...order, synced: false }))).catch(console.error)
    }
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
        const currentOrderNote = orderNote.trim(); // Capture current note value
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          customerName: customerName.trim(),
          items: currentOrder.map((item) => ({ ...item, status: "pending" as const })),
          createdAt: Date.now(),
          isPaid: false,
          orderType: currentOrderType,
          appendedOrders: [],
          notes: currentOrderNote ? [{
            id: `note-${Date.now()}`,
            content: currentOrderNote,
            createdAt: Date.now(),
            createdBy: user?.name,
            createdByEmail: user?.email,
          }] : [],
        }

        console.log('Creating order with type:', currentOrderType)
        console.log('Order items before submit:', newOrder.items)

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
            notes: newOrder.notes,
            orderTakerName: user?.name,
            orderTakerEmail: user?.email,
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
        setOrderNote("")
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
  // Operating hours: 8AM to 12AM (midnight) + 1 hour grace period (8AM today to 1AM tomorrow)
  const calculateDailySales = () => {
    const now = new Date()

    // Determine the business day range
    // Business day runs from 8AM to 1AM next day
    let businessDayStart: Date
    let businessDayEnd: Date

    // Business day logic:
    // - Operating hours: 8AM to 12AM (midnight) + grace period up to 1AM
    // - If before 8AM today: show previous business day (yesterday 8AM to today 1AM)
    // - If 8AM today or later: show today's business day (today 8AM to tomorrow 1AM)
    // - If before 1AM today: we're still in previous business day (yesterday 8AM to today 1AM)
    
    const currentHour = now.getHours()
    
    if (currentHour < 1) {
      // It's between midnight and 1am, we're still in yesterday's business day
      // Yesterday's business day: yesterday 8AM to today 1AM
      businessDayStart = new Date(now)
      businessDayStart.setDate(businessDayStart.getDate() - 1)
      businessDayStart.setHours(8, 0, 0, 0)

      businessDayEnd = new Date(now)
      businessDayEnd.setHours(1, 0, 0, 0)
    } else if (currentHour < 8) {
      // It's between 1am and 8am, we're between business days
      // Show previous business day: yesterday 8AM to today 1AM
      businessDayStart = new Date(now)
      businessDayStart.setDate(businessDayStart.getDate() - 1)
      businessDayStart.setHours(8, 0, 0, 0)

      businessDayEnd = new Date(now)
      businessDayEnd.setHours(1, 0, 0, 0)
    } else {
      // It's 8AM or later, we're in today's business day
      // Today's business day: today 8AM to tomorrow 1AM
      businessDayStart = new Date(now)
      businessDayStart.setHours(8, 0, 0, 0)

      businessDayEnd = new Date(now)
      businessDayEnd.setDate(businessDayEnd.getDate() + 1)
      businessDayEnd.setHours(1, 0, 0, 0)
    }

    console.log('Daily Sales Calculation:', {
      currentTime: now.toISOString(),
      currentHour: now.getHours(),
      businessDayStart: businessDayStart.toISOString(),
      businessDayEnd: businessDayEnd.toISOString(),
      allOrdersCount: allOrders.length,
      paidOrdersCount: allOrders.filter(o => o.isPaid).length
    })

    // Debug all paid orders first
    const paidOrders = allOrders.filter(o => o.isPaid)
    console.log('All paid orders:', paidOrders.map(o => ({
      id: o.id,
      customerName: o.customerName,
      createdAt: typeof o.createdAt === 'number' ? new Date(o.createdAt).toISOString() : o.createdAt,
      createdAtValue: o.createdAt,
      isPaid: o.isPaid,
      paymentMethod: o.paymentMethod,
      appendedOrders: o.appendedOrders?.length || 0,
      appendedPaid: o.appendedOrders?.every(a => a.isPaid) || true
    })))

    const completedOrders = allOrders.filter((order) => {
      // Handle createdAt as either number (timestamp) or string
      let orderTime: number
      if (typeof order.createdAt === 'number') {
        orderTime = order.createdAt
      } else {
        orderTime = new Date(order.createdAt).getTime()
      }
      
      const isInBusinessDay = orderTime >= businessDayStart.getTime() && orderTime < businessDayEnd.getTime()
      
      // Check if main order is paid - only require isPaid to be true
      // paymentMethod can be null for legacy orders, but if isPaid is true, we should count it
      const mainOrderPaid = order.isPaid === true

      // Check if all appended orders are paid (or no appended orders)
      const allAppendedPaid = !order.appendedOrders ||
        order.appendedOrders.length === 0 ||
        order.appendedOrders.every((appended) => appended.isPaid === true)

      const isCompleted = isInBusinessDay && mainOrderPaid && allAppendedPaid

      // Debug why orders are excluded
      if (order.isPaid) {
        const orderDate = new Date(orderTime)
        if (!isInBusinessDay) {
          console.log('❌ Paid order OUTSIDE business day:', {
            id: order.id,
            customerName: order.customerName,
            orderTime: orderDate.toISOString(),
            orderTimeMs: orderTime,
            businessDayStart: businessDayStart.toISOString(),
            businessDayStartMs: businessDayStart.getTime(),
            businessDayEnd: businessDayEnd.toISOString(),
            businessDayEndMs: businessDayEnd.getTime(),
            beforeStart: orderTime < businessDayStart.getTime(),
            afterEnd: orderTime >= businessDayEnd.getTime(),
            diffFromStart: (orderTime - businessDayStart.getTime()) / (1000 * 60 * 60) + ' hours',
            diffFromEnd: (orderTime - businessDayEnd.getTime()) / (1000 * 60 * 60) + ' hours'
          })
        } else if (!allAppendedPaid) {
          console.log('❌ Paid order has unpaid appended orders:', {
            id: order.id,
            customerName: order.customerName,
            appendedOrders: order.appendedOrders?.map(a => ({ id: a.id, isPaid: a.isPaid }))
          })
        } else {
          console.log('✅ Completed order:', {
            id: order.id,
            customerName: order.customerName,
            createdAt: orderDate.toISOString(),
            isPaid: order.isPaid,
            paymentMethod: order.paymentMethod,
            total: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          })
        }
      }

      return isCompleted
    })

    console.log('✅ Completed orders count:', completedOrders.length)

    let totalCash = 0
    let totalGcash = 0

    completedOrders.forEach((order) => {
      // Calculate main order total
      const mainTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      // Add to cash or gcash based on payment method
      if (order.isPaid) {
        if (order.paymentMethod === "cash") {
          totalCash += mainTotal
        } else if (order.paymentMethod === "gcash") {
          totalGcash += mainTotal
        } else if (order.paymentMethod === "split") {
          // For split payments, use the actual split amounts
          totalCash += order.cashAmount || 0
          totalGcash += order.gcashAmount || 0
        } else {
          // If order is paid but no paymentMethod is set, treat as cash (legacy orders)
          totalCash += mainTotal
        }
      }

      // Calculate appended orders totals
      if (order.appendedOrders) {
        order.appendedOrders.forEach((appended) => {
          const appendedTotal = appended.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          if (appended.isPaid) {
            if (appended.paymentMethod === "cash") {
              totalCash += appendedTotal
            } else if (appended.paymentMethod === "gcash") {
              totalGcash += appendedTotal
            } else if (appended.paymentMethod === "split") {
              // For split payments, use the actual split amounts
              totalCash += appended.cashAmount || 0
              totalGcash += appended.gcashAmount || 0
            } else {
              // If appended order is paid but no paymentMethod is set, treat as cash (legacy orders)
              totalCash += appendedTotal
            }
          }
        })
      }
    })

    // Calculate withdrawals/purchases for the business day
    let totalWithdrawals = 0
    let totalPurchases = 0
    
    withdrawals.forEach((withdrawal) => {
      // Handle createdAt as either number (timestamp) or string
      let withdrawalTime: number
      if (typeof withdrawal.createdAt === 'number') {
        withdrawalTime = withdrawal.createdAt
      } else {
        withdrawalTime = new Date(withdrawal.createdAt).getTime()
      }
      
      const isInBusinessDay = withdrawalTime >= businessDayStart.getTime() && withdrawalTime < businessDayEnd.getTime()
      
      if (isInBusinessDay) {
        if (withdrawal.type === 'withdrawal') {
          totalWithdrawals += withdrawal.amount
        } else if (withdrawal.type === 'purchase') {
          totalPurchases += withdrawal.amount
        }
      }
    })

    const totalDeductions = totalWithdrawals + totalPurchases
    const totalSales = totalCash + totalGcash
    const netSales = totalSales - totalDeductions

    console.log('Daily Sales Results:', {
      totalCash,
      totalGcash,
      totalSales,
      totalWithdrawals,
      totalPurchases,
      totalDeductions,
      netSales
    })

    return {
      totalCash,
      totalGcash,
      totalSales,
      totalWithdrawals,
      totalPurchases,
      totalDeductions,
      netSales,
    }
  }

  // Memoize daily sales calculation to avoid unnecessary recalculations
  const dailySales = useMemo(() => calculateDailySales(), [allOrders, withdrawals])

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
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {!isOnline && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700">Offline</span>
                </div>
              )}
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/historical-order'}
                    className="gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Daily Summary</span>
                    <span className="sm:hidden">Summary</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/monthly-report'}
                    className="gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Monthly Report</span>
                    <span className="sm:hidden">Monthly</span>
                  </Button>
                </>
              )}
              {canWithdraw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWithdrawalDialog(true)}
                  className="gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
                >
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Withdrawal / Purchase</span>
                  <span className="sm:hidden">Withdraw</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!showDailySales) {
                    fetchAllOrders() // Refresh orders when showing
                    fetchWithdrawals() // Refresh withdrawals when showing
                  }
                  setShowDailySales(!showDailySales)
                }}
                className="gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
              >
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{showDailySales ? "Hide" : "Show"} Daily Sales</span>
                <span className="sm:hidden">{showDailySales ? "Hide" : "Sales"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMenuData}
                disabled={isLoadingData}
                className="gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingData ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Menu</span>
                <span className="sm:hidden">Refresh</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200/80 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Sales</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">₱{dailySales.totalSales.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200/80 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <Badge className="bg-emerald-600 border border-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">💵</Badge>
                Cash
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">₱{dailySales.totalCash.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200/80 shadow-sm">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <Badge className="bg-blue-500 border border-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">Ⓖ</Badge>
                GCash
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-500">₱{dailySales.totalGcash.toFixed(2)}</div>
            </div>
          </div>
          
          {/* Withdrawals and Purchases */}
          {(dailySales.totalWithdrawals > 0 || dailySales.totalPurchases > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 pt-4 border-t border-slate-200/80">
              {dailySales.totalWithdrawals > 0 && (
                <div className="bg-white rounded-lg p-4 border border-red-200/80 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                    <Badge className="bg-red-600 border border-red-700 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">💰</Badge>
                    Withdrawals
                  </div>
                  <div className="text-2xl font-bold text-red-600">-₱{dailySales.totalWithdrawals.toFixed(2)}</div>
                </div>
              )}
              {dailySales.totalPurchases > 0 && (
                <div className="bg-white rounded-lg p-4 border border-orange-200/80 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                    <Badge className="bg-orange-500 border border-orange-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-sm">🛒</Badge>
                    Purchases
                  </div>
                  <div className="text-2xl font-bold text-orange-600">-₱{dailySales.totalPurchases.toFixed(2)}</div>
                </div>
              )}
              <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-md">
                <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-semibold">Total Deductions</div>
                <div className="text-2xl font-bold text-slate-900">-₱{dailySales.totalDeductions.toFixed(2)}</div>
              </div>
            </div>
          )}
          
          {/* Net Sales */}
          <div className="pt-4 border-t-2 border-slate-300">
            <div className="bg-gradient-to-r from-slate-100 to-white rounded-lg p-4 border-2 border-slate-300 shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Net Sales</div>
                <div className={`text-3xl font-bold ${dailySales.netSales >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₱{dailySales.netSales.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Total Sales - Total Deductions
              </div>
            </div>
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
                    src={getImageUrl(category.image) || "/placeholder.svg"}
                    alt={category.name}
                    className={`w-16 h-16 rounded-lg object-cover ${selectedCategory === category.id ? "ring-2 ring-blue-300" : ""}`}
                  />
                  <span className={`text-xs font-bold text-center ${selectedCategory === category.id ? "text-white" : "text-slate-700"}`}>{category.name}</span>
                </button>
              ))}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {getDisplayedItems().map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="flex flex-col items-center justify-start gap-2.5 p-4 rounded-lg bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all h-full"
              >
                <img
                  src={getImageUrl(item.image) || "/placeholder.svg"}
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
          <Card className={`p-4 sm:p-5 sticky top-4 bg-white border border-slate-200/80 shadow-sm ${isAppending ? "border-2 border-blue-300 bg-blue-50/30" : ""}`}>
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

            {!isAppending && (
              <div className="mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-2">Note (Optional)</label>
                <Input
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Add a note for this order"
                  className="w-full border-slate-200 focus:border-slate-400"
                />
              </div>
            )}

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
                        <div className="mt-2">
                          <Input
                            value={item.note || ""}
                            onChange={(e) => {
                              const updated = newItems.map((i) =>
                                i.id === item.id ? { ...i, note: e.target.value } : i
                              )
                              setNewItems(updated)
                            }}
                            placeholder="Add note (optional)"
                            className="w-full text-xs border-slate-200 focus:border-slate-400"
                          />
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
                      <div className="mt-2">
                        <Input
                          value={item.note || ""}
                          onChange={(e) => {
                            const updated = currentOrder.map((i) =>
                              i.id === item.id ? { ...i, note: e.target.value } : i
                            )
                            setCurrentOrder(updated)
                          }}
                          placeholder="Add note (optional)"
                          className="w-full text-xs border-slate-200 focus:border-slate-400"
                        />
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

      {/* Withdrawal Dialog */}
      <WithdrawalDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        onSuccess={() => {
          fetchWithdrawals()
          toast({
            title: "Success!",
            description: "Withdrawal/Purchase recorded successfully.",
          })
        }}
      />
    </div>
  )
}
