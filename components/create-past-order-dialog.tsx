"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CalendarIcon, Plus, Minus, X, Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ordersApi, menuItemsApi, categoriesApi, getImageUrl } from "@/lib/api"
import {
  FALLBACK_MENU_ITEMS,
  FALLBACK_CATEGORIES,
  type MenuItem,
  type Category
} from "@/components/order-taker"

interface OrderItem {
  id: string
  name: string
  owner?: "john" | "elwin"
  price: number
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
  itemType?: "dine-in" | "take-out"
  note?: string
}

interface CreatePastOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreatePastOrderDialog({ open, onOpenChange, onSuccess }: CreatePastOrderDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // Form state
  const [customerName, setCustomerName] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "split">("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [gcashAmount, setGcashAmount] = useState("")
  const [orderType, setOrderType] = useState<"dine-in" | "take-out">("dine-in")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(FALLBACK_MENU_ITEMS)
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)

  // Load menu items from API
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setIsLoadingMenu(true)
        const [itemsResponse, categoriesResponse] = await Promise.all([
          menuItemsApi.getAll(),
          categoriesApi.getAll()
        ])

        if (itemsResponse && itemsResponse.length > 0) {
          const transformedItems: MenuItem[] = itemsResponse.map(item => ({
            id: item._id || item.id,
            name: item.name,
            owner: item.owner,
            price: item.price,
            category: item.category,
            image: item.image || "/placeholder.png",
            isBestSeller: item.isBestSeller
          }))
          setMenuItems(transformedItems)
        }

        if (categoriesResponse && categoriesResponse.length > 0) {
          const transformedCategories: Category[] = categoriesResponse.map(cat => ({
            id: cat._id || cat.id,
            name: cat.name,
            image: cat.image || "/placeholder.png"
          }))
          setCategories(transformedCategories)
        }
      } catch (error) {
        console.error("Error loading menu:", error)
        // Fallback data is already set
      } finally {
        setIsLoadingMenu(false)
      }
    }

    if (open) {
      loadMenu()
    }
  }, [open])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCustomerName("")
      setSelectedDate(new Date())
      setOrderItems([])
      setPaymentMethod("cash")
      setAmountReceived("")
      setCashAmount("")
      setGcashAmount("")
      setOrderType("dine-in")
      setSelectedCategory("all")
      setSearchQuery("")
    }
  }, [open])

  // Calculate order total
  const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Filter menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Add item to order
  const addItem = (menuItem: MenuItem) => {
    const existingItem = orderItems.find(item => item.id === menuItem.id)

    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        id: menuItem.id,
        name: menuItem.name,
        owner: menuItem.owner,
        price: menuItem.price,
        quantity: 1,
        status: "served", // Auto-mark as served for past orders
        itemType: orderType
      }
      setOrderItems([...orderItems, newItem])
    }
  }

  // Update item quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  // Remove item from order
  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId))
  }

  // Handle amount input
  const handleAmountChange = (value: string, setter: (val: string) => void) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  // Validate form
  const isValid = () => {
    if (!customerName.trim()) return false
    if (orderItems.length === 0) return false

    if (paymentMethod === "split") {
      const cash = parseFloat(cashAmount) || 0
      const gcash = parseFloat(gcashAmount) || 0
      return cash + gcash >= orderTotal
    } else if (paymentMethod === "cash") {
      const received = parseFloat(amountReceived) || 0
      return received >= orderTotal
    }
    // GCash is always exact amount
    return true
  }

  // Submit order
  const handleSubmit = async () => {
    if (!isValid()) return

    setIsSubmitting(true)

    try {
      // Set timestamp to 10 AM of selected date
      const selectedDateTime = new Date(selectedDate)
      selectedDateTime.setHours(10, 0, 0, 0)
      const createdAtTimestamp = selectedDateTime.getTime()

      // Prepare order data
      const orderData = {
        id: `order-${createdAtTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: customerName.trim(),
        items: orderItems.map(item => ({
          ...item,
          status: "served" as const // Ensure all items are marked as served
        })),
        createdAt: createdAtTimestamp,
        isPaid: true, // Auto-mark as paid
        paymentMethod,
        orderType,
        cashAmount: paymentMethod === "cash"
          ? parseFloat(amountReceived) || orderTotal
          : paymentMethod === "split"
            ? parseFloat(cashAmount) || 0
            : undefined,
        gcashAmount: paymentMethod === "gcash"
          ? orderTotal
          : paymentMethod === "split"
            ? parseFloat(gcashAmount) || 0
            : undefined,
        amountReceived: paymentMethod === "cash"
          ? parseFloat(amountReceived) || orderTotal
          : paymentMethod === "split"
            ? parseFloat(cashAmount) || 0
            : orderTotal,
        orderTakerName: user?.name,
        orderTakerEmail: user?.email,
        notes: [{
          id: `note-${Date.now()}`,
          content: `Created retroactively by ${user?.name || "Unknown"}`,
          createdAt: Date.now(),
          createdBy: user?.name,
          createdByEmail: user?.email
        }]
      }

      await ordersApi.create(orderData)

      toast({
        title: "Past order created",
        description: `Order for ${customerName} on ${format(selectedDate, "PPP")} has been created.`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating past order:", error)
      toast({
        title: "Error",
        description: "Failed to create past order. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate change
  const calculateChange = () => {
    if (paymentMethod === "gcash") return 0
    if (paymentMethod === "split") {
      const cash = parseFloat(cashAmount) || 0
      return cash > 0 ? (parseFloat(amountReceived) || cash) - cash : 0
    }
    return (parseFloat(amountReceived) || 0) - orderTotal
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Past Order</DialogTitle>
          <DialogDescription>
            Create a backdated order to correct historical records. Order will be automatically marked as served and paid.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Left Column - Order Details */}
            <div className="space-y-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Order Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Customer Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Order Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOrderType("dine-in")}
                    className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                      orderType === "dine-in"
                        ? "bg-blue-50 border-blue-600 text-blue-700 shadow-md"
                        : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    🍽️ Dine-in
                  </button>
                  <button
                    onClick={() => setOrderType("take-out")}
                    className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all border shadow-sm ${
                      orderType === "take-out"
                        ? "bg-orange-50 border-orange-600 text-orange-700 shadow-md"
                        : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    🥡 Take-out
                  </button>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Order Items ({orderItems.length})
                </label>
                {orderItems.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500">
                    No items added. Select items from the menu.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {orderItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-slate-600">₱{item.price} × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {orderItems.length > 0 && (
                  <div className="flex justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200 font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-700">₱{orderTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              {orderItems.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Payment Method</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex-1 px-3 py-2 rounded-lg font-bold transition-all border shadow-sm text-sm ${
                        paymentMethod === "cash"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-md"
                          : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod("gcash")}
                      className={`flex-1 px-3 py-2 rounded-lg font-bold transition-all border shadow-sm text-sm ${
                        paymentMethod === "gcash"
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-md"
                          : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Ⓖ GCash
                    </button>
                    <button
                      onClick={() => setPaymentMethod("split")}
                      className={`flex-1 px-3 py-2 rounded-lg font-bold transition-all border shadow-sm text-sm ${
                        paymentMethod === "split"
                          ? "bg-purple-50 border-purple-600 text-purple-700 shadow-md"
                          : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      ↔️ Split
                    </button>
                  </div>

                  {/* Payment Amount Input */}
                  {paymentMethod === "cash" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Amount Received</label>
                      <Input
                        type="text"
                        value={amountReceived}
                        onChange={(e) => handleAmountChange(e.target.value, setAmountReceived)}
                        placeholder={`Min: ₱${orderTotal.toFixed(2)}`}
                        className="text-lg font-bold"
                      />
                      {parseFloat(amountReceived) >= orderTotal && (
                        <div className="text-sm text-emerald-600 font-medium">
                          Change: ₱{calculateChange().toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === "split" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">💵 Cash Amount</label>
                        <Input
                          type="text"
                          value={cashAmount}
                          onChange={(e) => handleAmountChange(e.target.value, setCashAmount)}
                          placeholder="0.00"
                          className="font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Ⓖ GCash Amount</label>
                        <Input
                          type="text"
                          value={gcashAmount}
                          onChange={(e) => handleAmountChange(e.target.value, setGcashAmount)}
                          placeholder="0.00"
                          className="font-bold"
                        />
                      </div>
                      {(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) >= orderTotal && (
                        <div className="col-span-2 text-sm text-emerald-600 font-medium">
                          Total: ₱{((parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Menu Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Select Items</label>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu..."
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>

              {/* Menu Items */}
              {isLoadingMenu ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <ScrollArea className="h-[300px] rounded-lg border">
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {filteredMenuItems.map(item => {
                      const inOrder = orderItems.find(oi => oi.id === item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => addItem(item)}
                          className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                            inOrder
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.name}</div>
                              <div className="text-xs text-slate-600">₱{item.price.toFixed(2)}</div>
                            </div>
                            {inOrder && (
                              <Badge className="bg-emerald-600 text-white ml-1">
                                {inOrder.quantity}
                              </Badge>
                            )}
                          </div>
                          {item.owner && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.owner}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Past Order"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
