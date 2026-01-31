"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  X, Plus, Minus, Clock, ShoppingBag, Search, Coffee, Loader2, QrCode, 
  Banknote, CheckCircle, Users, RefreshCw, ChefHat, MessageSquare, 
  ArrowRight, MapPin, Heart
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { menuItemsApi, categoriesApi, ordersApi, insightsApi, customerPhotosApi, getImageUrl, type Order as ApiOrder, type CustomerPhoto } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { generateUniqueShortCode, formatOrderCode } from "@/lib/order-code-generator"
import { DEFAULT_BRANCH } from "@/lib/branches"
import { 
  getCreativeIdentifierForOrder, 
  getDelightfulMessage, 
  getOrdinalSuffix,
  CREATIVE_TITLES,
  type ItemCategory
} from "@/lib/kopisina-magic"

/**
 * BRAND CONFIGURATION
 */
const BRAND = {
  name: "Kopisina x Zion's",
  tagline: "Where the Agusan River meets your cravings.",
  accent: "text-amber-600",
  bgAccent: "bg-amber-600",
  button: "bg-gray-900 hover:bg-black",
  facebook: "@kopisina242",
}

/**
 * WARM COPY - All the fun messages without emojis
 */
const WARM_COPY = {
  // Hero section
  hero: {
    tagline: "Where the Agusan River meets your cravings.",
    subtitle: "Good things are brewing",
    photoCredit: "Want to be featured? Follow us on Facebook",
  },
  
  // Search
  search: {
    placeholder: "What are you craving today?",
    noResults: "Hmm, we couldn't find that one",
    noResultsSub: "Try something else, or ask our crew",
  },
  
  // Cart
  cart: {
    title: "Your Order",
    empty: "Your bag is waiting for something delicious",
    emptySub: "Tap anything that catches your eye",
    orderType: "How are you enjoying this?",
    yourName: "What should we call you?",
    namePlaceholder: "Your name for the order",
    specialInstructions: "Anything we should know?",
    instructionsPlaceholder: "Extra hot, less ice, surprise me...",
    itemNote: "Any special requests for this?",
    checkout: "Let's do this",
    checkoutDisabled: "Add your name to continue",
  },
  
  // Queue indicator
  queue: {
    ordersAhead: (n: number) => n === 0 ? "You're next in line" : `${n} orders ahead of you`,
    estimatedWait: (min: number) => min <= 5 ? "Almost instant" : `About ${min} min`,
    busy: "The river is flowing fast today",
    calm: "Perfect timing, no wait",
  },
  
  // Payment
  payment: {
    title: "How are you paying?",
    subtitle: "Almost there, just one more step",
    gcash: "GCash",
    gcashSub: "Scan and you're done",
    cash: "Cash",
    cashSub: "The classic way",
    confirm: "Place my order",
    submitting: "Sending to the kitchen...",
  },
  
  // Order submitted (waiting screen)
  submitted: {
    title: "Show this to our crew",
    subtitle: "They'll take it from here",
    waitingTitle: "We're on it",
    waitingSub: "This screen will update when your payment is confirmed",
    gcashInstructions: "Scan, pay, show screenshot to crew",
    cashInstructions: "Head to the counter with this code",
  },
  
  // Success / Order served
  success: {
    title: "Your order is served",
    subtitle: "Hope you saved room for this",
    pickup: "We hope you enjoyed it",
    enjoyMessage: "Best enjoyed while listening to the river",
    thankYou: "Thanks for hanging out with us",
    upsellTitle: "Still got room?",
    orderMore: "I could eat more",
    done: "I'm good, thanks",
  },
  
  // Active orders
  orders: {
    bannerTitle: "Your orders",
    statusPending: "In queue",
    statusPreparing: "Being made",
    statusReady: "Pick up now",
    statusServed: "Enjoyed",
    view: "View",
  },
  
  // Preparing section
  preparing: {
    title: "Now brewing",
    yours: "yours",
  },
  
  // Delightful messages (no emojis)
  delightful: [
    "Best enjoyed while watching the river flow",
    "Let the river carry your worries away",
    "Life flows better with good food",
    "Like the river, may your day flow smoothly",
    "Find your calm by the riverside",
    "Good vibes flow here",
    "Where the river meets comfort food",
    "Flowing with flavor, served with soul",
    "The river called, your order answered",
    "Riverside moments, unforgettable tastes",
    "Life's too short for bad coffee",
    "Brewed with love, served with joy",
    "Every cup tells a story",
    "Sip happens, make it a good one",
    "Your daily dose of happiness",
    "The best ideas start with coffee",
    "Good food, good mood, good day",
    "Made with love, served with a smile",
    "Comfort in every bite",
    "Food tastes better when shared",
    "Where flavor meets feeling",
    "Full belly, happy heart",
    "A cozy corner in a busy world",
    "Take a break, you deserve this",
    "Slow down, savor the moment",
    "Creating memories, one order at a time",
    "Where every order feels like home",
    "Pause. Breathe. Enjoy.",
    "The best things are worth savoring",
    "Today is going to be a great day",
    "You're doing amazing, treat yourself",
    "Making ordinary moments extraordinary",
    "Good things are brewing for you",
    "You chose well",
    "Here's to the little joys in life",
    "Fuel for your awesome day ahead",
    "Plot twist: this is the best part of your day",
    "Warning: May cause extreme happiness",
    "This is your sign to enjoy life",
    "Main character energy in every order",
  ],
  
  // Get random delightful message
  getDelightful: (seed?: number) => {
    const messages = WARM_COPY.delightful
    const index = seed !== undefined ? seed % messages.length : Math.floor(Math.random() * messages.length)
    return messages[index]
  },
  
  // Creative identifier (e.g., "You're the 127th River Soul today")
  getCreativeTitle: (orderNumber: number, category: ItemCategory = 'hot-drinks') => {
    const titles = CREATIVE_TITLES[category]
    const titleIndex = (orderNumber - 1) % titles.length
    const title = titles[titleIndex]
    const ordinal = getOrdinalSuffix(orderNumber)
    return `You're the ${ordinal} ${title} today`
  },
}

/**
 * CUSTOM STYLES - Injected as a style component
 */
