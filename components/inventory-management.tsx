"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { formatDistanceToNow } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  // Edit form state for comprehensive editing
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({})


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

  const handleDeleteItem = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`${API_URL}/inventory/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      await loadItems()
      setDeleteId(null)

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
      setDeleteId(null)
    }
  }

  const handleStartEdit = (item: InventoryItem) => {
    setEditingId(item._id)
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      lowStockThreshold: item.lowStockThreshold,
      notes: item.notes || ""
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return

    try {
      const response = await fetch(`${API_URL}/inventory/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      await loadItems()
      setEditingId(null)
      setEditForm({})

      toast({
        title: "Updated",
        description: "Item updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update item:", error)
      toast({
        title: "Error",
        description: "Failed to update item.",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">In Stock</p>
                <p className="text-2xl font-bold text-emerald-600">{getTotalItems() - getOutOfStockCount()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </Card>
          <Card className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
          <Card className="p-4 sm:p-5 bg-gradient-to-br from-red-50 to-white border border-slate-200 shadow-sm">
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
                <Card
                  key={item._id}
                  className={`p-6 border-2 shadow-sm hover:shadow-md transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                >
                  {isEditing ? (
                    // EDIT MODE - All fields editable
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-blue-900">Edit Item</h3>
                        <Badge className={`${stockStatus.color} font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1`}>
                          {getStockIcon(stockStatus.status)}
                          {stockStatus.label}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`name-${item._id}`} className="text-sm font-semibold text-slate-700">Item Name</Label>
                          <Input
                            id={`name-${item._id}`}
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`category-${item._id}`} className="text-sm font-semibold text-slate-700">Category</Label>
                            <Select
                              value={editForm.category}
                              onValueChange={(value) => setEditForm({...editForm, category: value})}
                            >
                              <SelectTrigger id={`category-${item._id}`} className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`unit-${item._id}`} className="text-sm font-semibold text-slate-700">Unit</Label>
                            <Select
                              value={editForm.unit}
                              onValueChange={(value) => setEditForm({...editForm, unit: value})}
                            >
                              <SelectTrigger id={`unit-${item._id}`} className="mt-1">
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

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`quantity-${item._id}`} className="text-sm font-semibold text-slate-700">Current Quantity</Label>
                            <Input
                              id={`quantity-${item._id}`}
                              type="number"
                              min="0"
                              value={editForm.quantity || 0}
                              onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 0})}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`threshold-${item._id}`} className="text-sm font-semibold text-slate-700">Low Stock Threshold</Label>
                            <Input
                              id={`threshold-${item._id}`}
                              type="number"
                              min="0"
                              value={editForm.lowStockThreshold || 0}
                              onChange={(e) => setEditForm({...editForm, lowStockThreshold: parseInt(e.target.value) || 0})}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`notes-${item._id}`} className="text-sm font-semibold text-slate-700">Notes (Optional)</Label>
                          <Textarea
                            id={`notes-${item._id}`}
                            value={editForm.notes || ""}
                            onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                            className="mt-1 min-h-[80px]"
                            placeholder="Add any notes about this item..."
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE - Display only
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-slate-900 truncate mb-1">{item.name}</h3>
                          <p className="text-sm text-slate-500 font-medium">{item.category}</p>
                        </div>
                        <Badge className={`${stockStatus.color} font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5`}>
                          {getStockIcon(stockStatus.status)}
                          {stockStatus.label}
                        </Badge>
                      </div>

                      {item.notes && (
                        <div className="bg-slate-50 p-3 rounded-lg mb-4">
                          <p className="text-xs text-slate-600 italic">"{item.notes}"</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-slate-900">{item.quantity}</span>
                          <span className="text-sm font-medium text-slate-600">{item.unit}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(item)}
                          className="h-11 w-11 sm:h-9 sm:w-9 p-0 hover:bg-blue-50 hover:text-blue-600"
                          aria-label="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item._id, -1)}
                          className="flex-1 h-11 sm:h-9 border-red-200 hover:bg-red-50 text-red-600 font-semibold"
                          aria-label="Remove one unit"
                        >
                          <Minus className="w-4 h-4 mr-1.5" />
                          Remove
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item._id, 1)}
                          className="flex-1 h-11 sm:h-9 border-emerald-200 hover:bg-emerald-50 text-emerald-600 font-semibold"
                          aria-label="Add one unit"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add
                        </Button>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold">Low stock alert:</span> {item.lowStockThreshold} {item.unit}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(item._id)}
                          className="h-11 w-11 sm:h-9 sm:w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-xs text-slate-400 mt-3">
                        {item.updatedAt ? `Updated ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}` : 'Never updated'}
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this item from your inventory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteItem}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
