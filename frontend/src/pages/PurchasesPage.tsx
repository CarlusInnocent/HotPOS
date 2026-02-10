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
  IconTruck, 
  IconPlus,
  IconEye,
  IconCheck,
  IconClock,
  IconX,
  IconPackage
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { purchaseApi, supplierApi, productApi, branchApi, type Purchase, type Supplier, type Product } from "@/lib/api"
import { toast } from "sonner"

function PurchasesContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [notes, setNotes] = useState("")
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string; quantity: string; unitCost: string }>>([
    { productId: "", quantity: "", unitCost: "" }
  ])

  // View dialog state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, isCompanyView])

  const loadData = async () => {
    setLoading(true)
    try {
      const [suppliersData, productsData] = await Promise.all([
        supplierApi.getAll(),
        productApi.getAll()
      ])
      setSuppliers(suppliersData)
      setProducts(productsData)

      if (isCompanyView) {
        // Fetch from all branches
        const branchesData = await branchApi.getAll()
        const allPurchases = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => purchaseApi.getByBranch(b.id).catch(() => [] as Purchase[]))
        )
        setPurchases(allPurchases.flat().sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()))
      } else if (selectedBranch) {
        const purchasesData = await purchaseApi.getByBranch(selectedBranch.id)
        setPurchases(purchasesData)
      } else {
        setPurchases([])
      }
    } catch (error) {
      console.error("Failed to load purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setPurchaseItems([...purchaseItems, { productId: "", quantity: "", unitCost: "" }])
  }

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...purchaseItems]
    updated[index] = { ...updated[index], [field]: value }
    setPurchaseItems(updated)
  }

  const handleCreatePurchase = async () => {
    if (!selectedBranch) return
    
    const parsedItems = purchaseItems.map(item => ({
      productId: item.productId,
      quantity: parseInt(item.quantity, 10),
      unitCost: item.unitCost.trim() === "" ? NaN : parseFloat(item.unitCost)
    }))

    const hasNegativeCost = parsedItems.some(item => Number.isFinite(item.unitCost) && item.unitCost < 0)
    if (hasNegativeCost) {
      toast.error("Unit cost cannot be negative")
      return
    }

    const validItems = parsedItems.filter(item =>
      item.productId && Number.isFinite(item.quantity) && item.quantity > 0
    )

    if (!selectedSupplier || validItems.length === 0) {
      toast.error("Please select a supplier and add at least one item with quantity above 0")
      return
    }

    try {
      await purchaseApi.create({
        branchId: selectedBranch.id,
        supplierId: parseInt(selectedSupplier),
        notes: notes || undefined,
        items: validItems.map(item => ({
          productId: parseInt(item.productId),
          quantity: item.quantity,
          unitCost: Number.isFinite(item.unitCost) && item.unitCost >= 0 ? item.unitCost : undefined
        }))
      })
      toast.success("Purchase order created successfully!")
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (err: unknown) {
      console.error("Failed to create purchase:", err)
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string> } } }
      const validationMessage = error.response?.data?.errors
        ? Object.values(error.response.data.errors).join(", ")
        : undefined
      toast.error(validationMessage || error.response?.data?.message || "Failed to create purchase order")
    }
  }

  const handleReceive = async (id: number) => {
    try {
      await purchaseApi.receive(id)
      loadData()
    } catch (error) {
      console.error("Failed to receive purchase:", error)
    }
  }

  const resetForm = () => {
    setSelectedSupplier("")
    setNotes("")
    setPurchaseItems([{ productId: "", quantity: "", unitCost: "" }])
  }

  const viewPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setIsViewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="flex items-center gap-1"><IconClock className="size-3" />Pending</Badge>
      case "RECEIVED":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800"><IconCheck className="size-3" />Received</Badge>
      case "CANCELLED":
        return <Badge variant="destructive" className="flex items-center gap-1"><IconX className="size-3" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingCount = purchases.filter(p => p.status === "PENDING").length
  const totalPurchaseValue = purchases.reduce((acc, p) => acc + p.totalAmount, 0)

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(purchases.length / pageSize))
  const paginatedPurchases = purchases.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Purchase Orders</h1>
                  <p className="text-muted-foreground">Manage supplier orders and receiving</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={isCompanyView} title={isCompanyView ? "Select a branch to create purchases" : ""}>
                      <IconPlus className="size-4 mr-2" />
                      New Purchase Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                      <DialogDescription>
                        Create a new purchase order from a supplier
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Supplier</Label>
                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map(sup => (
                              <SelectItem key={sup.id} value={sup.id.toString()}>
                                {sup.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Items</Label>
                        {purchaseItems.map((item, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Select 
                                value={item.productId} 
                                onValueChange={(v) => handleItemChange(index, 'productId', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map(prod => (
                                    <SelectItem key={prod.id} value={prod.id.toString()}>
                                      {prod.name} ({prod.sku})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              type="number"
                              placeholder="Qty"
                              className="w-20"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Unit Cost"
                              className="w-28"
                              value={item.unitCost}
                              onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                            />
                            {purchaseItems.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <IconX className="size-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                          <IconPlus className="size-4 mr-2" />
                          Add Item
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea 
                          value={notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                          placeholder="Any additional notes..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePurchase}>Create Order</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Orders</CardDescription>
                    <CardTitle className="text-2xl">{purchases.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending Orders</CardDescription>
                    <CardTitle className="text-2xl">{pendingCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Purchase Value</CardDescription>
                    <CardTitle className="text-2xl">UGX {totalPurchaseValue.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active Suppliers</CardDescription>
                    <CardTitle className="text-2xl">{suppliers.filter(s => s.isActive).length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Purchases Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconTruck className="size-5" />
                    Purchase Orders
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "All purchase orders across branches" : `All purchase orders for ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPurchases.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No purchase orders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedPurchases.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                              <TableCell>{purchase.supplierName}</TableCell>
                              <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                              <TableCell>{purchase.items?.length || 0} items</TableCell>
                              <TableCell className="text-right">UGX {purchase.totalAmount.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => viewPurchase(purchase)}
                                  >
                                    <IconEye className="size-4" />
                                  </Button>
                                  {purchase.status === "PENDING" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReceive(purchase.id)}
                                    >
                                      <IconPackage className="size-4 mr-1" />
                                      Receive
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination Controls */}
                    {purchases.length > 0 && (
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
                          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, purchases.length)} of {purchases.length}
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
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* View Purchase Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order - {selectedPurchase?.purchaseNumber}</DialogTitle>
            <DialogDescription>
              From {selectedPurchase?.supplierName} on {selectedPurchase && new Date(selectedPurchase.purchaseDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              {selectedPurchase && getStatusBadge(selectedPurchase.status)}
            </div>
            {selectedPurchase?.notes && (
              <div>
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1">{selectedPurchase.notes}</p>
              </div>
            )}
            <div>
              <span className="font-medium">Items:</span>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPurchase?.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">UGX {item.unitCost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">UGX {item.totalCost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="text-xl font-bold">UGX {selectedPurchase?.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
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

export function PurchasesPage() {
  return (
    <BranchProvider>
      <PurchasesContent />
    </BranchProvider>
  )
}
