import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider, useBranch } from "@/context/branch-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { 
  IconBuilding, 
  IconBuildingStore, 
  IconPlus, 
  IconSearch, 
  IconEdit,
  IconPackage,
  IconAlertTriangle,
  IconCheck
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { stockApi, productApi, categoryApi, branchApi, type StockItem, type Product, type Category } from "@/lib/api"

function InventoryContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showLowStock, setShowLowStock] = useState(false)
  
  // Add product dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    categoryId: "",
    sellingPrice: "",
    description: "",
    requiresSerial: false
  })

  // Stock adjustment dialog
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: "",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: ""
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, isCompanyView])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, categoriesData] = await Promise.all([
        productApi.getAll(),
        categoryApi.getAll()
      ])
      setProducts(productsData)
      setCategories(categoriesData)

      if (isCompanyView) {
        // Fetch stock from all branches
        const branchesData = await branchApi.getAll()
        const allStock = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => stockApi.getByBranch(b.id).catch(() => [] as StockItem[]))
        )
        setStockItems(allStock.flat())
      } else if (selectedBranch) {
        const stockData = await stockApi.getByBranch(selectedBranch.id)
        setStockItems(stockData)
      } else {
        setStockItems([])
      }
    } catch (error) {
      console.error("Failed to load inventory data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    try {
      await productApi.create({
        name: newProduct.name,
        sku: newProduct.sku,
        categoryId: parseInt(newProduct.categoryId),
        sellingPrice: parseFloat(newProduct.sellingPrice),
        description: newProduct.description,
        requiresSerial: newProduct.requiresSerial,
        isActive: true
      })
      setIsAddDialogOpen(false)
      setNewProduct({ name: "", sku: "", categoryId: "", sellingPrice: "", description: "", requiresSerial: false })
      loadData()
    } catch (error) {
      console.error("Failed to add product:", error)
    }
  }

  const handleStockAdjustment = async () => {
    if (!selectedStock || !selectedBranch) return
    try {
      await stockApi.updateStock(selectedBranch.id, selectedStock.productId, {
        quantity: parseInt(stockAdjustment.quantity),
        costPrice: parseFloat(stockAdjustment.costPrice),
        sellingPrice: parseFloat(stockAdjustment.sellingPrice),
        reorderLevel: stockAdjustment.reorderLevel ? parseInt(stockAdjustment.reorderLevel) : undefined
      })
      setIsStockDialogOpen(false)
      setSelectedStock(null)
      loadData()
    } catch (error) {
      console.error("Failed to update stock:", error)
    }
  }

  const openStockDialog = (item: StockItem) => {
    setSelectedStock(item)
    setStockAdjustment({
      quantity: item.quantity.toString(),
      costPrice: item.costPrice.toString(),
      sellingPrice: item.sellingPrice.toString(),
      reorderLevel: item.reorderLevel?.toString() || ""
    })
    setIsStockDialogOpen(true)
  }

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.productSku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || 
                          products.find(p => p.id === item.productId)?.categoryId.toString() === filterCategory
    const matchesLowStock = !showLowStock || item.quantity <= (item.reorderLevel || 10)
    return matchesSearch && matchesCategory && matchesLowStock
  })

  const lowStockCount = stockItems.filter(item => item.quantity <= (item.reorderLevel || 10)).length
  const totalValue = stockItems.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="px-4 lg:px-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isCompanyView ? (
                  <>
                    <IconBuilding className="size-4" />
                    <span>Viewing:</span>
                    <Badge variant="secondary">All Branches (Company-wide)</Badge>
                  </>
                ) : (
                  <>
                    <IconBuildingStore className="size-4" />
                    <span>Viewing:</span>
                    <Badge variant="outline">{selectedBranch?.name}</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {/* Header with stats */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Inventory Management</h1>
                  <p className="text-muted-foreground">Manage products, stock levels, and categories</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <IconPlus className="size-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Create a new product in the inventory
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="sku">SKU</Label>
                          <Input
                            id="sku"
                            value={newProduct.sku}
                            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={newProduct.categoryId}
                            onValueChange={(value) => setNewProduct({ ...newProduct, categoryId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="price">Selling Price</Label>
                          <Input
                            id="price"
                            type="number"
                            value={newProduct.sellingPrice}
                            onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <input
                          type="checkbox"
                          id="requiresSerial"
                          checked={newProduct.requiresSerial}
                          onChange={(e) => setNewProduct({ ...newProduct, requiresSerial: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div className="grid gap-0.5">
                          <Label htmlFor="requiresSerial" className="font-medium cursor-pointer">Requires Serial Number</Label>
                          <p className="text-xs text-muted-foreground">Enable for products tracked individually (e.g., electronics)</p>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddProduct}>Add Product</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Products</CardDescription>
                    <CardTitle className="text-2xl">{stockItems.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Stock Value</CardDescription>
                    <CardTitle className="text-2xl">UGX {totalValue.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={lowStockCount > 0 ? "border-yellow-500" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      {lowStockCount > 0 && <IconAlertTriangle className="size-4 text-yellow-500" />}
                      Low Stock Items
                    </CardDescription>
                    <CardTitle className="text-2xl">{lowStockCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Categories</CardDescription>
                    <CardTitle className="text-2xl">{categories.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-sm">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showLowStock ? "default" : "outline"}
                  onClick={() => setShowLowStock(!showLowStock)}
                >
                  <IconAlertTriangle className="size-4 mr-2" />
                  Low Stock Only
                </Button>
              </div>

              {/* Stock Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconPackage className="size-5" />
                    Stock Items ({filteredItems.length})
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "Stock levels across all branches" : `Current stock levels for ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Cost Price</TableHead>
                          <TableHead className="text-right">Selling Price</TableHead>
                          <TableHead className="text-right">Reorder Level</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const isLowStock = item.quantity <= (item.reorderLevel || 10)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">UGX {item.costPrice.toLocaleString()}</TableCell>
                              <TableCell className="text-right">UGX {item.sellingPrice.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{item.reorderLevel || 10}</TableCell>
                              <TableCell>
                                {isLowStock ? (
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                    <IconAlertTriangle className="size-3" />
                                    Low Stock
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                    <IconCheck className="size-3" />
                                    In Stock
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openStockDialog(item)}
                                >
                                  <IconEdit className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {filteredItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No products found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedStock?.productName}</DialogTitle>
            <DialogDescription>
              Update stock quantity and pricing
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost Price</Label>
                <Input
                  id="cost"
                  type="number"
                  value={stockAdjustment.costPrice}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, costPrice: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sell">Selling Price</Label>
                <Input
                  id="sell"
                  type="number"
                  value={stockAdjustment.sellingPrice}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, sellingPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reorder">Reorder Level</Label>
              <Input
                id="reorder"
                type="number"
                value={stockAdjustment.reorderLevel}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, reorderLevel: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export function InventoryPage() {
  return (
    <BranchProvider>
      <InventoryContent />
    </BranchProvider>
  )
}
