import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { categoryApi, type Category } from "@/lib/api"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconCategory,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconSearch,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CategoryForm {
  name: string
  description: string
}

const emptyForm: CategoryForm = {
  name: "",
  description: "",
}

export function ManagerCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create/Edit category dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CategoryForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  
  // View category dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const data = await categoryApi.getAll()
      setCategories(data)
    } catch (error) {
      console.error("Failed to load categories:", error)
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a category name")
      return
    }
    
    setIsSaving(true)
    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      }

      if (editingCategoryId) {
        await categoryApi.update(editingCategoryId, categoryData)
        toast.success("Category updated successfully")
      } else {
        await categoryApi.create(categoryData)
        toast.success("Category created successfully")
      }
      setIsCreateDialogOpen(false)
      setFormData(emptyForm)
      setEditingCategoryId(null)
      loadCategories()
    } catch (err: unknown) {
      console.error("Failed to save category:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to save category")
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
    })
    setEditingCategoryId(category.id)
    setIsCreateDialogOpen(true)
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return
    try {
      await categoryApi.delete(categoryToDelete.id)
      toast.success("Category deleted successfully")
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
      loadCategories()
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast.error("Failed to delete category. It may have products assigned.")
    }
  }

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Categories</h1>
                <p className="text-muted-foreground">Manage product categories</p>
              </div>
              <Button onClick={() => { setEditingCategoryId(null); setFormData(emptyForm); setIsCreateDialogOpen(true) }}>
                <IconPlus className="size-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCategory className="size-5" />
                  Product Categories
                </CardTitle>
                <CardDescription>All product categories ({filteredCategories.length})</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No categories match your search" : "No categories found. Add your first category!"}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {category.description || <span className="italic">No description</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedCategory(category); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(category)}
                                >
                                  <IconEdit className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setCategoryToDelete(category); setIsDeleteDialogOpen(true) }}
                                >
                                  <IconTrash className="size-4 text-destructive" />
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
          </div>
        </div>
      </SidebarInset>

      {/* Create/Edit Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Edit Category" : "Add New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategoryId ? "Update category details" : "Create a new product category"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter category name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this category..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingCategoryId(null) }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdateCategory} disabled={isSaving}>
              {isSaving ? "Saving..." : editingCategoryId ? "Update Category" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Category Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-bold text-lg">{selectedCategory.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="text-sm">
                    {selectedCategory.description || <span className="italic text-muted-foreground">No description provided</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? Products in this category may be affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
