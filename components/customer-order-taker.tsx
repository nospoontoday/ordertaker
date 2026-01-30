"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Minus, Clock, ShoppingCart, Search, Coffee, Loader2, QrCode, Banknote, CheckCircle2, Users, RefreshCw, ChefHat, MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { menuItemsApi, categoriesApi, ordersApi, getImageUrl, type Order as ApiOrder } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { generateUniqueShortCode, formatOrderCode } from "@/lib/order-code-generator"
import { DEFAULT_BRANCH } from "@/lib/branches"

// Customer session interface for tracking order codes
interface CustomerSession {
  codes: string[]  // Order codes (e.g., ["A7K", "B3M"])
  lastUpdated: number
}

// Constants
const CUSTOMER_SESSION_KEY = "customerOrderSession"
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// Helper functions for customer session management
function loadCustomerSession(): CustomerSession {
  if (typeof window === 'undefined') return { codes: [], lastUpdated: Date.now() }
  
  try {
    const stored = localStorage.getItem(CUSTOMER_SESSION_KEY)
    if (stored) {
      const session: CustomerSession = JSON.parse(stored)
      // Check if session is still valid (within 24 hours)
      if (Date.now() - session.lastUpdated < SESSION_EXPIRY_MS) {
        return session
      }
    }
  } catch (error) {
    console.error('Error loading customer session:', error)
  }
  return { codes: [], lastUpdated: Date.now() }
}

function saveCustomerSession(session: CustomerSession): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify({
      ...session,
      lastUpdated: Date.now()
    }))
  } catch (error) {
    console.error('Error saving customer session:', error)
  }
}

function addCodeToSession(code: string): void {
  const session = loadCustomerSession()
  if (!session.codes.includes(code.toUpperCase())) {
    session.codes.push(code.toUpperCase())
    saveCustomerSession(session)
  }
}

interface OrderItem {
  id: string
  name: string
  owner?: "john" | "elwin"
  category?: string
  price: number
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
  note?: string
}

export interface MenuItem {
  id: string
  name: string
  owner?: "john" | "elwin"
  price: number
  category: string
  image: string
  onlineImage?: string  // Image shown to online customers
  isBestSeller?: boolean
  isPublic?: boolean    // If true, visible to online customers
}

export interface Category {
  id: string
  name: string
  image: string
  isPublic?: boolean    // If true, visible to online customers
}

// Fallback data if API is unavailable (shown only when API fails)
// Note: These are marked as public for fallback purposes
const FALLBACK_CATEGORIES: Category[] = [
  { id: "coffee", name: "Coffee", image: "/coffee-cup.png", isPublic: true },
  { id: "food", name: "Food", image: "/food-plate.png", isPublic: true },
  { id: "pastry", name: "Pastry", image: "/pastry-dessert.jpg", isPublic: true },
]

const FALLBACK_MENU_ITEMS: MenuItem[] = [
  { id: "1", name: "Espresso", owner: "john", price: 3.5, category: "coffee", image: "/espresso-shot.png", onlineImage: "/espresso-shot.png", isBestSeller: true, isPublic: true },
  { id: "2", name: "Cappuccino", owner: "john", price: 4.5, category: "coffee", image: "/frothy-cappuccino.png", onlineImage: "/frothy-cappuccino.png", isBestSeller: true, isPublic: true },
  { id: "3", name: "Latte", price: 4.5, category: "coffee", image: "/latte-art.png", onlineImage: "/latte-art.png", isBestSeller: true, isPublic: true },
  { id: "4", name: "Americano", price: 3.0, category: "coffee", image: "/americano-coffee.png", onlineImage: "/americano-coffee.png", isPublic: true },
  { id: "5", name: "Macchiato", price: 4.0, category: "coffee", image: "/macchiato.jpg", onlineImage: "/macchiato.jpg", isPublic: true },
  { id: "6", name: "Flat White", price: 4.5, category: "coffee", image: "/flat-white.jpg", onlineImage: "/flat-white.jpg", isPublic: true },
  { id: "7", name: "Croissant", owner: "john", price: 3.5, category: "pastry", image: "/golden-croissant.png", onlineImage: "/golden-croissant.png", isBestSeller: true, isPublic: true },
  { id: "8", name: "Muffin", price: 3.0, category: "pastry", image: "/blueberry-muffin.png", onlineImage: "/blueberry-muffin.png", isBestSeller: true, isPublic: true },
  { id: "9", name: "Sandwich", price: 7.5, category: "food", image: "/classic-sandwich.png", onlineImage: "/classic-sandwich.png", isBestSeller: true, isPublic: true },
  { id: "10", name: "Salad", price: 8.0, category: "food", image: "/vibrant-mixed-salad.png", onlineImage: "/vibrant-mixed-salad.png", isPublic: true },
  { id: "11", name: "Pastry", price: 2.5, category: "pastry", image: "/assorted-pastries.png", onlineImage: "/assorted-pastries.png", isPublic: true },
  { id: "12", name: "Cookie", price: 2.0, category: "pastry", image: "/chocolate-chip-cookie.png", onlineImage: "/chocolate-chip-cookie.png", isPublic: true },
]

