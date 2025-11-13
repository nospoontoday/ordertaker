"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Minus,
  Trash2,
  Edit,
  Save,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// InventoryItem interface
interface InventoryItem {
  _id: string
  name: string
  quantity: number
  unit: string
  category: string
  lowStockThreshold: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CATEGORIES = [
  "Coffee Beans",
  "Milk & Dairy",
  "Syrups & Flavors",
  "Pastries & Bread",
  "Food Ingredients",
  "Packaging",
  "Supplies",
  "Other"
]

const UNITS = [
  "pcs",
  "kg",
  "g",
  "liters",
  "ml",
  "boxes",
  "bags",
  "bottles",
  "cans"
]

export function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // New item form state
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    unit: "pcs",
    category: CATEGORIES[0],
    lowStockThreshold: 10,
    notes: ""
  })

  // Load items from API
  useEffect(() => {
    loadItems()
  }, [])

  // Filter items based on search and category
  useEffect(() => {
    let filtered = items

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, selectedCategory])

  const loadItems = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/inventory`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }
      const result = await response.json()
      setItems(result.data || [])
    } catch (error) {
      console.error("Failed to load inventory items:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory items. Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Item name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newItem.name.trim(),
          quantity: newItem.quantity,
          unit: newItem.unit,
          category: newItem.category,
          lowStockThreshold: newItem.lowStockThreshold,
          notes: newItem.notes.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add item')
      }

      await loadItems()

      // Reset form
      setNewItem({
        name: "",
        quantity: 0,
        unit: "pcs",
        category: CATEGORIES[0],
        lowStockThreshold: 10,
        notes: ""
      })
      setIsAddDialogOpen(false)

      toast({
        title: "Success!",
        description: "Item added to inventory.",
      })
    } catch (error) {
      console.error("Failed to add item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateQuantity = async (id: string, delta: number) => {
    try {
      const item = items.find(i => i._id === id)
      if (!item) return

      const response = await fetch(`${API_URL}/inventory/${id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delta })
      })

      if (!response.ok) {
        throw new Error('Failed to update quantity')
      }

      const result = await response.json()
      const newQuantity = result.data.quantity

      await loadItems()

      toast({
        title: "Updated",
        description: `Quantity updated to ${newQuantity} ${item.unit}`,
      })
    } catch (error) {
      console.error("Failed to update quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
      })
    }
  }

  const handleSetQuantity = async (id: string, quantity: number) => {
    try {
      const item = items.find(i => i._id === id)
      if (!item) return

      const response = await fetch(`${API_URL}/inventory/${id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newQuantity: Math.max(0, quantity) })
      })

      if (!response.ok) {
        throw new Error('Failed to update quantity')
      }

      await loadItems()
    } catch (error) {
      console.error("Failed to set quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      await loadItems()

      toast({
        title: "Deleted",
        description: "Item removed from inventory.",
      })
    } catch (error) {
      console.error("Failed to delete item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { status: "out", label: "Out of Stock", color: "bg-red-600 border-red-700 text-white" }
    }
    if (item.quantity <= item.lowStockThreshold) {
      return { status: "low", label: "Low Stock", color: "bg-amber-500 border-amber-600 text-white" }
    }
    return { status: "good", label: "In Stock", color: "bg-emerald-600 border-emerald-700 text-white" }
  }

  const getStockIcon = (status: string) => {
    switch (status) {
      case "out":
        return <X className="w-3 h-3" />
      case "low":
        return <AlertTriangle className="w-3 h-3" />
      case "good":
        return <CheckCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getCategoryCount = (category: string) => {
    return items.filter(item => item.category === category).length
  }

  const getTotalItems = () => items.length
  const getLowStockCount = () => items.filter(item => item.quantity <= item.lowStockThreshold && item.quantity > 0).length
  const getOutOfStockCount = () => items.filter(item => item.quantity === 0).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading inventory...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-2">
                <Package className="w-8 h-8" />
                Inventory Management
              </h1>
              <p className="text-sm text-slate-500 font-medium">Track and manage your inventory items</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-sm hover:shadow-md transition-all">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Inventory Item</DialogTitle>
                  <DialogDescription>
                    Add a new item to track in your inventory.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Item Name</label>
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="e.g., Arabica Coffee Beans"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                      <Input
                        type="number"
                        min="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Unit</label>
                      <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Low Stock Threshold</label>
                    <Input
                      type="number"
                      min="0"
                      value={newItem.lowStockThreshold}
                      onChange={(e) => setNewItem({ ...newItem, lowStockThreshold: parseInt(e.target.value) || 0 })}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">Alert when quantity falls below this number</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
                    <Input
                      value={newItem.notes}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      placeholder="Additional notes..."
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddItem} className="flex-1">
                      Add Item
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(false)} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">In Stock</p>
                <p className="text-2xl font-bold text-emerald-600">{getTotalItems() - getOutOfStockCount()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{getOutOfStockCount()}</p>
              </div>
              <X className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories ({getTotalItems()})</SelectItem>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category} ({getCategoryCount(category)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Inventory Items Grid */}
        {filteredItems.length === 0 ? (
          <Card className="p-12 text-center border border-slate-200 shadow-sm">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-600 mb-2">No items found</p>
            <p className="text-sm text-slate-500">
              {items.length === 0
                ? "Add your first item to start tracking inventory."
                : "Try adjusting your search or filter criteria."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const stockStatus = getStockStatus(item)
              const isEditing = editingId === item._id

              return (
                <Card key={item._id} className="p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{item.category}</p>
                    </div>
                    <Badge className={`${stockStatus.color} font-bold text-xs px-2 py-1 rounded-md shadow-sm flex items-center gap-1`}>
                      {getStockIcon(stockStatus.status)}
                      {stockStatus.label}
                    </Badge>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-600 mb-3 italic">"{item.notes}"</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          defaultValue={item.quantity}
                          onBlur={(e) => {
                            handleSetQuantity(item._id, parseInt(e.target.value) || 0)
                            setEditingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSetQuantity(item._id, parseInt(e.currentTarget.value) || 0)
                              setEditingId(null)
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                            }
                          }}
                          className="w-24 h-8 text-center font-bold"
                          autoFocus
                        />
                        <span className="text-sm font-medium text-slate-600">{item.unit}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">{item.quantity}</span>
                        <span className="text-sm font-medium text-slate-600">{item.unit}</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(isEditing ? null : item._id)}
                      className="h-8 w-8 p-0"
                    >
                      {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQuantity(item._id, -1)}
                      className="flex-1 border-red-200 hover:bg-red-50 text-red-600"
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQuantity(item._id, 1)}
                      className="flex-1 border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold">Low stock alert:</span> {item.lowStockThreshold} {item.unit}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item._id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-slate-400 mt-2">
                    Last updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
