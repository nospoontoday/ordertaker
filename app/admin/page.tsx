"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, ArrowLeft, Upload, X, Loader2 } from "lucide-react"
import { menuItemsApi, categoriesApi, uploadImage, getImageUrl, type MenuItem, type Category } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"

export default function AdminDashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    onlineImage: "",
    isBestSeller: false,
    isPublic: false,
    owner: "john" as "john" | "elwin",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedOnlineFile, setSelectedOnlineFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [onlineImagePreview, setOnlineImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onlineFileInputRef = useRef<HTMLInputElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Fetch menu items and categories
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [itemsData, categoriesData] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
      ])
      // Sort menu items by owner (john first, then elwin), then alphabetically by name
      const sortedItems = [...itemsData].sort((a, b) => {
        const ownerA = a.owner || 'john'
        const ownerB = b.owner || 'john'
        
        // First sort by owner: john comes before elwin
        if (ownerA !== ownerB) {
          // john should come first, elwin second
          if (ownerA === 'john') return -1
          if (ownerB === 'john') return 1
          // Both are elwin or other, compare alphabetically
          return ownerA.localeCompare(ownerB)
        }
        
        // If same owner, sort alphabetically by name
        return a.name.localeCompare(b.name)
      })
      setMenuItems(sortedItems)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Make sure the backend server is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        image: item.image || "",
        onlineImage: item.onlineImage || "",
        isBestSeller: item.isBestSeller || false,
        isPublic: item.isPublic || false,
        owner: item.owner || "john",
      })
      setImagePreview(item.image ? getImageUrl(item.image) : null)
      setOnlineImagePreview(item.onlineImage ? getImageUrl(item.onlineImage) : null)
    } else {
      setEditingItem(null)
      setFormData({
        name: "",
        price: "",
        category: "",
        image: "",
        onlineImage: "",
        isBestSeller: false,
        isPublic: false,
        owner: "john",
      })
      setImagePreview(null)
      setOnlineImagePreview(null)
    }
    setSelectedFile(null)
    setSelectedOnlineFile(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setFormData({
      name: "",
      price: "",
      category: "",
      image: "",
      onlineImage: "",
      isBestSeller: false,
      isPublic: false,
      owner: "john",
    })
    setSelectedFile(null)
    setSelectedOnlineFile(null)
    setImagePreview(null)
    setOnlineImagePreview(null)
    setIsUploading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file (JPG, PNG, GIF, or WebP)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleOnlineFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file (JPG, PNG, GIF, or WebP)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setSelectedOnlineFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setOnlineImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveOnlineImage = () => {
    setSelectedOnlineFile(null)
    setOnlineImagePreview(null)
    setFormData({ ...formData, onlineImage: "" })
    if (onlineFileInputRef.current) {
      onlineFileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      let imageUrl = formData.image
      let onlineImageUrl = formData.onlineImage

      // Upload crew image if one was selected
      if (selectedFile) {
        try {
          imageUrl = await uploadImage(selectedFile)
        } catch (uploadError: any) {
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload crew image",
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }
      }

      // Upload online image if one was selected
      if (selectedOnlineFile) {
        try {
          onlineImageUrl = await uploadImage(selectedOnlineFile)
        } catch (uploadError: any) {
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload online image",
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }
      }

      const menuItemData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        image: imageUrl,
        onlineImage: onlineImageUrl,
        isBestSeller: formData.isBestSeller,
        isPublic: formData.isPublic,
        owner: formData.owner,
      }

      if (editingItem && editingItem._id) {
        await menuItemsApi.update(editingItem._id, menuItemData)
        toast({
          title: "Success",
          description: "Menu item updated successfully",
        })
      } else {
        await menuItemsApi.create(menuItemData)
        toast({
          title: "Success",
          description: "Menu item created successfully",
        })
      }

      await fetchData()
      handleCloseDialog()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save menu item",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) {
      return
    }

    try {
      await menuItemsApi.delete(id)
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      })
      await fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu item",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your menu items</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/categories")} className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Manage Categories</span>
            <span className="sm:hidden">Categories</span>
          </Button>
          <Button onClick={() => handleOpenDialog()} className="text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Menu Item</span>
            <span className="sm:hidden">Add Item</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${menuItems.length} items total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading menu items...</div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No menu items found</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price (₱)</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="hidden md:table-cell">Visibility</TableHead>
                    <TableHead className="hidden lg:table-cell">Best Seller</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="hidden sm:table-cell">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm sm:text-base">{item.name}</TableCell>
                      <TableCell className="text-sm sm:text-base">₱{item.price.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={`text-xs ${
                          item.owner === 'john' ? 'bg-purple-600 text-white' :
                          item.owner === 'elwin' ? 'bg-indigo-600 text-white' :
                          'bg-slate-600 text-white'
                        }`}>
                          {item.owner === 'john' ? '👤 John' :
                           item.owner === 'elwin' ? '👤 Elwin' :
                           '👤 John'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={`text-xs ${
                          item.isPublic ? 'bg-green-600 text-white' : 'bg-slate-500 text-white'
                        }`}>
                          {item.isPublic ? '🌐 Public' : '🔒 Private'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {item.isBestSeller && <Badge className="bg-yellow-500 text-xs">Best Seller</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                            className="h-8 w-8 sm:h-10 sm:w-10"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => item._id && handleDelete(item._id)}
                            className="h-8 w-8 sm:h-10 sm:w-10"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₱) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Owner *</Label>
                <Select
                  value={formData.owner}
                  onValueChange={(value: "john" | "elwin") => setFormData({ ...formData, owner: value })}
                  required
                >
                  <SelectTrigger id="owner">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="john">👤 John</SelectItem>
                    <SelectItem value="elwin">👤 Elwin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select who owns this menu item. Sales will be credited to the owner.
                </p>
              </div>
              {/* Crew Image */}
              <div className="grid gap-2">
                <Label htmlFor="image">Crew Image (Internal)</Label>
                <p className="text-xs text-muted-foreground">This image is shown to crew members in the dashboard.</p>

                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Click to upload (JPG, PNG, GIF, WebP - max 5MB)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Online Customer Image */}
              <div className="grid gap-2">
                <Label htmlFor="onlineImage">Online Order Image (Customer-Facing)</Label>
                <p className="text-xs text-muted-foreground">This image is shown to online customers. Leave empty to show a placeholder.</p>

                {onlineImagePreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={onlineImagePreview}
                        alt="Online Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onlineFileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveOnlineImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onlineFileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Click to upload (JPG, PNG, GIF, WebP - max 5MB)
                    </p>
                  </div>
                )}

                <input
                  ref={onlineFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleOnlineFileSelect}
                  className="hidden"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPublic: checked === true })
                    }
                  />
                  <div>
                    <Label htmlFor="isPublic" className="cursor-pointer">
                      Visible to Online Customers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If checked, this item will appear in the online ordering page
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bestSeller"
                    checked={formData.isBestSeller}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isBestSeller: checked === true })
                    }
                  />
                  <Label htmlFor="bestSeller" className="cursor-pointer">
                    Mark as Best Seller
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedFile ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  editingItem ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
