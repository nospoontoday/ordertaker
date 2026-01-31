"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, ArrowLeft, Upload, X, Loader2, GripVertical, Eye, EyeOff } from "lucide-react"
import { customerPhotosApi, uploadImage, getImageUrl, type CustomerPhoto } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

export default function CustomerPhotosAdmin() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [photos, setPhotos] = useState<CustomerPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<CustomerPhoto | null>(null)
  const [formData, setFormData] = useState({
    imageUrl: "",
    altText: "",
    isActive: false,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<CustomerPhoto | null>(null)
  const [dragOverItem, setDragOverItem] = useState<CustomerPhoto | null>(null)

  // Redirect if not authenticated or not super_admin
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    } else if (!isLoading && user && user.role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only super admins can manage customer photos.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, isLoading, router, toast])

  // Fetch photos
  useEffect(() => {
    if (user && user.role === "super_admin") {
      fetchPhotos()
    }
  }, [user])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const data = await customerPhotosApi.getAll()
      setPhotos(data)
    } catch (error) {
      console.error("Error fetching photos:", error)
      toast({
        title: "Error",
        description: "Failed to load customer photos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (photo?: CustomerPhoto) => {
    if (photo) {
      setEditingPhoto(photo)
      setFormData({
        imageUrl: photo.imageUrl,
        altText: photo.altText || "",
        isActive: photo.isActive,
      })
      setImagePreview(getImageUrl(photo.imageUrl))
    } else {
      setEditingPhoto(null)
      setFormData({
        imageUrl: "",
        altText: "",
        isActive: false,
      })
      setImagePreview(null)
    }
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPhoto(null)
    setFormData({
      imageUrl: "",
      altText: "",
      isActive: false,
    })
    setSelectedFile(null)
    setImagePreview(null)
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
    setFormData({ ...formData, imageUrl: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile && !formData.imageUrl) {
      toast({
        title: "Validation Error",
        description: "Please upload an image",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      let imageUrl = formData.imageUrl

      // Upload image if one was selected
      if (selectedFile) {
        try {
          imageUrl = await uploadImage(selectedFile)
        } catch (uploadError: any) {
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload image",
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }
      }

      // Check active count if trying to set as active
      if (formData.isActive && !editingPhoto?.isActive) {
        const activeCount = photos.filter(p => p.isActive && p._id !== editingPhoto?._id).length
        if (activeCount >= 6) {
          toast({
            title: "Limit Reached",
            description: "Maximum of 6 photos can be active. Please deactivate another photo first.",
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }
      }

      const photoData = {
        imageUrl,
        altText: formData.altText || "Customer photo",
        isActive: formData.isActive,
        userId: user!.id,
      }

      if (editingPhoto) {
        await customerPhotosApi.update(editingPhoto._id, photoData)
        toast({
          title: "Success",
          description: "Customer photo updated successfully",
        })
      } else {
        await customerPhotosApi.create(photoData)
        toast({
          title: "Success",
          description: "Customer photo added successfully",
        })
      }

      await fetchPhotos()
      handleCloseDialog()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save customer photo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer photo?")) {
      return
    }

    try {
      await customerPhotosApi.delete(id, user!.id)
      toast({
        title: "Success",
        description: "Customer photo deleted successfully",
      })
      await fetchPhotos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer photo",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (photo: CustomerPhoto) => {
    // Check active count if trying to activate
    if (!photo.isActive) {
      const activeCount = photos.filter(p => p.isActive).length
      if (activeCount >= 6) {
        toast({
          title: "Limit Reached",
          description: "Maximum of 6 photos can be active. Please deactivate another photo first.",
          variant: "destructive",
        })
        return
      }
    }

    try {
      setIsSaving(true)
      await customerPhotosApi.update(photo._id, {
        isActive: !photo.isActive,
        userId: user!.id,
      })
      await fetchPhotos()
      toast({
        title: "Success",
        description: `Photo ${!photo.isActive ? "activated" : "deactivated"} successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update photo status",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, photo: CustomerPhoto) => {
    setDraggedItem(photo)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, photo: CustomerPhoto) => {
    e.preventDefault()
    if (draggedItem && draggedItem._id !== photo._id) {
      setDragOverItem(photo)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = async (e: React.DragEvent, targetPhoto: CustomerPhoto) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem._id === targetPhoto._id) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    // Reorder the photos array
    const newPhotos = [...photos]
    const draggedIndex = newPhotos.findIndex(p => p._id === draggedItem._id)
    const targetIndex = newPhotos.findIndex(p => p._id === targetPhoto._id)
    
    // Remove dragged item and insert at target position
    const [removed] = newPhotos.splice(draggedIndex, 1)
    newPhotos.splice(targetIndex, 0, removed)

    // Update display order
    const reorderedPhotos = newPhotos.map((photo, index) => ({
      id: photo._id,
      displayOrder: index + 1,
    }))

    // Optimistically update UI
    setPhotos(newPhotos.map((p, i) => ({ ...p, displayOrder: i + 1 })))
    setDraggedItem(null)
    setDragOverItem(null)

    try {
      await customerPhotosApi.reorder(reorderedPhotos, user!.id)
      toast({
        title: "Success",
        description: "Photo order updated",
      })
    } catch (error: any) {
      // Revert on error
      await fetchPhotos()
      toast({
        title: "Error",
        description: error.message || "Failed to reorder photos",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const activePhotos = photos.filter(p => p.isActive)
  const inactivePhotos = photos.filter(p => !p.isActive)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== "super_admin") {
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
            <h1 className="text-2xl sm:text-3xl font-bold">Customer Photos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage photos displayed in the Hero section
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="text-xs sm:text-sm">
          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Add Photo</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Active Photos Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-600" />
            Active Photos ({activePhotos.length}/6)
          </CardTitle>
          <CardDescription>
            These photos are displayed in the Hero section. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading photos...</div>
          ) : activePhotos.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No active photos</p>
              <p className="text-sm text-muted-foreground">
                Upload photos and activate them to display in the Hero section
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {activePhotos.map((photo) => (
                <div
                  key={photo._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, photo)}
                  onDragOver={(e) => handleDragOver(e, photo)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, photo)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative group cursor-grab active:cursor-grabbing
                    rounded-lg overflow-hidden border-2 transition-all
                    ${draggedItem?._id === photo._id ? "opacity-50" : ""}
                    ${dragOverItem?._id === photo._id ? "border-primary scale-105" : "border-green-500"}
                  `}
                >
                  <div className="aspect-square relative">
                    <img
                      src={getImageUrl(photo.imageUrl)}
                      alt={photo.altText || "Customer photo"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Drag handle */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                    
                    {/* Order badge */}
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      #{photo.displayOrder}
                    </Badge>
                    
                    {/* Action buttons */}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDialog(photo)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(photo)
                        }}
                        disabled={isSaving}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(photo._id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-slate-400" />
            Inactive Photos ({inactivePhotos.length})
          </CardTitle>
          <CardDescription>
            These photos are stored but not displayed. Click the eye icon to activate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading photos...</div>
          ) : inactivePhotos.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No inactive photos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {inactivePhotos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative group rounded-lg overflow-hidden border-2 border-slate-200"
                >
                  <div className="aspect-square relative">
                    <img
                      src={getImageUrl(photo.imageUrl)}
                      alt={photo.altText || "Customer photo"}
                      className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Action buttons */}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(photo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(photo)}
                        disabled={isSaving || activePhotos.length >= 6}
                        title={activePhotos.length >= 6 ? "Max 6 active photos" : "Activate photo"}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(photo._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPhoto ? "Edit Photo" : "Add Customer Photo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Image Upload */}
              <div className="grid gap-2">
                <Label htmlFor="image">Photo *</Label>
                
                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
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
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a customer photo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF, or WebP (max 5MB)
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

              {/* Alt Text */}
              <div className="grid gap-2">
                <Label htmlFor="altText">Description (Optional)</Label>
                <Input
                  id="altText"
                  value={formData.altText}
                  onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                  placeholder="e.g., Customer enjoying coffee"
                />
                <p className="text-xs text-muted-foreground">
                  A brief description of the photo for accessibility
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Display this photo in the Hero section
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={!formData.isActive && activePhotos.length >= 6 && !editingPhoto?.isActive}
                />
              </div>
              {!formData.isActive && activePhotos.length >= 6 && !editingPhoto?.isActive && (
                <p className="text-xs text-amber-600">
                  Maximum of 6 active photos reached. Deactivate another photo first.
                </p>
              )}
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
                  editingPhoto ? "Update" : "Add Photo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
