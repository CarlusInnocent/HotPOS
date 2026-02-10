import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
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

export function CashierProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create product dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<ProductForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  
  // View product dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

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

  const handleCreateProduct = async () => {
    if (!formData.name || !formData.sku || !formData.categoryId || !formData.sellingPrice) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSaving(true)
    try {
      await productApi.create({
        name: formData.name,
        sku: formData.sku,
        categoryId: parseInt(formData.categoryId),
        description: formData.description || undefined,
        sellingPrice: parseFloat(formData.sellingPrice),
        reorderLevel: parseInt(formData.minStockLevel) || 10,
        unitOfMeasure: formData.unit || "piece",
        requiresSerial: formData.requiresSerial,
      })
      toast.success("Product created successfully")
      setIsCreateDialogOpen(false)
      setFormData(emptyForm)
      loadData()
    } catch (err: unknown) {
      console.error("Failed to create product:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to create product")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Products</h1>
                <p className="text-muted-foreground">View and add products to the catalog</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => (
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => { setSelectedProduct(product); setIsViewDialogOpen(true) }}
                              >
                                <IconEye className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Pagination Controls */}
                {filteredProducts.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page</span>
                      <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((size) => (
                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</Button>
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>Next</Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>Last</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to the catalog
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={isSaving}>
              {isSaving ? "Creating..." : "Add Product"}
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
    </SidebarProvider>
  )
}
