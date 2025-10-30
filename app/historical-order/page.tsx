"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Minus, Calendar, ArrowLeft, Loader2 } from "lucide-react"
import { menuItemsApi, categoriesApi, ordersApi, getImageUrl, type MenuItem as ApiMenuItem, type Category as ApiCategory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface SummaryItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
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

const FALLBACK_CATEGORIES: Category[] = [
  { id: "coffee", name: "Coffee", image: "/coffee-cup.png" },
  { id: "food", name: "Food", image: "/food-plate.png" },
  { id: "pastry", name: "Pastry", image: "/pastry-dessert.jpg" },
]

export default function HistoricalOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [summaryDate, setSummaryDate] = useState("")
  const [items, setItems] = useState<SummaryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [totalCash, setTotalCash] = useState("")
  const [totalGcash, setTotalGcash] = useState("")

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only admins can create historical orders.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    fetchMenuData()
  }, [user])

  const fetchMenuData = async () => {
    setIsLoadingData(true)
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
    } finally {
      setIsLoadingData(false)
    }
  }

  const addItem = (menuItem: MenuItem) => {
    const existingItem = items.find((item) => item.id === menuItem.id)

    if (existingItem) {
      setItems(
        items.map((item) => (item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item))
      )
    } else {
      setItems([...items, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        category: menuItem.category
      }])
    }
  }

  const getDisplayedItems = () => {
    if (selectedCategory) {
      return menuItems.filter((item) => item.category === selectedCategory)
    }
    return menuItems.filter((item) => item.isBestSeller)
  }

  const submitSummary = async () => {
    if (items.length === 0 || !summaryDate) {
      toast({
        title: "Missing Information",
        description: "Please select a date and add items with quantities.",
        variant: "destructive",
      })
      return
    }

    const cash = parseFloat(totalCash) || 0
    const gcash = parseFloat(totalGcash) || 0
    const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    if (cash + gcash !== calculatedTotal) {
      toast({
        title: "Payment Mismatch",
        description: `Total cash (₱${cash.toFixed(2)}) + GCash (₱${gcash.toFixed(2)}) must equal items total (₱${calculatedTotal.toFixed(2)})`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create timestamp for 2pm on the selected date (in local timezone)
      // Parse YYYY-MM-DD as local date to avoid UTC conversion issues
      const [year, month, day] = summaryDate.split('-').map(Number)
      const summaryDateTime = new Date(year, month - 1, day, 14, 0, 0) // 2 PM local time
      const baseTimestamp = summaryDateTime.getTime()

      // Create orders for cash items if cash amount > 0
      if (cash > 0) {
        await ordersApi.create({
          id: `summary-cash-${baseTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
          customerName: `Daily Summary - Cash`,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            status: "served",
            itemType: "dine-in",
          })),
          createdAt: baseTimestamp,
          isPaid: true,
          paymentMethod: "cash",
          orderType: "dine-in",
          appendedOrders: [],
          orderTakerName: user?.name,
          orderTakerEmail: user?.email,
        })
      }

      // Create orders for gcash items if gcash amount > 0
      if (gcash > 0) {
        await ordersApi.create({
          id: `summary-gcash-${baseTimestamp + 1}-${Math.random().toString(36).substr(2, 9)}`,
          customerName: `Daily Summary - GCash`,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            status: "served",
            itemType: "dine-in",
          })),
          createdAt: baseTimestamp + 1, // +1ms to differentiate
          isPaid: true,
          paymentMethod: "gcash",
          orderType: "dine-in",
          appendedOrders: [],
          orderTakerName: user?.name,
          orderTakerEmail: user?.email,
        })
      }

      toast({
        title: "Daily Summary Created!",
        description: `Summary for ${summaryDate} has been saved.`,
      })

      // Reset form
      setSummaryDate("")
      setItems([])
      setTotalCash("")
      setTotalGcash("")
    } catch (error) {
      console.error("Error creating daily summary:", error)
      toast({
        title: "Error",
        description: "Failed to create daily summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                Daily Summary Entry
              </h1>
              <p className="text-sm text-slate-500 font-medium">Enter item quantities sold for a previous date</p>
            </div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Menu</h2>

            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-4" />
                <p className="text-base font-medium text-slate-500">Loading menu...</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Categories</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          {/* Daily Summary */}
          <div className="lg:col-span-1">
            <Card className="p-5 sticky top-4 bg-white border border-slate-200/80 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Daily Summary</h3>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Summary Date</label>
                  <Input
                    type="date"
                    value={summaryDate}
                    onChange={(e) => setSummaryDate(e.target.value)}
                    className="w-full border-slate-200 focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium">No items added</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 gap-2">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                          <p className="text-xs font-medium text-slate-600">₱{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              const updated = items.map((i) =>
                                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                              )
                              setItems(updated)
                            }}
                            className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200"
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const updated = items
                                .map((i) => (i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                                .filter((i) => i.quantity > 0)
                              setItems(updated)
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                          >
                            <Minus className="w-4 h-4 text-red-600" />
                          </button>
                          <button
                            onClick={() => {
                              const updated = items.filter((i) => i.id !== item.id)
                              setItems(updated)
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors ml-1 border border-red-200"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200/80 pt-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-base text-slate-900">Calculated Total:</span>
                  <span className="text-xl font-bold text-slate-900">₱{calculatedTotal.toFixed(2)}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Total items sold: {totalItemCount}</div>
              </div>

              <div className="border-t border-slate-200/80 pt-4 mb-5 space-y-3">
                <label className="block text-sm font-bold text-slate-700">Payment Breakdown</label>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">💵 Cash Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalCash}
                    onChange={(e) => setTotalCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-slate-200 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ⓖ GCash Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalGcash}
                    onChange={(e) => setTotalGcash(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-slate-200 focus:border-blue-400"
                  />
                </div>
                <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2">
                  <strong>Note:</strong> Cash + GCash must equal ₱{calculatedTotal.toFixed(2)}
                </div>
              </div>

              <Button
                onClick={submitSummary}
                disabled={items.length === 0 || !summaryDate || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold h-12 shadow-sm hover:shadow-md transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Daily Summary"
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