const CustomStyles = () => (
  <style jsx global>{`
    @keyframes slideIn { 
      from { transform: translateX(100%); } 
      to { transform: translateX(0); } 
    }
    @keyframes slideUp { 
      from { transform: translateY(100%); opacity: 0; } 
      to { transform: translateY(0); opacity: 1; } 
    }
    @keyframes scaleIn { 
      from { transform: scale(0.95); opacity: 0; } 
      to { transform: scale(1); opacity: 1; } 
    }
    .animate-slideIn { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
)

// Customer session interface for tracking order codes
interface CustomerSession {
  codes: string[]  // Order codes (e.g., ["A7K", "B3M"])
  lastUpdated: number
}

// Constants
const CUSTOMER_SESSION_KEY = "customerOrderSession"
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours for customer session
const ACTIVE_ORDER_EXPIRY_MS = 8 * 60 * 60 * 1000 // 8 hours for active orders

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

// Active order tracking interface (tracks multiple orders per session)
interface ActiveOrderState {
  orderId: string
  orderCode: string
  customerName: string
  orderTotal: number
  paymentMethod: "cash" | "gcash"
  submittedAt: number
  paymentConfirmed: boolean
  fullyServed: boolean
  items: Array<{ name: string; quantity: number; price: number }>
}

const ACTIVE_ORDERS_KEY = "customerActiveOrders"

function loadActiveOrders(): ActiveOrderState[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(ACTIVE_ORDERS_KEY)
    if (stored) {
      const orders: ActiveOrderState[] = JSON.parse(stored)
      // Filter out expired orders (older than 8 hours)
      const validOrders = orders.filter(order => Date.now() - order.submittedAt < ACTIVE_ORDER_EXPIRY_MS)
      if (validOrders.length !== orders.length) {
        // Save filtered list back
        localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(validOrders))
      }
      return validOrders
    }
  } catch (error) {
    console.error('Error loading active orders:', error)
  }
  return []
}

function saveActiveOrder(state: ActiveOrderState): void {
  if (typeof window === 'undefined') return
  
  try {
    const existing = loadActiveOrders()
    // Check if order already exists (update it) or add new
    const existingIndex = existing.findIndex(o => o.orderId === state.orderId || o.orderCode === state.orderCode)
    if (existingIndex >= 0) {
      existing[existingIndex] = state
    } else {
      existing.push(state)
    }
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(existing))
  } catch (error) {
    console.error('Error saving active order:', error)
  }
}

function updateActiveOrderStatus(orderCode: string, updates: Partial<ActiveOrderState>): void {
  if (typeof window === 'undefined') return
  
  try {
    const orders = loadActiveOrders()
    const index = orders.findIndex(o => o.orderCode.toUpperCase() === orderCode.toUpperCase())
    if (index >= 0) {
      orders[index] = { ...orders[index], ...updates }
      localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(orders))
    }
  } catch (error) {
    console.error('Error updating active order:', error)
  }
}

function removeActiveOrder(orderCode: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const orders = loadActiveOrders()
    const filtered = orders.filter(o => o.orderCode.toUpperCase() !== orderCode.toUpperCase())
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error removing active order:', error)
  }
}

function clearAllActiveOrders(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(ACTIVE_ORDERS_KEY)
  } catch (error) {
    console.error('Error clearing active orders:', error)
  }
}

// Customer name persistence (auto-fill for returning customers)
const CUSTOMER_NAME_KEY = "customerOnlineName"

function loadSavedCustomerName(): string {
  if (typeof window === 'undefined') return ""
  
  try {
    return localStorage.getItem(CUSTOMER_NAME_KEY) || ""
  } catch (error) {
    console.error('Error loading customer name:', error)
    return ""
  }
}

function saveCustomerName(name: string): void {
  if (typeof window === 'undefined') return
  
  try {
    if (name.trim()) {
      localStorage.setItem(CUSTOMER_NAME_KEY, name.trim())
    }
  } catch (error) {
    console.error('Error saving customer name:', error)
  }
}

// Pending payment state persistence (locked modal until cashier confirms)
const PENDING_PAYMENT_KEY = "customerPendingPayment"

interface PendingPaymentState {
  orderCode: string
  orderId: string
  orderTotal: number
  paymentMethod: "cash" | "gcash"
  submittedAt: number
}

function loadPendingPayment(): PendingPaymentState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(PENDING_PAYMENT_KEY)
    if (stored) {
      const state: PendingPaymentState = JSON.parse(stored)
      // Expire after 8 hours
      if (Date.now() - state.submittedAt < ACTIVE_ORDER_EXPIRY_MS) {
        return state
      }
      // Clear expired state
      localStorage.removeItem(PENDING_PAYMENT_KEY)
    }
  } catch (error) {
    console.error('Error loading pending payment:', error)
  }
  return null
}

function savePendingPayment(state: PendingPaymentState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Error saving pending payment:', error)
  }
}

function clearPendingPayment(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY)
  } catch (error) {
    console.error('Error clearing pending payment:', error)
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

/**
 * COMPONENT: Owner Badge - Fixed bottom-right badge showing owner
 */
const OwnerBadge = () => (
  <div className="fixed bottom-4 left-4 md:bottom-6 md:right-6 md:left-auto z-40 flex items-center gap-2 md:gap-3 bg-white/90 backdrop-blur-md p-1.5 pr-3 md:p-2 md:pr-4 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform cursor-pointer group">
    <div className="relative">
      <img 
        src="/photo.jpg" 
        alt="Owner" 
        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm object-cover"
      />
      <div className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white"></div>
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-none mb-0.5">Built by the Owner</span>
      <span className="text-[11px] md:text-xs font-bold text-gray-800 group-hover:text-amber-600">John R.</span>
    </div>
  </div>
)

/**
 * COMPONENT: Status Bar - Fixed top bar showing current order status
 */
interface StatusBarProps {
  status: string | null
  orderId: string
  onClose: () => void
}

const StatusBar = ({ status, orderId, onClose }: StatusBarProps) => (
  <div className={`fixed top-0 left-0 w-full z-50 transform transition-transform duration-500 ${status ? 'translate-y-0' : '-translate-y-full'}`}>
    <div className="bg-gray-900 text-white px-4 py-3 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></div>
        <p className="text-xs md:text-sm font-medium">
          <span className="opacity-70">Order #{orderId}</span>
          <span className="mx-2">•</span>
          <span className="text-amber-400 font-bold uppercase tracking-wider">{status}</span>
        </p>
      </div>
      <button onClick={onClose} className="text-white/50 hover:text-white"><X size={16} /></button>
    </div>
  </div>
)

/**
 * COMPONENT: Queue Indicator - Shows orders in queue and wait time
 */
interface QueueIndicatorProps {
  ordersInQueue: number
  estimatedWait: number
}

const QueueIndicator = ({ ordersInQueue, estimatedWait }: QueueIndicatorProps) => (
  <div className="inline-flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-full px-5 py-2.5 text-amber-900 text-sm font-medium mt-4">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
      <span>{ordersInQueue === 0 ? WARM_COPY.queue.calm : `${ordersInQueue} orders ahead`}</span>
    </div>
    {ordersInQueue > 0 && (
      <>
        <div className="w-px h-4 bg-amber-200"></div>
        <span className="text-amber-700">{WARM_COPY.queue.estimatedWait(estimatedWait)}</span>
      </>
    )}
  </div>
)

/**
 * COMPONENT: Product Card - New design with hover animations
 */
interface ProductCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  quantityInCart: number
}

const ProductCard = ({ item, onAdd, quantityInCart }: ProductCardProps) => (
  <button 
    onClick={() => onAdd(item)}
    className="group relative bg-white rounded-3xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100/50 flex flex-col h-full text-left w-full active:scale-[0.98] cursor-pointer"
  >
    <div className="aspect-[4/3] overflow-hidden relative">
      <img 
        src={item.onlineImage ? getImageUrl(item.onlineImage) : "/placeholder.svg"} 
        alt={item.name} 
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
      />
      {item.isBestSeller && (
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-amber-600 shadow-sm">
          Best Seller
        </span>
      )}
      {quantityInCart > 0 && (
        <span className="absolute top-3 right-3 bg-amber-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
          {quantityInCart}
        </span>
      )}
      {/* Plus icon - visible on hover (desktop) and always visible on mobile */}
      <span 
        className="absolute bottom-3 right-3 bg-white text-black p-3 rounded-full shadow-lg md:opacity-0 md:transform md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300 group-hover:bg-black group-hover:text-white"
      >
        <Plus size={18} />
      </span>
    </div>
    <div className="p-5 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
        <span className="font-serif italic text-lg text-gray-500 ml-2">₱{item.price}</span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {item.category}
      </p>
    </div>
  </button>
)

/**
 * COMPONENT: Cart Drawer - Full-height sliding drawer from right
 */
interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  cart: OrderItem[]
  updateQty: (id: string, delta: number) => void
  updateItemMeta: (id: string, updates: { type?: "dine-in" | "take-out"; note?: string }) => void
  onCheckout: () => void
  customerName: string
  setCustomerName: (name: string) => void
  globalOrderType: "dine-in" | "take-out"
  setGlobalOrderType: (type: "dine-in" | "take-out") => void
  globalOrderNote: string
  setGlobalOrderNote: (note: string) => void
}

const CartDrawer = ({ 
  isOpen, onClose, cart, updateQty, updateItemMeta, onCheckout, 
  customerName, setCustomerName, globalOrderType, setGlobalOrderType,
  globalOrderNote, setGlobalOrderNote
}: CartDrawerProps) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#FDFDFD] z-50 shadow-2xl flex flex-col animate-slideIn">
        <div className="p-6 flex items-center justify-between border-b border-gray-50 bg-white">
          <h2 className="text-2xl font-bold tracking-tight">{WARM_COPY.cart.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Section: Global Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                {WARM_COPY.cart.orderType}
              </label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setGlobalOrderType('dine-in')} 
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${globalOrderType === 'dine-in' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  Stay a while
                </button>
                <button 
                  onClick={() => setGlobalOrderType('take-out')} 
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${globalOrderType === 'take-out' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  On the go
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{WARM_COPY.cart.yourName}</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder={WARM_COPY.cart.namePlaceholder}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" 
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* Section: Items */}
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                  <Coffee size={28} strokeWidth={1.5} className="text-amber-400" />
                </div>
                <p className="text-gray-600 font-medium">{WARM_COPY.cart.empty}</p>
                <p className="text-gray-400 text-sm">{WARM_COPY.cart.emptySub}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="space-y-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Coffee size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <span className="font-medium">₱{item.price * item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button 
                          onClick={() => updateQty(item.id, -1)} 
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQty(item.id, 1)} 
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item-specific settings */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={() => updateItemMeta(item.id, { type: 'dine-in' })}
                      className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all ${item.itemType === 'dine-in' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-transparent border-gray-100 text-gray-400'}`}
                    >
                      Stay a while
                    </button>
                    <button 
                      onClick={() => updateItemMeta(item.id, { type: 'take-out' })}
                      className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all ${item.itemType === 'take-out' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-transparent border-gray-100 text-gray-400'}`}
                    >
                      On the go
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder={WARM_COPY.cart.itemNote}
                    value={item.note || ''}
                    onChange={(e) => updateItemMeta(item.id, { note: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-[11px] placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-amber-200"
                  />
                </div>
              ))
            )}
          </div>

          {/* Section: Overall Order Note */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                {WARM_COPY.cart.specialInstructions}
              </label>
              <textarea 
                value={globalOrderNote}
                onChange={(e) => setGlobalOrderNote(e.target.value)}
                placeholder={WARM_COPY.cart.instructionsPlaceholder}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-24 resize-none"
              />
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-50 bg-gray-50/50 space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            <button 
              onClick={onCheckout} 
              disabled={!customerName} 
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${customerName ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {customerName ? WARM_COPY.cart.checkout : WARM_COPY.cart.checkoutDisabled} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * COMPONENT: Payment Modal - Slide-up modal for payment method selection
 */
interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onSelectMethod: (method: "cash" | "gcash") => void
}

const PaymentModal = ({ isOpen, onClose, total, onSelectMethod }: PaymentModalProps) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slideUp p-6">
        <h2 className="text-xl font-bold text-center mb-6">Payment Method</h2>
        <div className="space-y-4">
          <button 
            onClick={() => onSelectMethod('gcash')} 
            className="w-full flex items-center p-4 border border-gray-100 rounded-2xl hover:border-amber-500 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-4">
              <QrCode size={24} />
            </div>
            <div>
              <h3 className="font-bold">GCash</h3>
              <p className="text-xs text-gray-500">Scan QR Code</p>
            </div>
          </button>
          <button 
            onClick={() => onSelectMethod('cash')} 
            className="w-full flex items-center p-4 border border-gray-100 rounded-2xl hover:border-amber-500 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mr-4">
              <Banknote size={24} />
            </div>
            <div>
              <h3 className="font-bold">Cash</h3>
              <p className="text-xs text-gray-500">Pay at counter</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * COMPONENT: Success Modal - Full-screen celebration with order code
 */
interface SuccessModalProps {
  orderId: string
  onNewOrder: () => void
}

const SuccessModal = ({ orderId, onNewOrder }: SuccessModalProps) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-white/95 backdrop-blur-md">
    <div className="max-w-md w-full text-center animate-scaleIn">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} />
      </div>
      <h2 className="text-3xl font-bold mb-8">Order Received!</h2>
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-50 mb-12">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Ticket Number</p>
        <p className="text-7xl font-black text-amber-600">#{orderId}</p>
      </div>
      <button 
        onClick={onNewOrder} 
        className="bg-black text-white px-10 py-4 rounded-full font-bold hover:bg-gray-800 transition-colors"
      >
        New Order
      </button>
    </div>
  </div>
)

