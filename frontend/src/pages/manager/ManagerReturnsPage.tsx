import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { returnApi, stockApi, supplierApi, type Return, type StockItem, type Supplier } from "@/lib/api"
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
  IconTruckReturn,
  IconPlus,
  IconEye,
  IconTrash,
  IconCheck,
  IconX,
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
import { Separator } from "@/components/ui/separator"

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

interface ReturnItem {
  productId: number
  productName: string
  quantity: number
  unitCost: number
  reason: string
}

export function ManagerReturnsPage() {
  const { user } = useAuth()
  const [returns, setReturns] = useState<Return[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create return dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  // Add item form
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [itemQuantity, setItemQuantity] = useState("")
  const [itemReason, setItemReason] = useState("")
  
  // View return dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)

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
      const [returnsData, stockData, suppliersData] = await Promise.all([
        returnApi.getByBranch(user.branchId),
        stockApi.getByBranch(user.branchId),
        supplierApi.getAll(),
      ])
      // Manager sees ALL branch returns
      setReturns(returnsData)
      setStock(stockData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load returns data")
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedProduct || !itemQuantity) {
      toast.error("Please select a product and enter quantity")
      return
    }
    
    const product = stock.find(s => s.id.toString() === selectedProduct)
    if (!product) return
    
    const qty = parseInt(itemQuantity)
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0")
      return
    }
    
    if (returnItems.some(item => item.productId === product.id)) {
      toast.error("Product already added to return")
      return
    }
    
    setReturnItems([...returnItems, {
      productId: product.id,
      productName: product.productName,
      quantity: qty,
      unitCost: product.costPrice,
      reason: itemReason,
    }])
    
    setSelectedProduct("")
    setItemQuantity("")
    setItemReason("")
  }

  const handleRemoveItem = (productId: number) => {
    setReturnItems(returnItems.filter(item => item.productId !== productId))
  }

  const handleCreateReturn = async () => {
    if (!user?.branchId || !selectedSupplier || returnItems.length === 0) {
      toast.error("Please select a supplier and add at least one item")
      return
    }
    
    setIsSaving(true)
    try {
      await returnApi.create({
        branchId: user.branchId,
        supplierId: parseInt(selectedSupplier),
        reason: notes,
        items: returnItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          reason: item.reason,
        })),
      })
      toast.success("Return created successfully.")
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (err: unknown) {
      console.error("Failed to create return:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to create return")
    } finally {
      setIsSaving(false)
    }
  }

  const handleApproveReturn = async (ret: Return) => {
    try {
      await returnApi.approve(ret.id)
      toast.success(`Return ${ret.returnNumber} approved`)
      loadData()
    } catch (error) {
      console.error("Failed to approve return:", error)
      toast.error("Failed to approve return")
    }
  }

  const handleRejectReturn = async (ret: Return) => {
    try {
      await returnApi.reject(ret.id)
      toast.success(`Return ${ret.returnNumber} rejected`)
      loadData()
    } catch (error) {
      console.error("Failed to reject return:", error)
      toast.error("Failed to reject return")
    }
  }

  const resetForm = () => {
    setSelectedSupplier("")
    setReturnItems([])
    setNotes("")
    setSelectedProduct("")
    setItemQuantity("")
    setItemReason("")
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const totalReturnValue = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  const pendingReturns = returns.filter(r => r.status?.toLowerCase() === 'pending')

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Returns to Supplier</h1>
                <p className="text-muted-foreground">Manage and approve returns to suppliers</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <IconPlus className="size-4 mr-2" />
                New Return
              </Button>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Returns</CardDescription>
                  <CardTitle className="text-2xl">{returns.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Approval</CardDescription>
                  <CardTitle className="text-2xl text-yellow-600">{pendingReturns.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Value</CardDescription>
                  <CardTitle className="text-2xl">{formatUGX(returns.reduce((s, r) => s + r.totalAmount, 0))}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconTruckReturn className="size-5" />
                  All Branch Returns
                </CardTitle>
                <CardDescription>Returns submitted by all staff</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : returns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No returns found.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Return #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[160px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returns.map((ret) => (
                          <TableRow key={ret.id}>
                            <TableCell className="font-mono text-sm">{ret.returnNumber}</TableCell>
                            <TableCell>{new Date(ret.returnDate).toLocaleDateString()}</TableCell>
                            <TableCell>{ret.supplierName}</TableCell>
                            <TableCell>{ret.items.length}</TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(ret.totalAmount)}</TableCell>
                            <TableCell>{getStatusBadge(ret.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedReturn(ret); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                {ret.status?.toLowerCase() === 'pending' && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleApproveReturn(ret)}
                                      title="Approve"
                                    >
                                      <IconCheck className="size-4 text-green-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleRejectReturn(ret)}
                                      title="Reject"
                                    >
                                      <IconX className="size-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
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

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Return to Supplier</DialogTitle>
            <DialogDescription>
              Return defective, expired, or incorrect products to the supplier
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Add Items</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {stock.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.productName} (Stock: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Qty</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddItem} size="sm">
                    Add
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="itemReason">Reason</Label>
                <Input
                  id="itemReason"
                  value={itemReason}
                  onChange={(e) => setItemReason(e.target.value)}
                  placeholder="e.g., Defective, Expired, Wrong item"
                />
              </div>
            </div>

            {returnItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Items to Return</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnItems.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatUGX(item.unitCost)}</TableCell>
                            <TableCell>{formatUGX(item.quantity * item.unitCost)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.reason || '-'}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <IconTrash className="size-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right font-bold">
                    Total: {formatUGX(totalReturnValue)}
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this return..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreateReturn} disabled={isSaving || returnItems.length === 0}>
              {isSaving ? "Creating..." : "Submit Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Return Details - {selectedReturn?.returnNumber}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{new Date(selectedReturn.returnDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{getStatusBadge(selectedReturn.status)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedReturn.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Value:</span>
                  <p className="font-medium">{formatUGX(selectedReturn.totalAmount)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedReturn.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground"> x{item.quantity}</span>
                        {item.reason && (
                          <p className="text-xs text-muted-foreground">Reason: {item.reason}</p>
                        )}
                      </div>
                      <span>{formatUGX(item.totalCost)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReturn.reason && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-sm">Reason:</span>
                    <p className="text-sm">{selectedReturn.reason}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {selectedReturn?.status?.toLowerCase() === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => { handleRejectReturn(selectedReturn); setIsViewDialogOpen(false) }}
                >
                  <IconX className="size-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => { handleApproveReturn(selectedReturn); setIsViewDialogOpen(false) }}
                >
                  <IconCheck className="size-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
