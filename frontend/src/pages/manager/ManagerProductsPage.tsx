import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { productApi, categoryApi, type Product, type Category } from "@/lib/api"
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
import { Badge } from "@/components/ui/badge"
import {
  IconBox,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatUGX(amount: number | undefined | null): string {
  return `UGX ${(amount ?? 0).toLocaleString()}`
}

interface ProductForm {
  name: string
  sku: string
  categoryId: string
  description: string
  costPrice: string
  sellingPrice: string
  minStockLevel: string
  unit: string
  requiresSerial: boolean
}

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  categoryId: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  minStockLevel: "10",
  unit: "piece",
  requiresSerial: false,
}

export function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create/Edit product dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<ProductForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  
  // View product dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, categoriesData] = await Promise.all([
        productApi.getAll(),
        categoryApi.getAll(),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdateProduct = async () => {
    if (!formData.name || !formData.sku || !formData.categoryId || !formData.sellingPrice) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSaving(true)
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        categoryId: parseInt(formData.categoryId),
        description: formData.description || undefined,
        sellingPrice: parseFloat(formData.sellingPrice),
        reorderLevel: parseInt(formData.minStockLevel) || 10,
        unitOfMeasure: formData.unit || "piece",
        requiresSerial: formData.requiresSerial,
      }

      if (editingProductId) {
        await productApi.update(editingProductId, productData)
        toast.success("Product updated successfully")
      } else {
        await productApi.create(productData)
        toast.success("Product created successfully")
      }
      setIsCreateDialogOpen(false)
      setFormData(emptyForm)
      setEditingProductId(null)
      loadData()
    } catch (err: unknown) {
      console.error("Failed to save product:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to save product")
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId?.toString() || "",
      description: product.description || "",
      costPrice: "",
      sellingPrice: product.sellingPrice?.toString() || "",
      minStockLevel: product.reorderLevel?.toString() || "10",
      unit: product.unitOfMeasure || "piece",
      requiresSerial: product.requiresSerial || false,
    })
    setEditingProductId(product.id)
    setIsCreateDialogOpen(true)
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await productApi.delete(productToDelete.id)
      toast.success("Product deleted successfully")
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
      loadData()
    } catch (error) {
      console.error("Failed to delete product:", error)
      toast.error("Failed to delete product. It may be in use.")
    }
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
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
                <h1 className="text-2xl font-bold">Products</h1>
                <p className="text-muted-foreground">Manage product catalog</p>
              </div>
              <Button onClick={() => { setEditingProductId(null); setFormData(emptyForm); setIsCreateDialogOpen(true) }}>
                <IconPlus className="size-4 mr-2" />
                Add Product
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconBox className="size-5" />
                  Products Catalog
                </CardTitle>
                <CardDescription>All available products ({filteredProducts.length})</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No products match your search" : "No products found. Add your first product!"}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">{product.sku}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.categoryName}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(product.sellingPrice)}</TableCell>
                            <TableCell>
                              <Badge variant={product.isActive ? "secondary" : "destructive"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedProduct(product); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(product)}
                                >
                                  <IconEdit className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setProductToDelete(product); setIsDeleteDialogOpen(true) }}
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

      {/* Create/Edit Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProductId ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProductId ? "Update product details" : "Add a new product to the catalog"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="e.g., PRD-001"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="costPrice">Cost Price (UGX)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sellingPrice">Selling Price (UGX) *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="l">Liter (l)</SelectItem>
                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({...formData, minStockLevel: e.target.value})}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                id="requiresSerial"
                checked={formData.requiresSerial}
                onChange={(e) => setFormData({...formData, requiresSerial: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="grid gap-0.5">
                <Label htmlFor="requiresSerial" className="font-medium cursor-pointer">Requires Serial Number</Label>
                <p className="text-xs text-muted-foreground">Enable for products tracked individually (e.g., electronics, appliances)</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Product description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingProductId(null) }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdateProduct} disabled={isSaving}>
              {isSaving ? "Saving..." : editingProductId ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-bold text-lg">{selectedProduct.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SKU:</span>
                  <p className="font-mono">{selectedProduct.sku}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p><Badge variant="outline">{selectedProduct.categoryName}</Badge></p>
                </div>
                <div>
                  <span className="text-muted-foreground">Selling Price:</span>
                  <p className="font-medium">{formatUGX(selectedProduct.sellingPrice)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit:</span>
                  <p className="capitalize">{selectedProduct.unitOfMeasure || 'piece'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reorder Level:</span>
                  <p>{selectedProduct.reorderLevel || 10}</p>
                </div>
                {selectedProduct.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="text-sm">{selectedProduct.description}</p>
                  </div>
                )}
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

      {/* Delete Product Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete?.name}" ({productToDelete?.sku})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
