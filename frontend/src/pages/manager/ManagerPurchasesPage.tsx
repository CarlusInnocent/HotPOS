import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { purchaseApi, supplierApi, productApi, type Purchase, type Supplier, type Product } from "@/lib/api"
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
  IconPackageImport,
  IconEye,
  IconCheck,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export function ManagerPurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  
  // Create purchase dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [notes, setNotes] = useState("")
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string; quantity: string; unitCost: string }>>([
    { productId: "", quantity: "", unitCost: "" }
  ])
  const [isCreating, setIsCreating] = useState(false)
  
  // View purchase dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  
  // Receive confirmation
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [sellingPriceUpdates, setSellingPriceUpdates] = useState<Record<number, string>>({})
  const [updatePrices, setUpdatePrices] = useState(false)
  const [serialEntries, setSerialEntries] = useState<Record<number, string[]>>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  useEffect(() => {
    if (user?.branchId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  const loadData = async () => {
    if (!user?.branchId) return
    setLoading(true)
    try {
      const [purchasesData, suppliersData, productsData] = await Promise.all([
        purchaseApi.getByBranch(user.branchId),
        supplierApi.getAll(),
        productApi.getAll()
      ])
      setAllPurchases(purchasesData)
      setSuppliers(suppliersData)
      setProducts(productsData)
      const pendingPurchases = purchasesData.filter(p => {
        const status = p.status?.toUpperCase()
        return !status || status === 'PENDING' || status === 'ORDERED'
      })
      setPurchases(pendingPurchases)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load purchases")
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

  const resetForm = () => {
    setSelectedSupplier("")
    setNotes("")
    setPurchaseItems([{ productId: "", quantity: "", unitCost: "" }])
  }

  const handleCreatePurchase = async () => {
    if (!user?.branchId) return
    
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

    setIsCreating(true)
    try {
      await purchaseApi.create({
        branchId: user.branchId,
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
    } finally {
      setIsCreating(false)
    }
  }

  const openReceiveDialog = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    const priceUpdates: Record<number, string> = {}
    purchase.items.forEach(item => {
      priceUpdates[item.productId] = item.sellingPrice?.toString() || ""
    })
    setSellingPriceUpdates(priceUpdates)
    setUpdatePrices(false)
    // Initialize serial entries for serialized products
    const serials: Record<number, string[]> = {}
    purchase.items.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (product?.requiresSerial) {
        serials[item.productId] = Array(item.quantity).fill("")
      }
    })
    setSerialEntries(serials)
    setIsReceiveDialogOpen(true)
  }

  const handleReceive = async () => {
    if (!selectedPurchase) return

    // Validate serial numbers for serialized products
    const hasSerialProducts = Object.keys(serialEntries).length > 0
    if (hasSerialProducts) {
      for (const [productIdStr, serials] of Object.entries(serialEntries)) {
        const productId = parseInt(productIdStr)
        const item = selectedPurchase.items.find(i => i.productId === productId)
        const emptySerials = serials.filter(s => !s.trim())
        if (emptySerials.length > 0) {
          toast.error(`Please enter all ${item?.quantity} serial numbers for ${item?.productName}`)
          return
        }
        const uniqueSerials = new Set(serials.map(s => s.trim()))
        if (uniqueSerials.size !== serials.length) {
          toast.error(`Duplicate serial numbers found for ${item?.productName}`)
          return
        }
      }
    }
    
    setIsReceiving(true)
    try {
      const needsItems = updatePrices || hasSerialProducts
      const items = needsItems
        ? selectedPurchase.items.map(item => ({
            productId: item.productId,
            sellingPrice: updatePrices && sellingPriceUpdates[item.productId] 
              ? parseFloat(sellingPriceUpdates[item.productId]) 
              : undefined,
            serialNumbers: serialEntries[item.productId]?.map(s => s.trim()).filter(s => s) || undefined
          }))
        : undefined
      
      await purchaseApi.receive(selectedPurchase.id, items)
      toast.success("Stock received successfully! Inventory has been updated.")
      setIsReceiveDialogOpen(false)
      setIsViewDialogOpen(false)
      setSelectedPurchase(null)
      setSellingPriceUpdates({})
      setUpdatePrices(false)
      setSerialEntries({})
      loadData()
    } catch (err: unknown) {
      console.error("Failed to receive stock:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to receive stock")
    } finally {
      setIsReceiving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'ordered':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ordered</Badge>
      case 'received':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Received</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Pagination calculations based on current view
  const displayedPurchases = showAll ? allPurchases : purchases
  const totalPages = Math.max(1, Math.ceil(displayedPurchases.length / pageSize))
  const paginatedPurchases = displayedPurchases.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Purchases & Stock Receiving</h1>
                <p className="text-muted-foreground">Manage purchase orders and receive incoming stock</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <IconPlus className="size-4 mr-2" />
                New Purchase
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button variant={!showAll ? "default" : "outline"} size="sm" onClick={() => setShowAll(false)}>
                  Pending ({purchases.length})
                </Button>
                <Button variant={showAll ? "default" : "outline"} size="sm" onClick={() => setShowAll(true)}>
                  All ({allPurchases.length})
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconPackageImport className="size-5" />
                  {showAll ? "All Purchases" : "Pending Deliveries"}
                </CardTitle>
                <CardDescription>
                  {showAll ? "All purchase orders for your branch" : "Purchases waiting to be received"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : displayedPurchases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {showAll ? "No purchases found." : "No pending deliveries."}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-mono text-sm">{purchase.purchaseNumber}</TableCell>
                            <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                            <TableCell>{purchase.supplierName}</TableCell>
                            <TableCell>{purchase.items.length}</TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(purchase.totalAmount)}</TableCell>
                            <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedPurchase(purchase); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                {(!purchase.status || purchase.status.toUpperCase() !== 'RECEIVED') && (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => openReceiveDialog(purchase)}
                                  >
                                    <IconCheck className="size-4 mr-1" />
                                    Receive
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Pagination Controls */}
                {displayedPurchases.length > 0 && (
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
                      Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, displayedPurchases.length)} of {displayedPurchases.length}
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

      {/* View Purchase Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Purchase Order - {selectedPurchase?.purchaseNumber}</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{getStatusBadge(selectedPurchase.status)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedPurchase.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-medium">{formatUGX(selectedPurchase.totalAmount)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedPurchase.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground"> x{item.quantity}</span>
                      </div>
                      <span>{formatUGX(item.totalCost)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPurchase.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm">{selectedPurchase.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedPurchase && (!selectedPurchase.status || selectedPurchase.status.toUpperCase() !== 'RECEIVED') && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setIsViewDialogOpen(false); openReceiveDialog(selectedPurchase) }}
              >
                <IconCheck className="size-4 mr-2" />
                Receive Stock
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Confirmation Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
            <DialogDescription>
              Confirm receipt and optionally update selling prices
            </DialogDescription>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">PO #:</span> <strong>{selectedPurchase.purchaseNumber}</strong></div>
                  <div><span className="text-muted-foreground">Supplier:</span> <strong>{selectedPurchase.supplierName}</strong></div>
                  <div><span className="text-muted-foreground">Products:</span> <strong>{selectedPurchase.items.length}</strong></div>
                  <div><span className="text-muted-foreground">Total Units:</span> <strong>{selectedPurchase.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-muted-foreground">Total Amount:</span> <strong>{formatUGX(selectedPurchase.totalAmount)}</strong>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="update-prices" 
                  checked={updatePrices}
                  onCheckedChange={(checked) => setUpdatePrices(checked === true)}
                />
                <Label htmlFor="update-prices" className="text-sm font-medium cursor-pointer">
                  Update selling prices for this branch
                </Label>
              </div>

              {updatePrices && (
                <div className="space-y-3 border rounded-lg p-3">
                  <Label className="text-sm font-medium">New Selling Prices</Label>
                  {selectedPurchase.items.map(item => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-muted-foreground text-xs">
                          Cost: {formatUGX(item.unitCost)} × {item.quantity}
                        </div>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="Sell Price"
                          value={sellingPriceUpdates[item.productId] || ""}
                          onChange={(e) => setSellingPriceUpdates(prev => ({
                            ...prev,
                            [item.productId]: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Serial Number Entry for Serialized Products */}
              {Object.keys(serialEntries).length > 0 && (
                <div className="space-y-4 border rounded-lg p-3">
                  <Label className="text-sm font-medium text-blue-700">Serial Numbers Required</Label>
                  {selectedPurchase.items
                    .filter(item => serialEntries[item.productId])
                    .map(item => (
                      <div key={`serial-${item.productId}`} className="space-y-2">
                        <div className="text-sm font-medium">{item.productName} <span className="text-muted-foreground">({item.quantity} serial{item.quantity !== 1 ? 's' : ''} needed)</span></div>
                        {serialEntries[item.productId]?.map((serial, idx) => (
                          <Input
                            key={`${item.productId}-${idx}`}
                            placeholder={`Serial #${idx + 1}`}
                            value={serial}
                            onChange={(e) => {
                              const updated = { ...serialEntries }
                              updated[item.productId] = [...updated[item.productId]]
                              updated[item.productId][idx] = e.target.value
                              setSerialEntries(updated)
                            }}
                            className="font-mono text-sm"
                          />
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)} disabled={isReceiving}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={isReceiving} className="bg-green-600 hover:bg-green-700">
              {isReceiving ? "Receiving..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                  {suppliers.filter(s => s.isActive).map(sup => (
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
                        <SelectValue placeholder="Select product" />
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
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePurchase} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