export function CustomerOrderTaker() {
  const [customerName, setCustomerName] = useState("")
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Menu data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [heroPhotos, setHeroPhotos] = useState<CustomerPhoto[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Kitchen queue state
  const [kitchenOrders, setKitchenOrders] = useState<ApiOrder[]>([])
  
  // Payment flow state (for current order being submitted)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "gcash" | null>(null)
  const [orderCode, setOrderCode] = useState<string>("")
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  
  // Stable warm messages (generated once when order submitted, not on every render)
  const [submittedOrderMessage, setSubmittedOrderMessage] = useState({
    creativeTitle: "",
    delightfulQuote: ""
  })
  
  // Pending payment state (locked modal until cashier confirms)
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<{
    orderCode: string
    orderId: string
    orderTotal: number
    paymentMethod: "cash" | "gcash"
  } | null>(null)
  
  // Multiple active orders tracking
  const [activeOrders, setActiveOrders] = useState<ActiveOrderState[]>([])
  
  // Currently viewed served order (for the "Order Ready" modal)
  const [viewingServedOrder, setViewingServedOrder] = useState<ActiveOrderState | null>(null)
  const [showServedModal, setShowServedModal] = useState(false)
  
  // Slow-moving items for upselling (promote items that need more sales)
  const [slowMovingItems, setSlowMovingItems] = useState<string[]>([])
  
  // Upsell selection state (items selected in the "order served" upsell modal)
  const [upsellSelections, setUpsellSelections] = useState<Map<string, { item: MenuItem; quantity: number }>>(new Map())
  
  // Cart drawer state (replaces mobile sheet with full cart drawer)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [showMobileSheet, setShowMobileSheet] = useState(false)
  
  // Global order type (dine-in or take-out for entire order)
  const [globalOrderType, setGlobalOrderType] = useState<"dine-in" | "take-out">("dine-in")
  
  // Handler to change global order type and apply to all items in cart
  const handleGlobalOrderTypeChange = (type: "dine-in" | "take-out") => {
    setGlobalOrderType(type)
    // Update all existing items in the cart to use this type
    if (currentOrder.length > 0) {
      setCurrentOrder(
        currentOrder.map((item) => ({
          ...item,
          itemType: type,
        }))
      )
    }
  }
  
  // Status bar state (shows current order status)
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string>("")
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  // Customer session state (tracks their order codes)
  const [customerSession, setCustomerSession] = useState<CustomerSession>({ codes: [], lastUpdated: Date.now() })
  
  // Orders currently being prepared (for display component)
  const [preparingOrders, setPreparingOrders] = useState<ApiOrder[]>([])
  
  // Customer's orders with their current statuses (derived from active orders + API data)
  const [customerOrderStatuses, setCustomerOrderStatuses] = useState<Array<{
    orderCode: string
    status: 'pending_payment' | 'preparing' | 'ready' | 'served'
    items: Array<{ name: string; quantity: number; price: number; status: string }>
  }>>([])
  
  // Show multi-order status banner
  const [showOrdersBanner, setShowOrdersBanner] = useState(false)
  
  // Order note state
  const [orderNote, setOrderNote] = useState("")
  
  // Item note expansion state (tracks which items have note input expanded)
  const [expandedNoteItems, setExpandedNoteItems] = useState<Set<string>>(new Set())
  
  const { toast } = useToast()

  // Load customer session and saved name from localStorage on mount
  useEffect(() => {
    const session = loadCustomerSession()
    setCustomerSession(session)
    
    // Auto-fill customer name from previous orders
    const savedName = loadSavedCustomerName()
    if (savedName) {
      setCustomerName(savedName)
    }
  }, [])

  // Load active orders from localStorage on mount
  useEffect(() => {
    const orders = loadActiveOrders()
    if (orders.length > 0) {
      setActiveOrders(orders)
      setShowOrdersBanner(true)
    }
  }, [])

  // Load pending payment state on mount (locked modal persists across refresh)
  useEffect(() => {
    const pendingPayment = loadPendingPayment()
    if (pendingPayment) {
      setPendingPaymentOrder({
        orderCode: pendingPayment.orderCode,
        orderId: pendingPayment.orderId,
        orderTotal: pendingPayment.orderTotal,
        paymentMethod: pendingPayment.paymentMethod,
      })
      setOrderCode(pendingPayment.orderCode)
      setSelectedPaymentMethod(pendingPayment.paymentMethod)
      
      // Generate stable warm messages for restored pending order
      const orderNumber = Math.floor(Math.random() * 150) + 1
      setSubmittedOrderMessage({
        creativeTitle: WARM_COPY.getCreativeTitle(orderNumber),
        delightfulQuote: WARM_COPY.getDelightful(orderNumber)
      })
      
      setOrderSubmitted(true)
      setShowPaymentDialog(true)
    }
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

  // Poll for pending payment confirmation (locked modal until confirmed)
  useEffect(() => {
    if (!pendingPaymentOrder) return

    const checkPaymentConfirmation = async () => {
      try {
        const orders = await ordersApi.getAll({ branchId: DEFAULT_BRANCH.id })
        
        // Find the pending payment order
        const order = orders.find(o => 
          o._id === pendingPaymentOrder.orderId || 
          o.id === pendingPaymentOrder.orderId ||
          (o.onlineOrderCode?.toUpperCase() === pendingPaymentOrder.orderCode.toUpperCase())
        )
        
        if (order && order.onlinePaymentStatus === 'confirmed') {
          // Payment confirmed! Clear the lock
          clearPendingPayment()
          setPendingPaymentOrder(null)
          setShowPaymentDialog(false)
          setOrderSubmitted(false)
          setOrderCode("")
          setSelectedPaymentMethod(null)
          clearCart()
          
          toast({
            title: "Payment Confirmed!",
            description: `Order ${formatOrderCode(pendingPaymentOrder.orderCode)} is now being prepared.`,
          })
        }
      } catch (error) {
        console.error("Error checking payment confirmation:", error)
      }
    }

    // Check immediately
    checkPaymentConfirmation()
    
    // Then poll every 3 seconds (more frequent for payment confirmation)
    const paymentInterval = setInterval(checkPaymentConfirmation, 3000)
    
    return () => clearInterval(paymentInterval)
  }, [pendingPaymentOrder])

  // Fetch slow-moving items for upselling promotions
  useEffect(() => {
    const fetchSlowMovingItems = async () => {
      try {
        const insights = await insightsApi.getInsights(DEFAULT_BRANCH.id)
        if (insights.productPerformance?.slowMovingItems?.length > 0) {
          // Get names of slow-moving items and shuffle them
          const slowItems = insights.productPerformance.slowMovingItems
            .map(item => item.name)
            .sort(() => Math.random() - 0.5) // Randomize order
          setSlowMovingItems(slowItems)
        }
      } catch (error) {
        console.error("Error fetching slow-moving items:", error)
      }
    }
    
    fetchSlowMovingItems()
  }, [])

  // Poll for all active orders status (payment confirmation and served status)
  useEffect(() => {
    if (activeOrders.length === 0) return

    const checkAllOrderStatuses = async () => {
      try {
        const orders = await ordersApi.getAll({ branchId: DEFAULT_BRANCH.id })
        const session = loadCustomerSession()
        
        // Build statuses for customer's orders
        const statuses: typeof customerOrderStatuses = []
        let updatedActiveOrders = [...activeOrders]
        let hasChanges = false
        
        for (const activeOrder of activeOrders) {
          // Find the order in the API response
          const apiOrder = orders.find(o => 
            o._id === activeOrder.orderId || 
            o.id === activeOrder.orderId ||
            (o.onlineOrderCode?.toUpperCase() === activeOrder.orderCode.toUpperCase())
          )
          
          if (apiOrder) {
            // Check payment status
            const paymentConfirmed = apiOrder.onlinePaymentStatus === 'confirmed'
            
            // Check if all items are served
            const allItemsServed = apiOrder.items.every(item => item.status === 'served')
            const allAppendedServed = !apiOrder.appendedOrders || apiOrder.appendedOrders.length === 0 || 
              apiOrder.appendedOrders.every(appended => appended.items.every(item => item.status === 'served'))
            const fullyServed = allItemsServed && allAppendedServed
            
            // Determine status
            let status: 'pending_payment' | 'preparing' | 'ready' | 'served' = 'pending_payment'
            if (!paymentConfirmed) {
              status = 'pending_payment'
            } else if (fullyServed) {
              status = 'served'
            } else if (apiOrder.items.some(item => item.status === 'ready')) {
              status = 'ready'
            } else {
              status = 'preparing'
            }
            
            // Collect items with their statuses
            const itemsWithStatus = apiOrder.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              status: item.status
            }))
            
            statuses.push({
              orderCode: activeOrder.orderCode,
              status,
              items: itemsWithStatus
            })
            
            // Check if this order just became served (and wasn't before)
            if (fullyServed && !activeOrder.fullyServed) {
              hasChanges = true
              // Update the active order state
              const idx = updatedActiveOrders.findIndex(o => o.orderCode === activeOrder.orderCode)
              if (idx >= 0) {
                updatedActiveOrders[idx] = { 
                  ...updatedActiveOrders[idx], 
                  fullyServed: true, 
                  paymentConfirmed,
                  items: itemsWithStatus
                }
              }
              
              // Show the served modal for this order
              setViewingServedOrder({
                ...activeOrder,
                fullyServed: true,
                paymentConfirmed,
                items: itemsWithStatus
              })
              setShowServedModal(true)
              
              // Update localStorage
              updateActiveOrderStatus(activeOrder.orderCode, { fullyServed: true, paymentConfirmed })
            } else if (paymentConfirmed && !activeOrder.paymentConfirmed) {
              hasChanges = true
              // Update payment confirmed status
              const idx = updatedActiveOrders.findIndex(o => o.orderCode === activeOrder.orderCode)
              if (idx >= 0) {
                updatedActiveOrders[idx] = { ...updatedActiveOrders[idx], paymentConfirmed: true }
              }
              updateActiveOrderStatus(activeOrder.orderCode, { paymentConfirmed: true })
            }
          }
        }
        
        if (hasChanges) {
          setActiveOrders(updatedActiveOrders)
        }
        setCustomerOrderStatuses(statuses)
        
        // Show banner if there are any active orders
        if (statuses.length > 0) {
          setShowOrdersBanner(true)
        }
      } catch (error) {
        console.error("Error checking order statuses:", error)
      }
    }

    // Check immediately
    checkAllOrderStatuses()
    
    // Then poll every 5 seconds
    const statusInterval = setInterval(checkAllOrderStatuses, 5000)
    
    return () => clearInterval(statusInterval)
  }, [activeOrders])

  const fetchMenuData = async () => {
    setIsLoadingData(true)
    try {
      const [itemsData, categoriesData, heroPhotosData] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
        customerPhotosApi.getActive().catch(() => []), // Gracefully handle if API fails
      ])
      
      // Set hero photos (fallback to empty if API fails)
      setHeroPhotos(heroPhotosData)

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

      // Only show public items and categories - no fallback data
      setMenuItems(transformedItems)
      setCategories(transformedCategories)
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

  // Fetch orders that are currently being prepared (for queue display)
  const fetchPreparingOrders = useCallback(async () => {
    try {
      const orders = await ordersApi.getPreparingOrders(DEFAULT_BRANCH.id)
      setPreparingOrders(orders)
    } catch (error) {
      console.error("Error fetching preparing orders:", error)
    }
  }, [])

  // Calculate order total
  const orderTotal = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [currentOrder])

  // Get total items in cart
  const totalItems = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.quantity, 0)
  }, [currentOrder])

  // Get promotional items for upselling (memoized to prevent shuffling on re-render)
  const promoItems = useMemo(() => {
    // Only consider items that are public (visible to online customers)
    const publicItems = menuItems.filter(item => item.isPublic === true)
    
    let items: MenuItem[] = []
    
    if (slowMovingItems.length > 0) {
      // Filter public items by slow-moving item names
      items = publicItems.filter(item => 
        slowMovingItems.some(name => 
          name.toLowerCase() === item.name.toLowerCase()
        )
      ).slice(0, 4)
    }
    
    // If no slow-moving items found, use random public items (shuffled once)
    if (items.length < 4) {
      const otherItems = publicItems
        .filter(item => !items.some(p => p.id === item.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4 - items.length)
      items = [...items, ...otherItems]
    }
    
    return items
  }, [menuItems, slowMovingItems])

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

  // Toggle item type between dine-in and take-out
  const toggleItemType = (itemId: string) => {
    setCurrentOrder(
      currentOrder.map((item) =>
        item.id === itemId
          ? { ...item, itemType: item.itemType === "dine-in" ? "take-out" : "dine-in" }
          : item
      )
    )
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

  // Update item meta (type and/or note) - used by CartDrawer
  const updateItemMeta = (itemId: string, updates: { type?: "dine-in" | "take-out"; note?: string }) => {
    setCurrentOrder(
      currentOrder.map((item) => {
        if (item.id === itemId) {
          const newItem = { ...item }
          if (updates.type !== undefined) {
            newItem.itemType = updates.type
          }
          if (updates.note !== undefined) {
            newItem.note = updates.note
          }
          return newItem
        }
        return item
      })
    )
  }

  // Clear cart (but preserve customer name for returning customers)
  const clearCart = () => {
    setCurrentOrder([])
    // Restore saved customer name instead of clearing
    const savedName = loadSavedCustomerName()
    setCustomerName(savedName)
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

      const createdOrder = await ordersApi.create({
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
      
      // Save customer name for auto-fill on next orders
      saveCustomerName(customerName)

      // Track the submitted order for status polling
      const finalOrderId = createdOrder._id || createdOrder.id || orderId
      
      // Generate stable warm messages for this order (won't change on re-renders)
      const orderNumber = Math.floor(Math.random() * 150) + 1
      setSubmittedOrderMessage({
        creativeTitle: WARM_COPY.getCreativeTitle(orderNumber),
        delightfulQuote: WARM_COPY.getDelightful(orderNumber)
      })
      
      setOrderSubmitted(true)
      
      // Save pending payment state (locks modal until cashier confirms)
      const pendingPayment: PendingPaymentState = {
        orderCode: orderCode,
        orderId: finalOrderId,
        orderTotal: orderTotal,
        paymentMethod: selectedPaymentMethod,
        submittedAt: Date.now(),
      }
      savePendingPayment(pendingPayment)
      setPendingPaymentOrder({
        orderCode: orderCode,
        orderId: finalOrderId,
        orderTotal: orderTotal,
        paymentMethod: selectedPaymentMethod,
      })
      
      // Create active order entry for multi-order tracking
      const newActiveOrder: ActiveOrderState = {
        orderId: finalOrderId,
        orderCode: orderCode,
        customerName: customerName.trim(),
        orderTotal: orderTotal,
        paymentMethod: selectedPaymentMethod,
        submittedAt: Date.now(),
        paymentConfirmed: false,
        fullyServed: false,
        items: currentOrder.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }
      
      // Add to active orders
      setActiveOrders(prev => [...prev, newActiveOrder])
      saveActiveOrder(newActiveOrder)
      setShowOrdersBanner(true)
      
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

  // Start new order (clears current cart but keeps active orders tracking)
  const startNewOrder = () => {
    clearCart()
    setShowPaymentDialog(false)
    setOrderCode("")
    setOrderSubmitted(false)
    setSelectedPaymentMethod(null)
    setUpsellSelections(new Map())
    setShowServedModal(false)
    setViewingServedOrder(null)
  }
  
  // Close the served order modal (order stays in banner for the session)
  const closeServedOrderModal = () => {
    setShowServedModal(false)
    setViewingServedOrder(null)
    setUpsellSelections(new Map())
  }
  
  // Permanently remove an order from tracking (manual clear)
  const clearOrderFromTracking = (orderCodeToClear: string) => {
    removeActiveOrder(orderCodeToClear)
    setActiveOrders(prev => prev.filter(o => o.orderCode !== orderCodeToClear))
    setCustomerOrderStatuses(prev => prev.filter(o => o.orderCode !== orderCodeToClear))
    
    // Close modal if viewing this order
    if (viewingServedOrder?.orderCode === orderCodeToClear) {
      setShowServedModal(false)
      setViewingServedOrder(null)
    }
    
    // Hide banner if no more active orders
    const remainingOrders = activeOrders.filter(o => o.orderCode !== orderCodeToClear)
    if (remainingOrders.length === 0) {
      setShowOrdersBanner(false)
    }
  }

  // Upsell item management
  const addUpsellItem = (item: MenuItem) => {
    setUpsellSelections(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(item.id)
      if (existing) {
        newMap.set(item.id, { item, quantity: existing.quantity + 1 })
      } else {
        newMap.set(item.id, { item, quantity: 1 })
      }
      return newMap
    })
  }

  const removeUpsellItem = (itemId: string) => {
    setUpsellSelections(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(itemId)
      if (existing && existing.quantity > 1) {
        newMap.set(itemId, { item: existing.item, quantity: existing.quantity - 1 })
      } else {
        newMap.delete(itemId)
      }
      return newMap
    })
  }

  const upsellTotal = useMemo(() => {
    let total = 0
    upsellSelections.forEach(({ item, quantity }) => {
      total += item.price * quantity
    })
    return total
  }, [upsellSelections])

  // Add upsell items to cart and go to cart
  const addUpsellToCart = () => {
    // Add all upsell items in a single state update to avoid stale closure issues
    setCurrentOrder(prevOrder => {
      let newOrder = [...prevOrder]
      
      upsellSelections.forEach(({ item, quantity }) => {
        const existingItem = newOrder.find(
          (orderItem) => orderItem.name === item.name && orderItem.itemType === "dine-in"
        )

        if (existingItem) {
          // Update existing item quantity
          newOrder = newOrder.map((orderItem) =>
            orderItem.name === item.name && orderItem.itemType === "dine-in"
              ? { ...orderItem, quantity: orderItem.quantity + quantity }
              : orderItem
          )
        } else {
          // Add new item with full quantity
          const uniqueId = `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          newOrder.push({
            ...item,
            id: uniqueId,
            quantity: quantity,
            itemType: "dine-in",
            status: "pending",
          })
        }
      })
      
      return newOrder
    })
    
    // Clear the served order from tracking (user is ordering more)
    if (viewingServedOrder) {
      clearOrderFromTracking(viewingServedOrder.orderCode)
    }
    
    // Reset modal state
    setUpsellSelections(new Map())
    setShowServedModal(false)
    setViewingServedOrder(null)
    
    // Open cart drawer
    setIsCartOpen(true)
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
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-amber-100">
      <CustomStyles />
      
      {/* Status Bar - Shows current order status */}
      <StatusBar 
        status={activeOrderStatus} 
        orderId={activeOrderId || "---"} 
        onClose={() => setActiveOrderStatus(null)} 
      />
      
      {/* Fixed Header/Navbar */}
      <nav 
        className="fixed top-0 w-full z-30 bg-[#FDFDFD]/80 backdrop-blur-md border-b border-gray-100" 
        style={{ top: activeOrderStatus ? '48px' : '0' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-amber-600/20">
              <Coffee size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">KOPISINA</span>
              <span className="text-[10px] text-gray-500 font-medium">x ZION'S</span>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)} 
            className="relative p-3 hover:bg-gray-50 rounded-full transition-colors group"
          >
            <ShoppingBag size={24} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      <main className={`pt-32 pb-20 px-4 max-w-7xl mx-auto transition-all ${activeOrderStatus ? 'mt-12' : ''}`}>
        {/* Hero Section with Customer Photo Collage */}
        <header className="relative py-20 md:py-28 text-center overflow-hidden rounded-3xl mb-8">
          {/* Customer Photo Collage - 6 unique photos in a clean grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2">
            {(heroPhotos.length > 0 ? heroPhotos : [1, 2, 3, 4, 5, 6]).map((photo, index) => (
              <div 
                key={typeof photo === 'number' ? photo : photo._id} 
                className="bg-cover bg-center"
                style={{
                  backgroundImage: typeof photo === 'number' 
                    ? `url(/customer-photos/photo-${photo}.jpg)`
                    : `url(${getImageUrl(photo.imageUrl)})`,
                  backgroundColor: '#d4a574',
                }}
              />
            ))}
          </div>
          
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60"></div>
          
          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl mx-auto px-4 space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white drop-shadow-lg">
              Where the <span className="text-amber-400">Agusan River</span> meets your cravings.
            </h1>
            <QueueIndicator ordersInQueue={kitchenStats.ordersInQueue} estimatedWait={kitchenStats.estimatedWait} />
            
            {/* Photo Credit CTA */}
            <p className="text-xs text-white/70 pt-4">
              {WARM_COPY.hero.photoCredit} <a href="https://facebook.com/kopisina242" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-semibold hover:underline">{BRAND.facebook}</a>
            </p>
          </div>
        </header>

        {/* Active Orders Banner - New Amber Style */}
        {showOrdersBanner && customerOrderStatuses.length > 0 && (
          <div className="mb-8 animate-scaleIn">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-amber-600" />
                  <span className="font-bold text-amber-900">{WARM_COPY.orders.bannerTitle}</span>
                  <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {customerOrderStatuses.length}
                  </span>
                </div>
                <button 
                  onClick={() => setShowOrdersBanner(false)}
                  className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-amber-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {customerOrderStatuses.map((order) => (
                  <div 
                    key={order.orderCode}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl bg-white border",
                      order.status === 'served' ? 'border-green-200' :
                      order.status === 'ready' ? 'border-amber-300' :
                      order.status === 'preparing' ? 'border-blue-200' :
                      'border-gray-200'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-lg">{formatOrderCode(order.orderCode)}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        order.status === 'served' ? 'bg-green-100 text-green-700' :
                        order.status === 'ready' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {order.status === 'pending_payment' ? WARM_COPY.orders.statusPending :
                         order.status === 'preparing' ? WARM_COPY.orders.statusPreparing :
                         order.status === 'ready' ? WARM_COPY.orders.statusReady :
                         WARM_COPY.orders.statusServed}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === 'served' && (
                        <button
                          onClick={() => {
                            const activeOrder = activeOrders.find(o => o.orderCode === order.orderCode)
                            if (activeOrder) {
                              setViewingServedOrder({ ...activeOrder, items: order.items })
                              setShowServedModal(true)
                            }
                          }}
                          className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {WARM_COPY.orders.view}
                        </button>
                      )}
                      <button
                        onClick={() => clearOrderFromTracking(order.orderCode)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        title="Remove from tracking"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Currently Being Prepared - Compact Badge Style */}
        {preparingOrders.length > 0 && (
          <div className="mb-8 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="font-bold text-gray-900">{WARM_COPY.preparing.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {preparingOrders.map((order) => {
                const orderCode = order.onlineOrderCode?.toUpperCase()
                const isCustomerOrder = orderCode && customerSession.codes.includes(orderCode)
                const displayCode = orderCode ? formatOrderCode(orderCode) : "Counter"
                
                return (
                  <span
                    key={order.id}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-bold transition-all",
                      isCustomerOrder
                        ? "bg-amber-600 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {displayCode}
                    {isCustomerOrder && <span className="ml-1 text-amber-200">({WARM_COPY.preparing.yours})</span>}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Search and Category Filters */}
        <div className="mb-12 space-y-6">
          <div className="max-w-md mx-auto relative group">
            <div className="absolute inset-y-0 left-4 flex items-center">
              <Search size={18} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder={WARM_COPY.search.placeholder}
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:border-amber-500 outline-none transition-all shadow-sm" 
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Category Filter Buttons */}
          <div className="flex overflow-x-auto pb-2 gap-2 justify-center no-scrollbar">
            <button 
              onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                selectedCategory === null ? 'bg-black text-white' : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => { setSelectedCategory(cat.id); setSearchQuery(""); }}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id ? 'bg-black text-white' : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid - New ProductCard Design */}
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-10 w-10 animate-spin text-gray-400 mb-4" />
            <p className="text-base font-medium text-gray-500">Loading menu...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Coffee className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-xl font-semibold text-gray-500 mb-2">Menu not available</p>
            <p className="text-sm text-gray-400">Please check back later</p>
          </div>
        ) : getDisplayedItems().length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-600 mb-2">No items found</p>
            <p className="text-sm text-gray-500 mb-4">No menu items match "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery("")} 
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {getDisplayedItems().map(item => (
              <ProductCard 
                key={item.id} 
                item={item} 
                onAdd={(item) => addItem(item, globalOrderType)} 
                quantityInCart={getItemQuantityInCart(item.name)} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer - Slides from right */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={currentOrder}
        updateQty={updateQuantity}
        updateItemMeta={updateItemMeta}
        customerName={customerName}
        setCustomerName={setCustomerName}
        globalOrderType={globalOrderType}
        setGlobalOrderType={handleGlobalOrderTypeChange}
        globalOrderNote={orderNote}
        setGlobalOrderNote={setOrderNote}
        onCheckout={() => { setIsCartOpen(false); handleCheckout(); }}
      />

      {/* Success Modal - Shows after payment confirmed */}
      {showSuccessModal && (
        <SuccessModal 
          orderId={formatOrderCode(orderCode)} 
          onNewOrder={() => {
            setShowSuccessModal(false)
            startNewOrder()
          }} 
        />
      )}

      {/* Owner Badge */}
      <OwnerBadge />

      {/* Payment Dialog - Locked when order submitted until payment confirmed */}
      <Dialog 
        open={showPaymentDialog} 
        onOpenChange={(open) => {
          // Prevent closing if there's a pending payment (locked state)
          if (!open && (orderSubmitted || pendingPaymentOrder)) {
            return
          }
          setShowPaymentDialog(open)
        }}
      >
        <DialogContent 
          className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
          showCloseButton={!orderSubmitted && !pendingPaymentOrder}
          onPointerDownOutside={(orderSubmitted || pendingPaymentOrder) ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={(orderSubmitted || pendingPaymentOrder) ? (e) => e.preventDefault() : undefined}
        >
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
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Order for</span>
                    <span className="font-semibold text-gray-900">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Items</span>
                    <span className="font-semibold text-gray-900">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-amber-600">₱{orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedPaymentMethod("gcash")}
                    className={cn(
                      "w-full flex items-center p-4 border rounded-2xl transition-all text-left",
                      selectedPaymentMethod === "gcash"
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-100 hover:border-amber-300"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-4">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">{WARM_COPY.payment.gcash}</h3>
                      <p className="text-xs text-gray-500">{WARM_COPY.payment.gcashSub}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod("cash")}
                    className={cn(
                      "w-full flex items-center p-4 border rounded-2xl transition-all text-left",
                      selectedPaymentMethod === "cash"
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-100 hover:border-amber-300"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mr-4">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">{WARM_COPY.payment.cash}</h3>
                      <p className="text-xs text-gray-500">{WARM_COPY.payment.cashSub}</p>
                    </div>
                  </button>
                </div>

                <button
                  className={cn(
                    "w-full py-4 mt-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    selectedPaymentMethod && !isSubmitting
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-95"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                  disabled={!selectedPaymentMethod || isSubmitting}
                  onClick={submitOrder}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {WARM_COPY.payment.submitting}
                    </>
                  ) : (
                    <>{WARM_COPY.payment.confirm} <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Order Submitted - Screenshot-worthy waiting screen */}
              <div className="py-6 text-center">
                {/* Creative identifier - viral moment */}
                <p className="text-sm text-amber-600 font-medium mb-4">
  {submittedOrderMessage.creativeTitle}
                </p>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{WARM_COPY.submitted.title}</h2>
                <p className="text-gray-500 mb-6">
                  {WARM_COPY.submitted.subtitle}
                </p>

                {/* Order Code - Large, minimal, screenshot-worthy */}
                <div className="bg-gray-900 text-white rounded-3xl p-8 mb-6">
                  <p className="text-[10px] uppercase tracking-widest mb-3 text-gray-400">Your ticket</p>
                  <p className="text-6xl font-black tracking-wider">{formatOrderCode(pendingPaymentOrder?.orderCode || orderCode)}</p>
                  <p className="text-xs text-gray-500 mt-4 italic">"{submittedOrderMessage.delightfulQuote}"</p>
                </div>

                {/* Payment Instructions */}
                {(pendingPaymentOrder?.paymentMethod || selectedPaymentMethod) === "gcash" ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-blue-900 text-sm">{WARM_COPY.payment.gcash}</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 mb-4 flex flex-col items-center">
                      <img 
                        src="/gcash-qr.jpg" 
                        alt="GCash QR Code" 
                        className="w-36 h-36 object-contain mb-2"
                      />
                    </div>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Maria Krisnela Burdeos</p>
                      <p>0965 082 3998</p>
                      <p className="font-bold text-lg">₱{(pendingPaymentOrder?.orderTotal || orderTotal).toFixed(2)}</p>
                    </div>
                    <p className="mt-3 pt-3 border-t border-blue-100 text-xs text-blue-700">
                      {WARM_COPY.submitted.gcashInstructions}
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-900 text-sm">{WARM_COPY.payment.cash}</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="text-4xl font-black text-green-600">₱{(pendingPaymentOrder?.orderTotal || orderTotal).toFixed(2)}</p>
                    </div>
                    <p className="mt-3 pt-3 border-t border-green-100 text-xs text-green-700">
                      {WARM_COPY.submitted.cashInstructions}
                    </p>
                  </div>
                )}

                {/* Waiting indicator */}
                <div className="flex items-center justify-center gap-3 text-amber-700 bg-amber-50 rounded-xl py-3 px-4">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium">{WARM_COPY.submitted.waitingTitle}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {WARM_COPY.submitted.waitingSub}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Served Order Modal - Shows when an order is ready */}
      <Dialog 
        open={showServedModal} 
        onOpenChange={setShowServedModal}
      >
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-3xl">
          {viewingServedOrder && (
            <div className="py-4 text-center">
              {/* Screenshot-worthy header */}
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-1">{WARM_COPY.success.title}</h2>
              <p className="text-gray-500 text-sm mb-6">{WARM_COPY.success.pickup}</p>
              
              {/* Screenshot-worthy order code */}
              <div className="bg-gray-900 text-white p-6 rounded-3xl mb-6">
                <p className="text-[10px] uppercase tracking-widest mb-2 text-gray-400">Your ticket</p>
                <p className="text-5xl font-black tracking-wider">{formatOrderCode(viewingServedOrder.orderCode)}</p>
                <p className="text-xs text-gray-500 mt-4 italic">"{WARM_COPY.success.enjoyMessage}"</p>
              </div>

              {/* Order Items List */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-gray-400 mb-3">{WARM_COPY.success.subtitle}</p>
                <div className="space-y-2">
                  {viewingServedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-gray-500">₱{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-amber-600">₱{viewingServedOrder.orderTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Upsell Section - Promote slow-moving items */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-left">
                <h3 className="font-bold text-amber-900 mb-3">
                  {WARM_COPY.success.upsellTitle}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {promoItems.map(item => {
                    const selection = upsellSelections.get(item.id)
                    const quantity = selection?.quantity || 0
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative flex items-center gap-2 p-2 bg-white rounded-xl border transition-all",
                          quantity > 0 
                            ? "border-amber-400 ring-1 ring-amber-200" 
                            : "border-amber-100 hover:border-amber-300"
                        )}
                      >
                        <button
                          onClick={() => addUpsellItem(item)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left overflow-hidden"
                        >
                          <img
                            src={item.onlineImage ? getImageUrl(item.onlineImage) : "/placeholder.svg"}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs font-bold text-amber-600">₱{item.price.toFixed(0)}</p>
                          </div>
                        </button>
                        {quantity > 0 && (
                          <div className="w-6 h-6 min-w-[24px] flex-shrink-0 rounded-full bg-amber-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{quantity}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Upsell Summary */}
              {upsellSelections.size > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-amber-800">Your selections:</span>
                    <span className="text-sm font-bold text-amber-600">₱{upsellTotal.toFixed(0)}</span>
                  </div>
                  <div className="space-y-1">
                    {Array.from(upsellSelections.values()).map(({ item, quantity }) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-amber-700">
                        <span>{item.name} × {quantity}</span>
                        <span>₱{(item.price * quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {upsellSelections.size > 0 ? (
                  <button 
                    className="w-full py-4 rounded-xl font-bold bg-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-2" 
                    onClick={addUpsellToCart}
                  >
                    <ShoppingBag size={20} />
                    Add to bag - ₱{upsellTotal.toFixed(0)}
                  </button>
                ) : (
                  <button 
                    className="w-full py-4 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-all flex items-center justify-center gap-2" 
                    onClick={() => {
                      clearOrderFromTracking(viewingServedOrder.orderCode)
                      startNewOrder()
                    }}
                  >
                    <Plus size={20} />
                    {WARM_COPY.success.orderMore}
                  </button>
                )}
                <button 
                  className="w-full py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  onClick={closeServedOrderModal}
                >
                  {WARM_COPY.success.done}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