export function CustomerOrderTaker() {
  const [customerName, setCustomerName] = useState("")
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Menu data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(FALLBACK_MENU_ITEMS)
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Kitchen queue state
  const [kitchenOrders, setKitchenOrders] = useState<ApiOrder[]>([])
  
  // Payment flow state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "gcash" | null>(null)
  const [orderCode, setOrderCode] = useState<string>("")
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  
  // Mobile sheet state
  const [showMobileSheet, setShowMobileSheet] = useState(false)
  
  // Customer session state (tracks their order codes)
  const [customerSession, setCustomerSession] = useState<CustomerSession>({ codes: [], lastUpdated: Date.now() })
  
  // Orders currently being prepared (for display component)
  const [preparingOrders, setPreparingOrders] = useState<ApiOrder[]>([])
  
  // Banner notification state
  const [showPreparingBanner, setShowPreparingBanner] = useState(false)
  const [preparingOrderCode, setPreparingOrderCode] = useState<string>("")
  
  // Order note state
  const [orderNote, setOrderNote] = useState("")
  
  // Item note expansion state (tracks which items have note input expanded)
  const [expandedNoteItems, setExpandedNoteItems] = useState<Set<string>>(new Set())
  
  const { toast } = useToast()

  // Load customer session from localStorage on mount
  useEffect(() => {
    const session = loadCustomerSession()
    setCustomerSession(session)
  }, [])

  // Load menu data from API
  useEffect(() => {
    fetchMenuData()
    fetchKitchenOrders()
    fetchPreparingOrders()
    
    // Refresh kitchen orders periodically
    const kitchenInterval = setInterval(fetchKitchenOrders, 30000)
    // Refresh preparing orders more frequently for real-time updates
    const preparingInterval = setInterval(fetchPreparingOrders, 10000)
    
    return () => {
      clearInterval(kitchenInterval)
      clearInterval(preparingInterval)
    }
  }, [])

  const fetchMenuData = async () => {
    setIsLoadingData(true)
    try {
      const [itemsData, categoriesData] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
      ])

      // Transform categories and filter to only show public ones
      const transformedCategories: Category[] = categoriesData
        .filter((cat) => cat.isPublic === true)  // Only public categories
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          image: cat.image,
          isPublic: cat.isPublic,
        }))

      // Get set of public category IDs for filtering items
      const publicCategoryIds = new Set(transformedCategories.map(cat => cat.id))

      // Transform items and filter:
      // - Item must be public (isPublic === true)
      // - Item must be in a public category
      const transformedItems: MenuItem[] = itemsData
        .filter((item) => item.isPublic === true && publicCategoryIds.has(item.category))
        .map((item) => ({
          id: item._id || item.id || "",
          name: item.name,
          owner: item.owner,
          price: item.price,
          category: item.category,
          image: item.image,
          onlineImage: item.onlineImage,  // Image for online customers
          isBestSeller: item.isBestSeller,
          isPublic: item.isPublic,
        }))

      setMenuItems(transformedItems.length > 0 ? transformedItems : FALLBACK_MENU_ITEMS)
      setCategories(transformedCategories.length > 0 ? transformedCategories : FALLBACK_CATEGORIES)
    } catch (error) {
      console.error("Error fetching menu data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchKitchenOrders = async () => {
    try {
      const ordersData = await ordersApi.getAll({ 
        branchId: DEFAULT_BRANCH.id,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      })
      
      // Filter to only show orders in the kitchen (not fully served, and not pending payment)
      const activeOrders = ordersData.filter(order => {
        if (order.orderSource === 'online' && order.onlinePaymentStatus === 'pending') {
          return false
        }
        const hasUnservedItems = order.items.some(item => item.status !== 'served')
        const hasUnservedAppendedItems = order.appendedOrders?.some(appended => 
          appended.items.some(item => item.status !== 'served')
        )
        return hasUnservedItems || hasUnservedAppendedItems
      })
      
      setKitchenOrders(activeOrders)
    } catch (error) {
      console.error("Error fetching kitchen orders:", error)
    }
  }

  // Fetch orders that are currently being prepared
  const fetchPreparingOrders = useCallback(async () => {
    try {
      const orders = await ordersApi.getPreparingOrders(DEFAULT_BRANCH.id)
      setPreparingOrders(orders)
      
      // Check if any of customer's orders are being prepared
      const session = loadCustomerSession()
      if (session.codes.length > 0) {
        const customerPreparingOrder = orders.find(order => {
          if (order.onlineOrderCode) {
            return session.codes.includes(order.onlineOrderCode.toUpperCase())
          }
          return false
        })
        
        if (customerPreparingOrder && customerPreparingOrder.onlineOrderCode) {
          // Show banner if not already showing for this order
          if (preparingOrderCode !== customerPreparingOrder.onlineOrderCode.toUpperCase()) {
            setPreparingOrderCode(customerPreparingOrder.onlineOrderCode.toUpperCase())
            setShowPreparingBanner(true)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching preparing orders:", error)
    }
  }, [preparingOrderCode])

  // Calculate order total
  const orderTotal = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [currentOrder])

  // Get total items in cart
  const totalItems = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.quantity, 0)
  }, [currentOrder])

  // Get item quantity in cart by name
  const getItemQuantityInCart = (itemName: string) => {
    return currentOrder
      .filter((item) => item.name === itemName)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  // Filter and group menu items
  const getDisplayedItems = () => {
    let items = menuItems

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(query))
    } else if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory)
    }

    return items
  }

  const getGroupedMenuItems = () => {
    const bestSellers = menuItems.filter((item) => item.isBestSeller)
    const drinks = menuItems.filter((item) => 
      item.category?.toLowerCase().includes('coffee') || 
      item.category?.toLowerCase().includes('drink') ||
      item.category?.toLowerCase().includes('tea') ||
      item.category?.toLowerCase().includes('beverage')
    )
    const food = menuItems.filter((item) => 
      !item.category?.toLowerCase().includes('coffee') && 
      !item.category?.toLowerCase().includes('drink') &&
      !item.category?.toLowerCase().includes('tea') &&
      !item.category?.toLowerCase().includes('beverage')
    )
    return { bestSellers, drinks, food }
  }

  // Add item to cart
  const addItem = (menuItem: MenuItem, itemType: "dine-in" | "take-out" = "dine-in") => {
    const existingItem = currentOrder.find(
      (item) => item.name === menuItem.name && item.itemType === itemType
    )

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.name === menuItem.name && item.itemType === itemType
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      const uniqueId = `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setCurrentOrder([
        ...currentOrder,
        {
          ...menuItem,
          id: uniqueId,
          quantity: 1,
          itemType,
          status: "pending",
        },
      ])
    }
  }

  // Update item quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCurrentOrder(
      currentOrder
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId))
    // Also remove from expanded notes
    setExpandedNoteItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(itemId)
      return newSet
    })
  }

  // Toggle note input for an item
  const toggleItemNote = (itemId: string) => {
    setExpandedNoteItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Update item note
  const updateItemNote = (itemId: string, note: string) => {
    setCurrentOrder(
      currentOrder.map((item) =>
        item.id === itemId ? { ...item, note } : item
      )
    )
  }

  // Clear cart
  const clearCart = () => {
    setCurrentOrder([])
    setCustomerName("")
    setOrderNote("")
    setExpandedNoteItems(new Set())
  }

  // Handle checkout
  const handleCheckout = async () => {
    if (currentOrder.length === 0) {
      toast({
        title: "Your cart is empty",
        description: "Please add some items to your order first.",
        variant: "destructive",
      })
      return
    }

    if (!customerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name for the order.",
        variant: "destructive",
      })
      return
    }

    try {
      // Fetch pending codes to ensure uniqueness
      const pendingCodes = await ordersApi.getPendingOnlineOrderCodes()
      const code = generateUniqueShortCode(pendingCodes)
      setOrderCode(code)
      setShowPaymentDialog(true)
      setSelectedPaymentMethod(null)
      setOrderSubmitted(false)
      setShowMobileSheet(false)
    } catch (error) {
      console.error("Error generating order code:", error)
      // Fallback to generating code without uniqueness check
      const code = generateUniqueShortCode([])
      setOrderCode(code)
      setShowPaymentDialog(true)
      setSelectedPaymentMethod(null)
      setOrderSubmitted(false)
      setShowMobileSheet(false)
    }
  }

  // Submit order
  const submitOrder = async () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please choose how you'd like to pay.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const orderId = `order-${Date.now()}`
      
      // Build order notes array if there's an order-level note
      const orderNotes = orderNote.trim() ? [{
        id: `note-${Date.now()}`,
        content: orderNote.trim(),
        createdAt: Date.now(),
        createdBy: customerName.trim(),
      }] : []

      await ordersApi.create({
        id: orderId,
        branchId: DEFAULT_BRANCH.id,
        customerName: customerName.trim(),
        items: currentOrder.map((item) => ({
          ...item,
          status: "pending" as const,
        })),
        createdAt: Date.now(),
        isPaid: false,
        orderType: currentOrder.some((item) => item.itemType === "take-out") ? "take-out" : "dine-in",
        orderSource: "online",
        onlineOrderCode: orderCode,
        onlinePaymentStatus: "pending",
        selectedPaymentMethod: selectedPaymentMethod,
        notes: orderNotes,
      } as any)

      // Save order code to customer session for tracking
      addCodeToSession(orderCode)
      setCustomerSession(loadCustomerSession())

      setOrderSubmitted(true)
      
      toast({
        title: "Order submitted!",
        description: `Your order code is ${formatOrderCode(orderCode)}. Please proceed to the cashier.`,
      })

      fetchKitchenOrders()
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

  // Start new order after submission
  const startNewOrder = () => {
    clearCart()
    setShowPaymentDialog(false)
    setOrderCode("")
    setOrderSubmitted(false)
    setSelectedPaymentMethod(null)
  }

  // Calculate kitchen queue stats
  const kitchenStats = useMemo(() => {
    return {
      ordersInQueue: kitchenOrders.length,
      estimatedWait: kitchenOrders.length * 5,
    }
  }, [kitchenOrders])

  // Render menu item card
  const renderMenuItem = (item: MenuItem) => (
    <div
      key={item.id}
      onClick={() => addItem(item, "dine-in")}
      className={cn(
        "group flex flex-col items-center gap-3 p-4 lg:p-5 rounded-xl bg-white cursor-pointer",
        "border-2 border-slate-200 hover:border-blue-400",
        "shadow-sm hover:shadow-lg",
        "transition-all duration-200",
        "min-h-[200px] lg:min-h-[220px]",
        "min-w-[140px] sm:min-w-0",
        "active:scale-95 active:shadow-md"
      )}
    >
      {/* Image Container with Best Seller Badge */}
      <div className="relative">
        <img
          src={item.onlineImage ? getImageUrl(item.onlineImage) : "/placeholder.svg"}
          alt={item.name}
          className="w-24 h-24 lg:w-20 lg:h-20 rounded-lg object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {/* Quantity Counter Badge (top-left) */}
        {getItemQuantityInCart(item.name) > 0 && (
          <Badge className="absolute -top-2 -left-2 bg-blue-600 border-2 border-white text-white text-xs font-bold px-2.5 py-1 shadow-lg rounded-full min-w-[28px] flex items-center justify-center">
            {getItemQuantityInCart(item.name)}
          </Badge>
        )}
        {item.isBestSeller && (
          <Badge className="absolute -top-2 -right-2 bg-amber-500 border border-amber-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-md">
            BEST
          </Badge>
        )}
      </div>

      {/* Item Details */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <span className="text-sm lg:text-sm font-semibold text-center text-slate-900 line-clamp-2 leading-tight">
          {item.name}
        </span>
        <span className="text-base lg:text-sm font-bold text-blue-600">
          ₱{item.price.toFixed(2)}
        </span>
      </div>

      {/* DINE IN / TAKE OUT Buttons */}
      <div className="flex gap-2 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation()
            addItem(item, "dine-in")
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                   bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                   text-white font-bold text-xs
                   transition-all active:scale-95 shadow-sm hover:shadow-md min-h-[44px]"
        >
          DINE IN
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            addItem(item, "take-out")
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                   bg-orange-600 hover:bg-orange-700 active:bg-orange-800
                   text-white font-bold text-xs
                   transition-all active:scale-95 shadow-sm hover:shadow-md min-h-[44px]"
        >
          TAKE OUT
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-32 lg:pb-8">
        {/* Preparation Banner - Shows when customer's order starts preparing */}
        {showPreparingBanner && preparingOrderCode && (
          <div className="mb-4 animate-in slide-in-from-top duration-500">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-lg">Your order {formatOrderCode(preparingOrderCode)} is being prepared!</p>
                  <p className="text-emerald-100 text-sm">You will be served soon</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreparingBanner(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Currently Being Prepared Component */}
        {preparingOrders.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-amber-900">Currently Being Prepared</h3>
              <Badge className="bg-amber-500 text-white border-0 text-xs">
                {preparingOrders.length} order{preparingOrders.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {preparingOrders.map((order) => {
                const orderCode = order.onlineOrderCode?.toUpperCase()
                const isCustomerOrder = orderCode && customerSession.codes.includes(orderCode)
                const displayCode = orderCode ? formatOrderCode(orderCode) : "Counter Order"
                
                return (
                  <div
                    key={order.id}
                    className={cn(
                      "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                      isCustomerOrder
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 animate-pulse ring-2 ring-emerald-300"
                        : orderCode
                          ? "bg-white text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                    )}
                  >
                    {displayCode}
                    {isCustomerOrder && (
                      <span className="ml-2 text-xs font-normal">(You)</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 shadow-lg">
                <Coffee className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Order Here</h1>
                <p className="text-sm text-slate-500 font-medium">Self-service ordering</p>
              </div>
            </div>
            
            {/* Kitchen Queue Status */}
            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-xl">
              <Users className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">
                {kitchenStats.ordersInQueue} orders in queue
              </span>
              {kitchenStats.ordersInQueue > 0 && (
                <>
                  <span className="text-slate-400">•</span>
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">~{kitchenStats.estimatedWait} min</span>
                </>
              )}
            </div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Menu</h2>

            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center py-24">
                <RefreshCw className="h-10 w-10 animate-spin text-slate-400 mb-4" />
                <p className="text-base font-medium text-slate-500">Loading menu...</p>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search menu items..."
                      className="w-full pl-12 pr-12 h-14 text-lg border-2 border-slate-200 focus:border-blue-500 rounded-xl shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="mt-2 text-sm text-slate-500 font-medium">
                      {getDisplayedItems().length} result{getDisplayedItems().length !== 1 ? 's' : ''} for "{searchQuery}"
                    </p>
                  )}
                </div>

                {/* Categories - Mobile Horizontal Scroll */}
                <div className={`mb-8 bg-gradient-to-br from-slate-100 to-slate-50 p-4 rounded-2xl border-2 border-slate-200 ${searchQuery ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Categories</h3>
                  </div>

                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {/* All Items */}
                      <button
                        onClick={() => {
                          setSelectedCategory(null)
                          setSearchQuery("")
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all flex-shrink-0",
                          "font-semibold text-sm whitespace-nowrap min-h-[44px] border",
                          selectedCategory === null && !searchQuery
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50 active:scale-95"
                        )}
                      >
                        <span className="text-lg">⭐</span>
                        <span>All Items</span>
                      </button>

                      {/* Category Buttons */}
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category.id)
                            setSearchQuery("")
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all flex-shrink-0",
                            "font-semibold text-sm whitespace-nowrap min-h-[44px] border",
                            selectedCategory === category.id && !searchQuery
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                              : "bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50 active:scale-95"
                          )}
                        >
                          <img
                            src={getImageUrl(category.image) || "/placeholder.svg"}
                            alt={category.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>{category.name}</span>
                        </button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {/* Menu Items */}
                {getDisplayedItems().length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-semibold text-slate-600 mb-2">No items found</p>
                    <p className="text-sm text-slate-500 mb-4">No menu items match "{searchQuery}"</p>
                    <Button variant="outline" onClick={() => setSearchQuery("")} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear search
                    </Button>
                  </div>
                ) : !selectedCategory && !searchQuery ? (
                  // Grouped view
                  <div className="space-y-8 pb-36 lg:pb-0">
                    {/* Drinks Section */}
                    {(() => {
                      const { drinks } = getGroupedMenuItems()
                      return drinks.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                            <h3 className="text-lg font-bold text-slate-900">Drinks</h3>
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-1">
                              {drinks.length} items
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                            {drinks.map(renderMenuItem)}
                          </div>
                        </div>
                      ) : null
                    })()}

                    {/* Food Section */}
                    {(() => {
                      const { food } = getGroupedMenuItems()
                      return food.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
                            <h3 className="text-lg font-bold text-slate-900">Food</h3>
                            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-1">
                              {food.length} items
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                            {food.map(renderMenuItem)}
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                ) : (
                  // Filtered view
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 pb-36 lg:pb-0">
                    {getDisplayedItems().map(renderMenuItem)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop Order Summary - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Your Order</h3>

              <div className="mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border-slate-200 focus:border-slate-400"
                />
              </div>

              {currentOrder.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Your cart is empty</p>
                  <p className="text-sm">Tap items to add them</p>
                </div>
              ) : (
                <div className="space-y-3 mb-5 max-h-[300px] overflow-y-auto">
                  {currentOrder.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold mt-1",
                            item.itemType === "dine-in" ? "border-blue-300 text-blue-700" : "border-orange-300 text-orange-700"
                          )}>
                            {item.itemType === "dine-in" ? "DINE IN" : "TAKE OUT"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Item Note */}
                      {expandedNoteItems.has(item.id) || item.note ? (
                        <div className="mt-2">
                          <Input
                            placeholder="Add note (e.g., less sugar, extra hot)..."
                            value={item.note || ""}
                            onChange={(e) => updateItemNote(item.id, e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleItemNote(item.id)}
                          className="mt-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Add note
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {currentOrder.length > 0 && (
                <div className="border-t pt-4 space-y-4">
                  {/* Order Note */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Special Instructions (Optional)
                    </label>
                    <Textarea
                      placeholder="Any special requests for your order..."
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-blue-600">₱{orderTotal.toFixed(2)}</span>
                  </div>
                  <Button className="w-full h-12 text-lg font-bold" onClick={handleCheckout}>
                    Proceed to Payment
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Floating Order Summary Button - Sticky to viewport bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent">
        <Sheet open={showMobileSheet} onOpenChange={setShowMobileSheet}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-between px-6 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-base">View Order</div>
                  <div className="text-xs text-blue-100">{totalItems} items</div>
                </div>
              </div>
              <span className="text-xl font-bold">₱{orderTotal.toFixed(2)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
            <div className="flex flex-col h-full">
              <SheetHeader className="border-b pb-4 px-6 pt-6">
                <SheetTitle className="text-xl">Your Order</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border-slate-200 focus:border-slate-400 h-12 text-base"
                  />
                </div>

                {currentOrder.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="font-semibold text-lg">Your cart is empty</p>
                    <p className="text-sm">Tap items to add them to your order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentOrder.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-slate-900 truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn(
                                "text-xs font-bold",
                                item.itemType === "dine-in" ? "border-blue-300 text-blue-700" : "border-orange-300 text-orange-700"
                              )}>
                                {item.itemType === "dine-in" ? "DINE IN" : "TAKE OUT"}
                              </Badge>
                              <span className="text-sm text-slate-500">₱{item.price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => updateQuantity(item.id, -1)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => updateQuantity(item.id, 1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => removeItem(item.id)}>
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                        {/* Item Note */}
                        {expandedNoteItems.has(item.id) || item.note ? (
                          <div className="mt-3">
                            <Input
                              placeholder="Add note (e.g., less sugar, extra hot)..."
                              value={item.note || ""}
                              onChange={(e) => updateItemNote(item.id, e.target.value)}
                              className="text-sm h-10"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleItemNote(item.id)}
                            className="mt-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Add note
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Order Note */}
                    <div className="pt-3 border-t border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Special Instructions (Optional)
                      </label>
                      <Textarea
                        placeholder="Any special requests for your order..."
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        className="text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-4 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">₱{orderTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-14 text-lg font-bold" 
                  onClick={handleCheckout}
                  disabled={currentOrder.length === 0}
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          {!orderSubmitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Choose Payment Method</DialogTitle>
                <DialogDescription>
                  How would you like to pay for your order?
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {/* Order Summary */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Order for</span>
                    <span className="font-semibold text-slate-900">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Items</span>
                    <span className="font-semibold text-slate-900">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-blue-600">₱{orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedPaymentMethod("gcash")}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[72px] active:scale-[0.98]",
                      selectedPaymentMethod === "gcash"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <QrCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-slate-900">GCash</p>
                      <p className="text-sm text-slate-500">Pay via QR code</p>
                    </div>
                    {selectedPaymentMethod === "gcash" && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod("cash")}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[72px] active:scale-[0.98]",
                      selectedPaymentMethod === "cash"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-emerald-300"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Banknote className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-slate-900">Cash</p>
                      <p className="text-sm text-slate-500">Pay at the counter</p>
                    </div>
                    {selectedPaymentMethod === "cash" && (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                </div>

                <Button
                  className="w-full h-14 mt-6 text-lg font-bold"
                  disabled={!selectedPaymentMethod || isSubmitting}
                  onClick={submitOrder}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Confirm Order"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Order Submitted State */}
              <div className="py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
                <p className="text-slate-600 mb-6">
                  Please proceed to the cashier with your order code.
                </p>

                {/* Order Code */}
                <div className="bg-slate-900 text-white rounded-xl p-6 mb-6">
                  <p className="text-sm uppercase tracking-wide mb-2 opacity-75">Your Order Code</p>
                  <p className="text-4xl font-mono font-bold tracking-widest">{formatOrderCode(orderCode)}</p>
                </div>

                {/* Payment Instructions */}
                {selectedPaymentMethod === "gcash" ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      GCash Payment Instructions
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4 flex flex-col items-center">
                      <img 
                        src="/gcash-qr.jpg" 
                        alt="GCash QR Code" 
                        className="w-48 h-48 object-contain mb-3"
                      />
                      <p className="text-sm text-slate-500">Scan to pay</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">GCash Name:</span> Maria Krisnela Burdeos</p>
                      <p><span className="font-semibold">GCash Number:</span> 0965 082 3998</p>
                      <p><span className="font-semibold">Amount:</span> ₱{orderTotal.toFixed(2)}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-blue-800 text-sm font-medium">
                        After payment, show your screenshot to the cashier along with your order code.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Cash Payment Instructions
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-sm text-slate-600 mb-1">Amount to Pay</p>
                      <p className="text-3xl font-bold text-emerald-600">₱{orderTotal.toFixed(2)}</p>
                    </div>
                    <p className="text-emerald-800 text-sm font-medium">
                      Go to the cashier, tell them your order code, and pay the amount shown above.
                    </p>
                  </div>
                )}

                <Button className="w-full h-14 text-base font-semibold" variant="outline" onClick={startNewOrder}>
                  Start New Order
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
