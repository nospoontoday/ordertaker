"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Minus, AlertCircle, Clock, Check, CreditCard, RefreshCw, Loader2, DollarSign, Calendar, TrendingUp, ShoppingCart, Utensils, ShoppingBag, Search } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { menuItemsApi, categoriesApi, ordersApi, withdrawalsApi, cartApi, getImageUrl, type MenuItem as ApiMenuItem, type Category as ApiCategory, type Withdrawal } from "@/lib/api"
import { orderDB } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { WithdrawalDialog } from "@/components/withdrawal-dialog"
import { KitchenStatusBanner, type KitchenStatusData } from "@/components/kitchen-status-banner"

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
  kitchenStatus,
}: {
  appendingOrderId: string | null
  onAppendComplete: () => void
  kitchenStatus?: KitchenStatusData | null
}) {
  const [customerName, setCustomerName] = useState("")
  const [orderNote, setOrderNote] = useState("")
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [newItems, setNewItems] = useState<OrderItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isAppending, setIsAppending] = useState(false)
  const [appendingOrder, setAppendingOrder] = useState<Order | null>(null)
  const [todayDate, setTodayDate] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Payment state
  const [isPaid, setIsPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "split" | null>(null)
  const [amountReceived, setAmountReceived] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [gcashAmount, setGcashAmount] = useState("")
  
  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingOrderData, setPendingOrderData] = useState<any>(null)
  
  // Mobile sheet state
  const [showMobileSheet, setShowMobileSheet] = useState(false)

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
  const [clickedItemId, setClickedItemId] = useState<string | null>(null)

  // Toast for notifications
  const { toast } = useToast()
  const { user } = useAuth()

  // Check if user can access withdrawal feature (all roles except crew)
  const canWithdraw = user?.role !== "crew"
  const isAdmin = user?.role === "super_admin"

  // Track if initial load has completed to prevent overwriting on first render
  const hasLoadedFromCart = useRef(false)

  // Shared AudioContext for consistent sound playback
  const audioContextRef = useRef<AudioContext | null>(null)

  // Load cart from database on mount (only if not appending)
  useEffect(() => {
    const loadCart = async () => {
      if (!appendingOrderId && user?.email) {
        try {
          console.log("Loading cart for user:", user.email)
          const cartData = await cartApi.get(user.email)
          setCustomerName(cartData.customerName || "")
          setOrderNote(cartData.orderNote || "")
          setCurrentOrder(cartData.items || [])
          console.log("Loaded cart from database:", cartData)
        } catch (error) {
          console.error("Error loading cart from database:", error)
          console.error("Error details:", error instanceof Error ? error.message : String(error))
        } finally {
          // Mark that we've attempted to load
          hasLoadedFromCart.current = true
        }
      } else if (appendingOrderId) {
        // If appending, mark as loaded to allow saving
        hasLoadedFromCart.current = true
      }
    }

    loadCart()
  }, [appendingOrderId, user?.email])

  // Save cart to database whenever it changes (only if not appending and after initial load)
  useEffect(() => {
    const saveCart = async () => {
      if (hasLoadedFromCart.current && !isAppending && !appendingOrderId && user?.email) {
        try {
          const cartData = {
            customerName,
            orderNote,
            items: currentOrder,
          }
          await cartApi.save(user.email, cartData)
          console.log("Saved cart to database:", cartData)
        } catch (error) {
          console.error("Error saving cart to database:", error)
        }
      }
    }

    // Debounce the save to avoid too many API calls
    const timeoutId = setTimeout(saveCart, 500)
    return () => clearTimeout(timeoutId)
  }, [customerName, orderNote, currentOrder, isAppending, appendingOrderId, user?.email])

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

  const addItem = (menuItem: MenuItem, itemType: "dine-in" | "take-out" = "dine-in") => {
    const targetArray = isAppending ? newItems : currentOrder
    const setTargetArray = isAppending ? setNewItems : setCurrentOrder

    // Find if there's an existing item with the same id AND same itemType
    const existingItem = targetArray.find((item) => item.id === menuItem.id && item.itemType === itemType)

    if (existingItem) {
      // Increment quantity if item with same type exists
      setTargetArray(
        targetArray.map((item) =>
          (item.id === menuItem.id && item.itemType === itemType)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      )
    } else {
      // Add new item with specified type
      setTargetArray([...targetArray, { ...menuItem, quantity: 1, itemType }])
    }
  }

  // Initialize AudioContext once and reuse it for consistent sound playback
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }

  // Play a subtle click sound for menu item clicks
  const playMenuItemSound = () => {
    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Create a subtle "tap" sound
      oscillator.frequency.value = 800 // Higher frequency for a crisp tap
      oscillator.type = "sine"

      // Quick fade out for a tap effect
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime) // Low volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.05)
    } catch (error) {
      // Silently fail if Web Audio API is not supported
      console.log("Audio playback not supported")
    }
  }

  // Play a warm, lower sound for Dine In button
  const playDineInSound = () => {
    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Warm, lower frequency for dine-in
      oscillator.frequency.value = 500 // Lower, warmer tone
      oscillator.type = "sine"

      // Smooth fade out
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.08)
    } catch (error) {
      console.log("Audio playback not supported")
    }
  }

  // Play a distinct, brighter sound for Take Out button
  const playTakeOutSound = () => {
    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Brighter, distinct tone for take-out
      oscillator.frequency.value = 1000 // Higher, brighter tone
      oscillator.type = "triangle" // Different waveform for distinction

      // Quick, snappy fade out
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.06)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.06)
    } catch (error) {
      console.log("Audio playback not supported")
    }
  }

  // Play a cash register "ching" sound for Submit Order button
  const playCashRegisterSound = () => {
    try {
      const audioContext = getAudioContext()

      // Create two oscillators for a bell-like "ching" sound
      const osc1 = audioContext.createOscillator()
      const osc2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      osc1.connect(gainNode)
      osc2.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // High frequencies for bell-like tone
      osc1.frequency.value = 1200 // Primary tone
      osc2.frequency.value = 1800 // Harmonic for richness
      osc1.type = "sine"
      osc2.type = "sine"

      // Bell-like envelope: quick attack, medium decay
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      osc1.start(audioContext.currentTime)
      osc2.start(audioContext.currentTime)
      osc1.stop(audioContext.currentTime + 0.3)
      osc2.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log("Audio playback not supported")
    }
  }

  // Handle item click with sound and animation
  const handleItemClick = (item: MenuItem, itemType: "dine-in" | "take-out" = "dine-in") => {
    // Play the appropriate sound based on item type
    if (itemType === "dine-in") {
      playDineInSound()
    } else {
      playTakeOutSound()
    }
    setClickedItemId(item.id)
    setTimeout(() => setClickedItemId(null), 300) // Remove animation after 300ms
    addItem(item, itemType)
  }

  // Helper function to switch item type and automatically group items with same id and type
  const switchItemType = (items: OrderItem[], targetItem: OrderItem, newType: "dine-in" | "take-out"): OrderItem[] => {
    // Find if there's already an item with the same id and the target type
    const existingItemWithNewType = items.find(
      (item) => item.id === targetItem.id && item.itemType === newType && item !== targetItem
    )

    if (existingItemWithNewType) {
      // Merge: add quantities and remove the item being switched
      return items
        .map((item) => {
          if (item.id === targetItem.id && item.itemType === newType) {
            // Add the quantities together
            return { ...item, quantity: item.quantity + targetItem.quantity }
          }
          return item
        })
        .filter((item) => !(item.id === targetItem.id && item.itemType === targetItem.itemType))
    } else {
      // No merge needed, just update the type
      return items.map((item) =>
        item.id === targetItem.id && item.itemType === targetItem.itemType
          ? { ...item, itemType: newType }
          : item
      )
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
     // Validate payment data if marked as paid
     if (isPaid) {
       if (!paymentMethod) {
         toast({
           title: "Error",
           description: "Please select a payment method.",
           variant: "destructive",
         })
         return
       }
       if (!amountReceived || parseFloat(amountReceived) <= 0) {
         toast({
           title: "Error",
           description: "Please enter a valid amount received.",
           variant: "destructive",
         })
         return
       }
       if (paymentMethod === "split") {
         const cash = parseFloat(cashAmount || "0")
         const gcash = parseFloat(gcashAmount || "0")
         const total = cash + gcash
         const amountToPay = isAppending ? totalNewItems : currentOrderTotal
         if (Math.abs(total - amountToPay) > 0.01) {
           toast({
             title: "Error",
             description: `Split payment amounts must equal the order total (₱${amountToPay.toFixed(2)}).`,
             variant: "destructive",
           })
           return
         }
       }
     }

     // Prepare order data for confirmation
     // When appending, show only the new items and their payment details
     const itemsToShow = isAppending ? newItems : currentOrder
     const totalToShow = isAppending ? totalNewItems : currentOrderTotal

     const orderData = {
       customerName: customerName.trim(),
       items: itemsToShow,
       total: totalToShow,
       isPaid: isPaid,
       paymentMethod: paymentMethod,
       amountReceived: isPaid ? parseFloat(amountReceived) : 0,
       change: isPaid ? (paymentMethod === "split" ? parseFloat(amountReceived) - parseFloat(cashAmount || "0") : parseFloat(amountReceived) - totalToShow) : 0,
       cashAmount: isPaid && paymentMethod === "split" ? parseFloat(cashAmount || "0") : 0,
       gcashAmount: isPaid && paymentMethod === "split" ? parseFloat(gcashAmount || "0") : 0,
     }

     // Show confirmation dialog
     setPendingOrderData(orderData)
     setShowConfirmation(true)
   }


  const handleSubmitOrder = async (orderData: any) => {
    setIsSubmitting(true)

    try {
      if (isAppending && appendingOrderId) {
        // Append items to existing order
        const itemsToAppend = newItems.map((item) => ({ ...item, status: "pending" as const }))

        try {
          // Try to append via API with payment information
          await ordersApi.appendItems(
            appendingOrderId,
            itemsToAppend,
            Date.now(),
            isPaid,
            paymentMethod || undefined,
            paymentMethod === 'split' ? parseFloat(cashAmount) : undefined,
            paymentMethod === 'split' ? parseFloat(gcashAmount) : undefined,
            isPaid && paymentMethod && paymentMethod !== 'split' ? parseFloat(amountReceived) : undefined
          )

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
          isPaid: isPaid,
          paymentMethod: paymentMethod || null,
          cashAmount: paymentMethod === 'split' ? parseFloat(cashAmount) : undefined,
          gcashAmount: paymentMethod === 'split' ? parseFloat(gcashAmount) : undefined,
          amountReceived: isPaid && paymentMethod && paymentMethod !== 'split' ? parseFloat(amountReceived) : undefined,
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

        // Clear cart from database after successful append
        if (user?.email) {
          try {
            await cartApi.clear(user.email)
            console.log("Cleared cart from database after appending items")
          } catch (error) {
            console.error("Error clearing cart:", error)
          }
        }

        onAppendComplete()
      } else {
        // Create new order
        const currentOrderNote = orderNote.trim(); // Capture current note value
        
        // Validate payment data if marked as paid
        if (isPaid) {
          if (!paymentMethod) {
            toast({
              title: "Error",
              description: "Please select a payment method.",
              variant: "destructive",
            })
            setIsSubmitting(false)
            return
          }
          if (!amountReceived || parseFloat(amountReceived) <= 0) {
            toast({
              title: "Error",
              description: "Please enter a valid amount received.",
              variant: "destructive",
            })
            setIsSubmitting(false)
            return
          }
          if (paymentMethod === "split") {
            const cash = parseFloat(cashAmount || "0")
            const gcash = parseFloat(gcashAmount || "0")
            const total = cash + gcash
            const amountToPay = isAppending ? totalNewItems : currentOrderTotal
            if (Math.abs(total - amountToPay) > 0.01) {
              toast({
                title: "Error",
                description: "Split payment amounts must equal the order total (₱" + amountToPay.toFixed(2) + ").",
                variant: "destructive",
              })
              setIsSubmitting(false)
              return
            }
          }
        }

        const newOrder: Order = {
          id: `order-${Date.now()}`,
          customerName: customerName.trim(),
          items: currentOrder.map((item) => ({ ...item, status: "pending" as const })),
          createdAt: Date.now(),
          isPaid: isPaid,
          paymentMethod: paymentMethod,
          cashAmount: isPaid && paymentMethod === "cash" ? parseFloat(amountReceived) : isPaid && paymentMethod === "split" ? parseFloat(cashAmount || "0") : undefined,
          gcashAmount: isPaid && paymentMethod === "gcash" ? parseFloat(amountReceived) : isPaid && paymentMethod === "split" ? parseFloat(gcashAmount || "0") : undefined,
          appendedOrders: [],
          notes: currentOrderNote ? [{
            id: `note-${Date.now()}`,
            content: currentOrderNote,
            createdAt: Date.now(),
            createdBy: user?.name,
            createdByEmail: user?.email,
          }] : [],
        }

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
            paymentMethod: newOrder.paymentMethod,
            cashAmount: newOrder.cashAmount,
            gcashAmount: newOrder.gcashAmount,
            orderType: "dine-in",
             amountReceived: isPaid ? parseFloat(amountReceived) : undefined,
            appendedOrders: [],
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
        setOrderNote("")
        setIsPaid(false)
        setPaymentMethod(null)
        setAmountReceived("")
        setCashAmount("")
        setGcashAmount("")

        // Close mobile sheet after successful order submission
        setShowMobileSheet(false)

        // Clear cart from database after successful order creation
        if (user?.email) {
          try {
            await cartApi.clear(user.email)
            console.log("Cleared cart from database after order creation")
          } catch (error) {
            console.error("Error clearing cart:", error)
          }
        }
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

  const cancelAppend = async () => {
    setIsAppending(false)
    setCustomerName("")
    setCurrentOrder([])
    setNewItems([])
    setAppendingOrder(null)

    // Clear cart from database when canceling append
    if (user?.email) {
      try {
        await cartApi.clear(user.email)
        console.log("Cleared cart from database after canceling append")
      } catch (error) {
        console.error("Error clearing cart:", error)
      }
    }

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
    // If there's a search query, search across ALL items (ignore category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      return menuItems.filter((item) =>
        item.name.toLowerCase().includes(query)
      )
    }
    // Otherwise, filter by category or show best sellers
    if (selectedCategory) {
      return menuItems.filter((item) => item.category === selectedCategory)
    }
    return menuItems.filter((item) => item.isBestSeller)
  }

  // Get the total quantity of an item in the current order
  const getItemQuantityInCart = (itemId: string): number => {
    const orderToCheck = isAppending ? newItems : currentOrder
    return orderToCheck
      .filter(orderItem => orderItem.id === itemId)
      .reduce((total, orderItem) => total + orderItem.quantity, 0)
  }

  // Group items by order type
  const groupItemsByType = (items: OrderItem[]) => {
    const dineInItems = items.filter(item => item.itemType === "dine-in")
    const takeOutItems = items.filter(item => item.itemType === "take-out")
    return { dineInItems, takeOutItems }
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
      // Calculate total of all items (main + appended)
      const mainTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      
      let appendedTotal = 0
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        order.appendedOrders.forEach((appended) => {
          if (appended.isPaid) {
            appendedTotal += appended.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          }
        })
      }
      
      const totalOrderAmount = mainTotal + appendedTotal

      // Add to cash or gcash based on payment method
      if (order.isPaid) {
        if (order.paymentMethod === "cash") {
          totalCash += totalOrderAmount
        } else if (order.paymentMethod === "gcash") {
          totalGcash += totalOrderAmount
        } else if (order.paymentMethod === "split") {
          // For split payments, use the actual split amounts (already includes appended orders)
          totalCash += order.cashAmount || 0
          totalGcash += order.gcashAmount || 0
        } else {
          // If order is paid but no paymentMethod is set, treat as cash (legacy orders)
          totalCash += totalOrderAmount
        }
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

  // Calculate existing items total including previously appended items when appending
  let totalExistingItems = currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0)
  let existingItemCount = currentOrder.reduce((sum, item) => sum + item.quantity, 0)

  if (isAppending && appendingOrder?.appendedOrders) {
    const previouslyAppendedTotal = appendingOrder.appendedOrders.reduce((sum, appended) =>
      sum + appended.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    )
    const previouslyAppendedCount = appendingOrder.appendedOrders.reduce((sum, appended) =>
      sum + appended.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )
    totalExistingItems += previouslyAppendedTotal
    existingItemCount += previouslyAppendedCount
  }

  const totalAll = totalNewItems + totalExistingItems
  const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
  const currentOrderTotal = isAppending ? totalAll : totalExistingItems

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Kitchen Status Banner */}
      <KitchenStatusBanner kitchenStatus={kitchenStatus || null} />

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/monthly-report'}
                    className="hidden sm:inline-flex gap-1 sm:gap-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs sm:text-sm"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Monthly Report</span>
                    <span className="sm:hidden">Monthly</span>
                  </Button>
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
              {/* Search Bar - Prominently Placed for Quick Item Finding */}
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
                      aria-label="Clear search"
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

              {/* Improved Categories Section with Clear Visual Distinction */}
              <div className={`mb-8 bg-gradient-to-br from-slate-100 to-slate-50 p-4 rounded-2xl border-2 border-slate-200 ${searchQuery ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Filter by Category
                  </h3>
                </div>

                {/* Mobile: Horizontal Scroll with Pill Style */}
                <div className="lg:hidden">
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {/* Best Sellers */}
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
                        <span>Best Sellers</span>
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

                {/* Desktop: Compact Horizontal Layout */}
                <div className="hidden lg:flex lg:flex-wrap gap-2">
                  {/* Best Sellers */}
                  <button
                    onClick={() => {
                      setSelectedCategory(null)
                      setSearchQuery("")
                    }}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-full transition-all border",
                      "font-semibold text-sm",
                      selectedCategory === null && !searchQuery
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                    )}
                  >
                    <span className="text-xl">⭐</span>
                    <span>Best Sellers</span>
                  </button>

                  {/* Category Pills */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setSearchQuery("")
                      }}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-full transition-all border",
                        "font-semibold text-sm",
                        selectedCategory === category.id && !searchQuery
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                      )}
                    >
                      <img
                        src={getImageUrl(category.image) || "/placeholder.svg"}
                        alt={category.name}
                        className="w-6 h-6 rounded-full object-cover border-2 border-white/50"
                      />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Improved Menu Items Grid */}
              <TooltipProvider>
                {getDisplayedItems().length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-semibold text-slate-600 mb-2">No items found</p>
                    <p className="text-sm text-slate-500 mb-4">No menu items match "{searchQuery}"</p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear search
                    </Button>
                  </div>
                ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 pb-28 lg:pb-0">
                  {getDisplayedItems().map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item, "dine-in")}
                      className={cn(
                        "group flex flex-col items-center gap-3 p-4 lg:p-5 rounded-xl bg-white cursor-pointer",
                        "border-2 border-slate-200 hover:border-blue-400",
                        "shadow-sm hover:shadow-lg",
                        "transition-all duration-200",
                        "min-h-[200px] lg:min-h-[220px]",
                        "min-w-[140px] sm:min-w-0",
                        "active:scale-95 active:shadow-md",
                        clickedItemId === item.id && "animate-pulse scale-95"
                      )}
                    >
                      {/* Image Container with Best Seller Badge */}
                      <div className="relative">
                        <img
                          src={getImageUrl(item.image) || "/placeholder.svg"}
                          alt={item.name}
                          className="w-24 h-24 lg:w-20 lg:h-20 rounded-lg object-cover
                                     group-hover:scale-105 transition-transform duration-200"
                        />
                        {/* Quantity Counter Badge (top-left) */}
                        {getItemQuantityInCart(item.id) > 0 && (
                          <Badge className="absolute -top-2 -left-2 bg-blue-600 border-2 border-white
                                           text-white text-xs font-bold px-2.5 py-1 shadow-lg rounded-full
                                           min-w-[28px] flex items-center justify-center">
                            {getItemQuantityInCart(item.id)}
                          </Badge>
                        )}
                        {item.isBestSeller && (
                          <Badge className="absolute -top-2 -right-2 bg-amber-500 border border-amber-600
                                           text-white text-[10px] font-bold px-2 py-0.5 shadow-md">
                            BEST
                          </Badge>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-sm lg:text-sm font-semibold text-center text-slate-900
                                        line-clamp-2 leading-tight">
                          {item.name}
                        </span>
                        <span className="text-base lg:text-sm font-bold text-blue-600">
                          ₱{item.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Dine In / Take Out Buttons */}
                      <div className="flex gap-2 w-full">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                playDineInSound()
                                addItem(item, "dine-in")
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                                       bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                       text-white font-semibold text-xs
                                       transition-all active:scale-95 shadow-sm hover:shadow-md"
                            >
                              <Utensils className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Dine In</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add as Dine In</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                playTakeOutSound()
                                addItem(item, "take-out")
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                                       bg-orange-600 hover:bg-orange-700 active:bg-orange-800
                                       text-white font-semibold text-xs
                                       transition-all active:scale-95 shadow-sm hover:shadow-md"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Take Out</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add as Take Out</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </TooltipProvider>
            </>
          )}
        </div>

        {/* Order Summary - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1">
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

            {/* Payment Section */}
            <div className="mb-5 pb-5 border-b border-slate-200/80">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={isPaid}
                    onChange={(e) => {
                      setIsPaid(e.target.checked)
                      if (e.target.checked) {
                        // Set default payment method to Cash when marking as paid
                        setPaymentMethod("cash")
                        // Set default amount received to unpaid amount only (new items when appending)
                        const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                        setAmountReceived(amountToPay.toFixed(2))
                      } else {
                        setPaymentMethod(null)
                        setAmountReceived("")
                        setCashAmount("")
                        setGcashAmount("")
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="isPaid" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Mark as Paid
                  </label>
                </div>

                {isPaid && (
                  <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200/60">
                    {/* Amount Received - Only show for Cash, hide for GCash */}
                    {paymentMethod !== "gcash" && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received (₱)</label>
                        <Input
                          type="number"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full border-slate-200 focus:border-slate-400"
                        />
                      </div>
                    )}

                    {/* GCash Exact Payment Display */}
                    {paymentMethod === "gcash" && (
                      <div className="bg-white p-3 rounded-lg border border-blue-200/60">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-700">Total Amount:</span>
                          <span className="text-lg font-bold text-blue-600">₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-blue-600 font-medium">
                            ✓ GCash payment (exact amount)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Change Display - Only show for Cash, hide for GCash */}
                    {paymentMethod !== "gcash" && amountReceived && (
                      <div className="bg-white p-3 rounded-lg border border-emerald-200/60">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-700">Total Amount:</span>
                          <span className="text-sm font-bold text-slate-900">₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-semibold text-slate-700">Amount Received:</span>
                          <span className="text-sm font-bold text-slate-900">₱{parseFloat(amountReceived || "0").toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                          <span className="text-sm font-bold text-emerald-700">Change:</span>
                          <span className={`text-lg font-bold ${(parseFloat(amountReceived || "0") - (paymentMethod === "split" ? parseFloat(cashAmount || "0") : (isAppending ? totalNewItems : currentOrderTotal))) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            ₱{(parseFloat(amountReceived || "0") - (paymentMethod === "split" ? parseFloat(cashAmount || "0") : (isAppending ? totalNewItems : currentOrderTotal))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Payment Method Selection */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">Payment Method</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setPaymentMethod("cash")
                            setGcashAmount("")
                          }}
                          className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                            paymentMethod === "cash"
                              ? "bg-emerald-600 border-emerald-700 text-white shadow-md"
                              : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400"
                          }`}
                        >
                          💵 Cash
                        </button>
                        <button
                          onClick={() => {
                            setPaymentMethod("gcash")
                            setCashAmount("")
                            // GCash pays exact amount
                            const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                            setAmountReceived(amountToPay.toFixed(2))
                          }}
                          className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                            paymentMethod === "gcash"
                              ? "bg-blue-600 border-blue-700 text-white shadow-md"
                              : "bg-white border-slate-300 text-slate-700 hover:border-blue-400"
                          }`}
                        >
                          Ⓖ GCash
                        </button>
                        <button
                          onClick={() => setPaymentMethod("split")}
                          className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                            paymentMethod === "split"
                              ? "bg-purple-600 border-purple-700 text-white shadow-md"
                              : "bg-white border-slate-300 text-slate-700 hover:border-purple-400"
                          }`}
                        >
                          🔀 Split
                        </button>
                      </div>
                    </div>

                    {/* Split Payment Form */}
                    {paymentMethod === "split" && (
                      <div className="space-y-3 bg-white p-3 rounded-lg border border-purple-200/60">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Split Payment Details</p>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Cash Amount (₱)</label>
                          <Input
                            type="number"
                            value={cashAmount}
                            onChange={(e) => {
                              const cash = parseFloat(e.target.value || "0")
                              setCashAmount(e.target.value)
                              // Auto-calculate gcash based on total order amount
                              const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                              if (e.target.value) {
                                const gcash = Math.max(0, amountToPay - cash)
                                setGcashAmount(gcash > 0 ? gcash.toFixed(2) : "")
                              }
                            }}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full text-sm border-slate-200 focus:border-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">GCash Amount (₱)</label>
                          <Input
                            type="number"
                            value={gcashAmount}
                            onChange={(e) => {
                              const gcash = parseFloat(e.target.value || "0")
                              setGcashAmount(e.target.value)
                              // Auto-calculate cash based on total order amount
                              const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                              if (e.target.value) {
                                const cash = Math.max(0, amountToPay - gcash)
                                setCashAmount(cash > 0 ? cash.toFixed(2) : "")
                              }
                            }}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full text-sm border-slate-200 focus:border-slate-400"
                          />
                        </div>
                        {cashAmount && gcashAmount && (
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-600">Total Split:</span>
                              <span className={`font-bold ${Math.abs((parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")) - (isAppending ? totalNewItems : currentOrderTotal)) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                                ₱{(parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")).toFixed(2)}
                              </span>
                            </div>
                            {Math.abs((parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")) - (isAppending ? totalNewItems : currentOrderTotal)) >= 0.01 && (
                              <p className="text-xs text-amber-600 font-semibold mt-1">
                                ⚠️ Split total must equal order total (₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)})
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                  {/* Main Order Items */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Main Order</p>
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

                  {/* Previously Appended Orders */}
                  {appendingOrder.appendedOrders && appendingOrder.appendedOrders.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                      {appendingOrder.appendedOrders.map((appended, index) => (
                        <div key={appended.id}>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Appended Order #{index + 1}</p>
                          {appended.items.map((item) => (
                            <div key={item.id} className="bg-blue-50/30 p-3 rounded-lg border border-blue-200/60 text-xs mb-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-900">{item.name}</span>
                                <Badge variant="outline" className="text-xs font-bold border-blue-300">x{item.quantity}</Badge>
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
                      ))}
                    </div>
                  )}
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
                              const updated = switchItemType(newItems, item, "dine-in")
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
                              const updated = switchItemType(newItems, item, "take-out")
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
              <div className="space-y-4 mb-5 max-h-64 overflow-y-auto">
                {currentOrder.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium">No items added</p>
                ) : (
                  <>
                    {(() => {
                      const { dineInItems, takeOutItems } = groupItemsByType(currentOrder)
                      return (
                        <>
                          {dineInItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 px-2">
                                <Utensils className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Dine In</h4>
                              </div>
                              <div className="space-y-3">
                                {dineInItems.map((item) => (
                    <div key={`${item.id}-${item.itemType}`} className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 gap-2">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                          <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            const updated = currentOrder.map((i) =>
                              i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: i.quantity + 1 } : i,
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
                              .map((i) => (i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
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
                            const updated = currentOrder.filter((i) => !(i.id === item.id && i.itemType === item.itemType))
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
                            const updated = switchItemType(currentOrder, item, "dine-in")
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
                            const updated = switchItemType(currentOrder, item, "take-out")
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
                              (i.id === item.id && i.itemType === item.itemType) ? { ...i, note: e.target.value } : i
                            )
                            setCurrentOrder(updated)
                          }}
                          placeholder="Add note (optional)"
                          className="w-full text-xs border-slate-200 focus:border-slate-400"
                        />
                      </div>
                    </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {takeOutItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 px-2">
                                <ShoppingBag className="w-4 h-4 text-orange-600" />
                                <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide">Take Out</h4>
                              </div>
                              <div className="space-y-3">
                                {takeOutItems.map((item) => (
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
                                              i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: i.quantity + 1 } : i,
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
                                              .map((i) => (i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
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
                                            const updated = currentOrder.filter((i) => !(i.id === item.id && i.itemType === item.itemType))
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
                                          const updated = switchItemType(currentOrder, item, "dine-in")
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
                                          const updated = switchItemType(currentOrder, item, "take-out")
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
                                            (i.id === item.id && i.itemType === item.itemType) ? { ...i, note: e.target.value } : i
                                          )
                                          setCurrentOrder(updated)
                                        }}
                                        placeholder="Add note (optional)"
                                        className="w-full text-xs border-slate-200 focus:border-slate-400"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
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

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Confirm Order Submission</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-600">
                Please review your order details before confirming.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {pendingOrderData && (
              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-sm font-bold text-slate-900">{pendingOrderData.customerName}</p>
                </div>

                {/* Items Breakdown */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Order Items</p>
                  <div className="space-y-2">
                    {pendingOrderData.items.map((item: OrderItem, idx: number) => (
                      <div key={`${item.id}-${idx}`} className="flex justify-between items-start text-sm">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-600">x{item.quantity} @ ₱{item.price.toFixed(2)}</p>
                          {item.note && (
                            <p className="text-xs text-amber-700 font-medium mt-1 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              📝 {item.note}
                            </p>
                          )}
                        </div>
                        <p className="font-bold text-slate-900">₱{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Payment Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Total Amount:</span>
                      <span className="font-bold text-slate-900">₱{pendingOrderData.total.toFixed(2)}</span>
                    </div>
                    {pendingOrderData.isPaid && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-700">Amount Received:</span>
                          <span className="font-bold text-slate-900">₱{pendingOrderData.amountReceived.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-blue-200">
                          <span className="font-semibold text-emerald-700">Change:</span>
                          <span className={`font-bold text-lg ${pendingOrderData.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            ₱{pendingOrderData.change.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                {pendingOrderData.isPaid && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Payment Method</p>
                    <div className="space-y-1 text-sm">
                      {pendingOrderData.paymentMethod === "cash" && (
                        <p className="font-bold text-slate-900">💵 Cash - ₱{pendingOrderData.amountReceived.toFixed(2)}</p>
                      )}
                      {pendingOrderData.paymentMethod === "gcash" && (
                        <p className="font-bold text-slate-900">Ⓖ GCash - ₱{pendingOrderData.amountReceived.toFixed(2)}</p>
                      )}
                      {pendingOrderData.paymentMethod === "split" && (
                        <>
                          <p className="font-bold text-slate-900">🔀 Split Payment</p>
                          <p className="text-xs text-slate-600 ml-2">💵 Cash: ₱{pendingOrderData.cashAmount.toFixed(2)}</p>
                          <p className="text-xs text-slate-600 ml-2">Ⓖ GCash: ₱{pendingOrderData.gcashAmount.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <AlertDialogCancel className="border-slate-300 hover:border-slate-400 hover:bg-slate-50">
              Edit Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmation(false)
                handleSubmitOrder(pendingOrderData)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>

        </div>
        </div>

        {/* Mobile: Floating Order Summary Button */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <Sheet open={showMobileSheet} onOpenChange={setShowMobileSheet}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white shadow-2xl
                           flex items-center justify-between px-6"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">View Order</div>
                    <div className="text-xs text-blue-100">{existingItemCount + newItemCount} items</div>
                  </div>
                </div>
                <span className="text-xl font-bold">₱{currentOrderTotal.toFixed(2)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="border-b pb-4 px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-xl">
                      {isAppending ? "Append Items" : "Current Order"}
                    </SheetTitle>
                    {isAppending && (
                      <Badge className="bg-blue-600 text-white">Appending</Badge>
                    )}
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
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

                  <div className="mb-5 pb-5 border-b border-slate-200/80">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="isPaid-mobile"
                          checked={isPaid}
                          onChange={(e) => {
                            setIsPaid(e.target.checked)
                            if (e.target.checked) {
                              setPaymentMethod("cash")
                              // Set default amount received to unpaid amount only (new items when appending)
                              const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                              setAmountReceived(amountToPay.toFixed(2))
                            } else {
                              setPaymentMethod(null)
                              setAmountReceived("")
                              setCashAmount("")
                              setGcashAmount("")
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                        <label htmlFor="isPaid-mobile" className="text-sm font-bold text-slate-700 cursor-pointer">
                          Mark as Paid
                        </label>
                      </div>

                      {isPaid && (
                        <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200/60">
                          {/* Amount Received - Only show for Cash, hide for GCash */}
                          {paymentMethod !== "gcash" && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received (₱)</label>
                              <Input
                                type="number"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="w-full border-slate-200 focus:border-slate-400"
                              />
                            </div>
                          )}

                          {/* GCash Exact Payment Display */}
                          {paymentMethod === "gcash" && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200/60">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">Total Amount:</span>
                                <span className="text-lg font-bold text-blue-600">₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <p className="text-xs text-blue-600 font-medium">
                                  ✓ GCash payment (exact amount)
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Change Display - Only show for Cash, hide for GCash */}
                          {paymentMethod !== "gcash" && amountReceived && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200/60">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">Total Amount:</span>
                                <span className="text-sm font-bold text-slate-900">₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm font-semibold text-slate-700">Amount Received:</span>
                                <span className="text-sm font-bold text-slate-900">₱{parseFloat(amountReceived || "0").toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                                <span className="text-sm font-bold text-emerald-700">Change:</span>
                                <span className={`text-lg font-bold ${(parseFloat(amountReceived || "0") - (paymentMethod === "split" ? parseFloat(cashAmount || "0") : (isAppending ? totalNewItems : currentOrderTotal))) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  ₱{(parseFloat(amountReceived || "0") - (paymentMethod === "split" ? parseFloat(cashAmount || "0") : (isAppending ? totalNewItems : currentOrderTotal))).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Payment Method Selection */}
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">Payment Method</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setPaymentMethod("cash")
                                  setGcashAmount("")
                                }}
                                className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                                  paymentMethod === "cash"
                                    ? "bg-emerald-600 border-emerald-700 text-white shadow-md"
                                    : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400"
                                }`}
                              >
                                💵 Cash
                              </button>
                              <button
                                onClick={() => {
                                  setPaymentMethod("gcash")
                                  setCashAmount("")
                                  // GCash pays exact amount
                                  const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                                  setAmountReceived(amountToPay.toFixed(2))
                                }}
                                className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                                  paymentMethod === "gcash"
                                    ? "bg-blue-600 border-blue-700 text-white shadow-md"
                                    : "bg-white border-slate-300 text-slate-700 hover:border-blue-400"
                                }`}
                              >
                                Ⓖ GCash
                              </button>
                              <button
                                onClick={() => setPaymentMethod("split")}
                                className={`flex-1 px-3 py-2.5 text-sm rounded-lg font-bold transition-all border ${
                                  paymentMethod === "split"
                                    ? "bg-purple-600 border-purple-700 text-white shadow-md"
                                    : "bg-white border-slate-300 text-slate-700 hover:border-purple-400"
                                }`}
                              >
                                🔀 Split
                              </button>
                            </div>
                          </div>

                          {/* Split Payment Form */}
                          {paymentMethod === "split" && (
                            <div className="space-y-3 bg-white p-3 rounded-lg border border-purple-200/60">
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Split Payment Details</p>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Cash Amount (₱)</label>
                                <Input
                                  type="number"
                                  value={cashAmount}
                                  onChange={(e) => {
                                    const cash = parseFloat(e.target.value || "0")
                                    setCashAmount(e.target.value)
                                    const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                                    if (e.target.value) {
                                      const gcash = Math.max(0, amountToPay - cash)
                                      setGcashAmount(gcash > 0 ? gcash.toFixed(2) : "")
                                    }
                                  }}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  className="w-full text-sm border-slate-200 focus:border-slate-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">GCash Amount (₱)</label>
                                <Input
                                  type="number"
                                  value={gcashAmount}
                                  onChange={(e) => {
                                    const gcash = parseFloat(e.target.value || "0")
                                    setGcashAmount(e.target.value)
                                    const amountToPay = isAppending ? totalNewItems : currentOrderTotal
                                    if (e.target.value) {
                                      const cash = Math.max(0, amountToPay - gcash)
                                      setCashAmount(cash > 0 ? cash.toFixed(2) : "")
                                    }
                                  }}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  className="w-full text-sm border-slate-200 focus:border-slate-400"
                                />
                              </div>
                              {cashAmount && gcashAmount && (
                                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Total Split:</span>
                                    <span className={`font-bold ${Math.abs((parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")) - (isAppending ? totalNewItems : currentOrderTotal)) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                                      ₱{(parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")).toFixed(2)}
                                    </span>
                                  </div>
                                  {Math.abs((parseFloat(cashAmount || "0") + parseFloat(gcashAmount || "0")) - (isAppending ? totalNewItems : currentOrderTotal)) >= 0.01 && (
                                    <p className="text-xs text-amber-600 font-semibold mt-1">
                                      ⚠️ Split total must equal order total (₱{(isAppending ? totalNewItems : currentOrderTotal).toFixed(2)})
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  {isAppending && appendingOrder && (
                    <div className="mb-5 pb-5 border-b border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Existing Items</p>
                        {appendingOrder.isPaid && (
                          <Badge className="bg-emerald-600 text-white">Paid</Badge>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {/* Main Order Items */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Main Order</p>
                          {currentOrder.map((item) => (
                            <div key={item.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-900">{item.name}</span>
                                <Badge variant="outline" className="text-xs font-bold">x{item.quantity}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Previously Appended Orders */}
                        {appendingOrder.appendedOrders && appendingOrder.appendedOrders.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                            {appendingOrder.appendedOrders.map((appended, index) => (
                              <div key={appended.id}>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Appended Order #{index + 1}</p>
                                {appended.items.map((item) => (
                                  <div key={item.id} className="bg-blue-50/30 p-3 rounded-lg border border-blue-200/60 text-xs mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-slate-900">{item.name}</span>
                                      <Badge variant="outline" className="text-xs font-bold border-blue-300">x{item.quantity}</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isAppending && (
                    <div className="mb-5">
                      <p className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">New Items to Add</p>
                      {newItems.length === 0 ? (
                        <p className="text-slate-500 text-sm font-medium">No new items added</p>
                      ) : (
                        <div className="space-y-3">
                          {newItems.map((item) => (
                            <div key={item.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                                  <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const updated = newItems.map((i) =>
                                        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                                      )
                                      setNewItems(updated)
                                    }}
                                    className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 min-w-[32px] min-h-[32px]"
                                  >
                                    <Plus className="w-4 h-4 text-emerald-600" />
                                  </button>
                                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                  <button
                                    onClick={() => {
                                      const updated = newItems
                                        .map((i) => (i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                                        .filter((i) => i.quantity > 0)
                                      setNewItems(updated)
                                    }}
                                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200 min-w-[32px] min-h-[32px]"
                                  >
                                    <Minus className="w-4 h-4 text-red-600" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = newItems.filter((i) => i.id !== item.id)
                                      setNewItems(updated)
                                    }}
                                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200 min-w-[32px] min-h-[32px]"
                                  >
                                    <X className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isAppending && (
                    <div className="space-y-4 mb-5">
                      {currentOrder.length === 0 ? (
                        <p className="text-slate-500 text-sm font-medium">No items added</p>
                      ) : (
                        <>
                          {(() => {
                            const { dineInItems, takeOutItems } = groupItemsByType(currentOrder)
                            return (
                              <>
                                {dineInItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <Utensils className="w-4 h-4 text-blue-600" />
                                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Dine In</h4>
                                    </div>
                                    <div className="space-y-3">
                                      {dineInItems.map((item) => (
                          <div key={`${item.id}-${item.itemType}`} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                                <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    const updated = currentOrder.map((i) =>
                                      i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: i.quantity + 1 } : i
                                    )
                                    setCurrentOrder(updated)
                                  }}
                                  className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 min-w-[32px] min-h-[32px]"
                                >
                                  <Plus className="w-4 h-4 text-emerald-600" />
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                <button
                                  onClick={() => {
                                    const updated = currentOrder
                                      .map((i) => (i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                                      .filter((i) => i.quantity > 0)
                                    setCurrentOrder(updated)
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200 min-w-[32px] min-h-[32px]"
                                >
                                  <Minus className="w-4 h-4 text-red-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = currentOrder.filter((i) => !(i.id === item.id && i.itemType === item.itemType))
                                    setCurrentOrder(updated)
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200 min-w-[32px] min-h-[32px]"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => {
                                  const updated = switchItemType(currentOrder, item, "dine-in")
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
                                  const updated = switchItemType(currentOrder, item, "take-out")
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
                                    (i.id === item.id && i.itemType === item.itemType) ? { ...i, note: e.target.value } : i
                                  )
                                  setCurrentOrder(updated)
                                }}
                                placeholder="Add note (optional)"
                                className="w-full text-xs border-slate-200 focus:border-slate-400"
                              />
                            </div>
                          </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {takeOutItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <ShoppingBag className="w-4 h-4 text-orange-600" />
                                      <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide">Take Out</h4>
                                    </div>
                                    <div className="space-y-3">
                                      {takeOutItems.map((item) => (
                                        <div key={`${item.id}-${item.itemType}`} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                                              <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <button
                                                onClick={() => {
                                                  const updated = currentOrder.map((i) =>
                                                    i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: i.quantity + 1 } : i
                                                  )
                                                  setCurrentOrder(updated)
                                                }}
                                                className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 min-w-[32px] min-h-[32px]"
                                              >
                                                <Plus className="w-4 h-4 text-emerald-600" />
                                              </button>
                                              <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                              <button
                                                onClick={() => {
                                                  const updated = currentOrder
                                                    .map((i) => (i.id === item.id && i.itemType === item.itemType ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                                                    .filter((i) => i.quantity > 0)
                                                  setCurrentOrder(updated)
                                                }}
                                                className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200 min-w-[32px] min-h-[32px]"
                                              >
                                                <Minus className="w-4 h-4 text-red-600" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  const updated = currentOrder.filter((i) => !(i.id === item.id && i.itemType === item.itemType))
                                                  setCurrentOrder(updated)
                                                }}
                                                className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200 min-w-[32px] min-h-[32px]"
                                              >
                                                <X className="w-4 h-4 text-red-600" />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => {
                                                const updated = switchItemType(currentOrder, item, "dine-in")
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
                                                const updated = switchItemType(currentOrder, item, "take-out")
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
                                                  (i.id === item.id && i.itemType === item.itemType) ? { ...i, note: e.target.value } : i
                                                )
                                                setCurrentOrder(updated)
                                              }}
                                              placeholder="Add note (optional)"
                                              className="w-full text-xs border-slate-200 focus:border-slate-400"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t bg-white px-6 py-4">
                  <div className="mb-4">
                    {isAppending ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-slate-700">New Items Total:</span>
                          <span className="text-lg font-bold text-blue-600">₱{totalNewItems.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">New items: {newItemCount}</div>
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
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold h-12"
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
                      <Button onClick={cancelAppend} variant="outline" className="flex-1 h-12" disabled={isSubmitting}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
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
