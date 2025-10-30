"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, X, Calendar } from "lucide-react"
import { ordersApi, menuItemsApi, categoriesApi, getImageUrl, type MenuItem as ApiMenuItem, type Category as ApiCategory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
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

interface HistoricalOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function HistoricalOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: HistoricalOrderDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const [customerName, setCustomerName] = useState("")
  const [orderDate, setOrderDate] = useState("")
  const [orderTime, setOrderTime] = useState("14:00") // Default 2pm
  const [orderType, setOrderType] = useState<"dine-in" | "take-out">("dine-in")
  const [items, setItems] = useState<OrderItem[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Menu data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)

  // Load menu data when dialog opens
  useEffect(() => {
    if (open) {
      fetchMenuData()
    }
  }, [open])

  const fetchMenuData = async () => {
    setIsLoadingMenu(true)
    try {
      const [itemsData, categoriesData] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
      ])

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
    } catch (error) {
      console.error("Error fetching menu data:", error)
      toast({
        title: "Error",
        description: "Failed to load menu items.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMenu(false)
    }
  }

  const getDisplayedItems = () => {
    if (selectedCategory) {
      return menuItems.filter((item) => item.category === selectedCategory)
    }
    return menuItems.filter((item) => item.isBestSeller)
  }

  const addItemFromMenu = (menuItem: MenuItem) => {
    const existingItem = items.find((item) => item.id === menuItem.id)

    if (existingItem) {
      setItems(
        items.map((item) =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setItems([...items, { ...menuItem, quantity: 1 }])
    }
  }

  const updateItemQuantity = (itemId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Missing Customer Name",
        description: "Please enter a customer name.",
        variant: "destructive",
      })
      return
    }

    if (!orderDate) {
      toast({
        title: "Missing Date",
        description: "Please select an order date.",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to the order.",
        variant: "destructive",
      })
      return
    }

    if (isPaid && !paymentMethod) {
      toast({
        title: "Missing Payment Method",
        description: "Please select a payment method for paid orders.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Combine date and time to create timestamp
      const [hours, minutes] = orderTime.split(':').map(Number)
      const orderDateTime = new Date(orderDate)
      orderDateTime.setHours(hours, minutes, 0, 0)
      const timestamp = orderDateTime.getTime()

      await ordersApi.create({
        id: `order-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: customerName.trim(),
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          status: "served", // Historical orders are marked as served
          itemType: orderType,
        })),
        createdAt: timestamp,
        isPaid,
        paymentMethod: isPaid ? paymentMethod : null,
        orderType,
        appendedOrders: [],
        orderTakerName: user?.name,
        orderTakerEmail: user?.email,
      })

      toast({
        title: "Historical Order Created",
        description: `Order for ${customerName} on ${orderDate} has been created.`,
      })

      // Reset form
      setCustomerName("")
      setOrderDate("")
      setOrderTime("14:00")
      setOrderType("dine-in")
      setItems([])
      setIsPaid(false)
      setPaymentMethod(null)

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating historical order:", error)
      toast({
        title: "Error",
        description: "Failed to create historical order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Historical Order
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Create an order with a custom date for historical record-keeping.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 py-4">
          {/* Left Column: Menu */}
          <div className="lg:col-span-2 space-y-4">
            {/* Categories */}
            <div>
              <Label className="mb-2 block">Categories</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-shrink-0 border text-xs ${
                    selectedCategory === null
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${selectedCategory === null ? "bg-blue-700/30" : "bg-slate-100"}`}>⭐</div>
                  <span className="font-bold">Best</span>
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-shrink-0 border text-xs ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white border-blue-700"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={getImageUrl(category.image)}
                      alt={category.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <span className="font-bold">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div>
              <Label className="mb-2 block">Menu Items</Label>
              {isLoadingMenu ? (
                <div className="text-center py-8 text-slate-500">Loading menu...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {getDisplayedItems().map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItemFromMenu(item)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-xs"
                    >
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <span className="font-semibold text-center line-clamp-1">{item.name}</span>
                      <span className="text-slate-600">₱{item.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Details */}
          <div className="lg:col-span-1 space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderTime">Order Time</Label>
              <Input
                id="orderTime"
                type="time"
                value={orderTime}
                onChange={(e) => setOrderTime(e.target.value)}
              />
            </div>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={orderType === "dine-in" ? "default" : "outline"}
                onClick={() => setOrderType("dine-in")}
                className="flex-1 text-xs"
                size="sm"
              >
                🍽️ Dine In
              </Button>
              <Button
                type="button"
                variant={orderType === "take-out" ? "default" : "outline"}
                onClick={() => setOrderType("take-out")}
                className="flex-1 text-xs"
                size="sm"
              >
                🥡 Take Out
              </Button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Order Items</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-slate-600">₱{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-sm font-bold">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="font-bold">Total:</span>
                <span className="text-lg font-bold">₱{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="space-y-2 border-t pt-4">
            <Label>Payment Status</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isPaid ? "default" : "outline"}
                onClick={() => {
                  setIsPaid(false)
                  setPaymentMethod(null)
                }}
                className="flex-1"
              >
                Unpaid
              </Button>
              <Button
                type="button"
                variant={isPaid ? "default" : "outline"}
                onClick={() => setIsPaid(true)}
                className="flex-1"
              >
                Paid
              </Button>
            </div>

            {isPaid && (
              <div className="space-y-2 mt-3">
                <Label>Payment Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="flex-1"
                  >
                    💵 Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "gcash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("gcash")}
                    className="flex-1"
                  >
                    Ⓖ GCash
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 justify-end border-t pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
