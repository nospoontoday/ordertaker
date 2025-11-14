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
  Filter,
  ImagePlus,
  Image as ImageIcon
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
  image?: string
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
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all")
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

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)

  // Load items from API
  useEffect(() => {
    loadItems()
  }, [])

  // Filter items based on search, category, and stock status
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

    // Filter by stock status
    if (stockFilter !== "all") {
      filtered = filtered.filter(item => {
        if (stockFilter === "out-of-stock") {
          return item.quantity === 0
        } else if (stockFilter === "low-stock") {
          return item.quantity > 0 && item.quantity <= item.lowStockThreshold
        } else if (stockFilter === "in-stock") {
          return item.quantity > item.lowStockThreshold
        }
        return true
      })
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, selectedCategory, stockFilter])

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        })
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB.",
          variant: "destructive",
        })
        return
      }

      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const result = await response.json()
      return result.data.path
    } catch (error) {
      console.error("Failed to upload image:", error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload image.",
        variant: "destructive",
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview("")
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
      // Upload image first if selected
      let imagePath = null
      if (selectedImage) {
        imagePath = await handleUploadImage()
      }

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
          notes: newItem.notes.trim() || undefined,
          image: imagePath || undefined
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
      handleRemoveImage()
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
      notes: item.notes || "",
      image: item.image || ""
    })
    // Set existing image as preview
    if (item.image) {
      setImagePreview(item.image)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return

    try {
      // Upload new image if selected
      let imagePath = editForm.image
      if (selectedImage) {
        const uploadedPath = await handleUploadImage()
        if (uploadedPath) {
          imagePath = uploadedPath
        }
      }

      const response = await fetch(`${API_URL}/inventory/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          image: imagePath
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      await loadItems()
      setEditingId(null)
      setEditForm({})
      handleRemoveImage()

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
    handleRemoveImage()
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
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Item Image (Optional)</label>
                    <div className="space-y-3">
                      {imagePreview ? (
                        <div className="relative w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors cursor-pointer bg-slate-50">
                          <label htmlFor="add-image-input" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                            <ImagePlus className="w-12 h-12 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 font-medium">Click to upload image</p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                          </label>
                          <input
                            id="add-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddItem} className="flex-1" disabled={uploadingImage}>
                      {uploadingImage ? "Uploading..." : "Add Item"}
                    </Button>
                    <Button onClick={() => {
                      setIsAddDialogOpen(false)
                      handleRemoveImage()
                    }} variant="outline" className="flex-1">
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
          <Card
            onClick={() => setStockFilter("all")}
            className={`p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-white border-2 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95 ${
              stockFilter === "all" ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card
            onClick={() => setStockFilter("in-stock")}
            className={`p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-white border-2 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95 ${
              stockFilter === "in-stock" ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">In Stock</p>
                <p className="text-2xl font-bold text-emerald-600">{getTotalItems() - getOutOfStockCount()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </Card>
          <Card
            onClick={() => setStockFilter("low-stock")}
            className={`p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-white border-2 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95 ${
              stockFilter === "low-stock" ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-200 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
          <Card
            onClick={() => setStockFilter("out-of-stock")}
            className={`p-4 sm:p-5 bg-gradient-to-br from-red-50 to-white border-2 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95 ${
              stockFilter === "out-of-stock" ? "border-red-500 ring-2 ring-red-200" : "border-slate-200 hover:border-red-300"
            }`}
          >
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map(item => {
              const stockStatus = getStockStatus(item)
              const isEditing = editingId === item._id

              return (
                <Card
                  key={item._id}
                  className={`p-3 sm:p-4 border-2 shadow-sm hover:shadow-md transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                >
                  {isEditing ? (
                    // EDIT MODE - All fields editable
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-blue-900">Edit Item</h3>
                        <Badge className={`${stockStatus.color} font-bold text-xs px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1`}>
                          {getStockIcon(stockStatus.status)}
                          {stockStatus.label}
                        </Badge>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <Label htmlFor={`name-${item._id}`} className="text-xs font-semibold text-slate-700">Item Name</Label>
                          <Input
                            id={`name-${item._id}`}
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="mt-1 h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <Label htmlFor={`category-${item._id}`} className="text-xs font-semibold text-slate-700">Category</Label>
                            <Select
                              value={editForm.category}
                              onValueChange={(value) => setEditForm({...editForm, category: value})}
                            >
                              <SelectTrigger id={`category-${item._id}`} className="mt-1 h-9 text-sm">
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
                            <Label htmlFor={`unit-${item._id}`} className="text-xs font-semibold text-slate-700">Unit</Label>
                            <Select
                              value={editForm.unit}
                              onValueChange={(value) => setEditForm({...editForm, unit: value})}
                            >
                              <SelectTrigger id={`unit-${item._id}`} className="mt-1 h-9 text-sm">
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

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <Label htmlFor={`quantity-${item._id}`} className="text-xs font-semibold text-slate-700">Quantity</Label>
                            <Input
                              id={`quantity-${item._id}`}
                              type="number"
                              min="0"
                              value={editForm.quantity || 0}
                              onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 0})}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`threshold-${item._id}`} className="text-xs font-semibold text-slate-700">Alert Threshold</Label>
                            <Input
                              id={`threshold-${item._id}`}
                              type="number"
                              min="0"
                              value={editForm.lowStockThreshold || 0}
                              onChange={(e) => setEditForm({...editForm, lowStockThreshold: parseInt(e.target.value) || 0})}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`notes-${item._id}`} className="text-xs font-semibold text-slate-700">Notes</Label>
                          <Textarea
                            id={`notes-${item._id}`}
                            value={editForm.notes || ""}
                            onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                            className="mt-1 min-h-[60px] text-sm"
                            placeholder="Add notes..."
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-slate-700">Item Image</Label>
                          <div className="mt-1">
                            {imagePreview ? (
                              <div className="relative w-full h-24 border border-slate-200 rounded overflow-hidden">
                                <img
                                  src={imagePreview.startsWith('/') ? `${API_URL.replace('/api', '')}${imagePreview}` : imagePreview}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleRemoveImage}
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-300 rounded hover:border-slate-400 transition-colors cursor-pointer bg-slate-50">
                                <label htmlFor={`edit-image-${item._id}`} className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                  <ImagePlus className="w-6 h-6 text-slate-400 mb-1" />
                                  <p className="text-xs text-slate-600">Upload</p>
                                </label>
                                <input
                                  id={`edit-image-${item._id}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageSelect}
                                  className="hidden"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1 h-9 text-sm"
                        >
                          <X className="w-3.5 h-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE - Display only
                    <>
                      {/* Compact Header with Image Thumbnail */}
                      <div className="flex gap-3 mb-2">
                        {item.image && (
                          <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200">
                            <img
                              src={`${API_URL.replace('/api', '')}${item.image}`}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-slate-900 truncate leading-tight">{item.name}</h3>
                              <p className="text-xs text-slate-500 font-medium">{item.category}</p>
                            </div>
                            <Badge className={`${stockStatus.color} font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 flex-shrink-0`}>
                              {getStockIcon(stockStatus.status)}
                              <span className="hidden sm:inline">{stockStatus.label}</span>
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold text-slate-900">{item.quantity}</span>
                            <span className="text-xs font-medium text-slate-600">{item.unit}</span>
                          </div>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="bg-slate-50 p-2 rounded mb-2">
                          <p className="text-xs text-slate-600 italic line-clamp-2">"{item.notes}"</p>
                        </div>
                      )}

                      {/* Action Buttons - Compact Layout */}
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item._id, -1)}
                          className="flex-1 h-9 border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs px-2"
                          aria-label="Remove one unit"
                        >
                          <Minus className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item._id, 1)}
                          className="flex-1 h-9 border-emerald-200 hover:bg-emerald-50 text-emerald-600 font-semibold text-xs px-2"
                          aria-label="Add one unit"
                        >
                          <Plus className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Add</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(item)}
                          className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 flex-shrink-0"
                          aria-label="Edit item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Footer - Compact */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>{item.lowStockThreshold} {item.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline">
                            {item.updatedAt ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }) : 'Never'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(item._id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
