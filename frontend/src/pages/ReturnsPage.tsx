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
  IconArrowBackUp, 
  IconPlus,
  IconCheck,
  IconX,
  IconEye
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
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { returnApi, supplierApi, productApi, branchApi, type Return, type Supplier, type Product, type CreateReturnItem } from "@/lib/api"
import { toast } from "sonner"

interface ReturnItemForm {
  productId: string
  quantity: string
  unitCost: string
}

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="default" className="bg-green-500">Approved</Badge>
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="secondary">Pending</Badge>
  }
}

function ReturnsContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [returns, setReturns] = useState<Return[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [reason, setReason] = useState("")
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([
    { productId: "", quantity: "1", unitCost: "0" }
  ])

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
        const branchesData = await branchApi.getAll()
        const allReturns = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => returnApi.getByBranch(b.id).catch(() => [] as Return[]))
        )
        setReturns(allReturns.flat().sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()))
      } else if (selectedBranch?.id) {
        const returnsData = await returnApi.getByBranch(selectedBranch.id)
        setReturns(returnsData)
      } else {
        setReturns([])
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load returns")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReturn = async () => {
    if (!selectedBranch?.id || !selectedSupplierId || !reason || returnItems.some(item => !item.productId || !item.quantity || !item.unitCost)) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsSaving(true)
    try {
      const items: CreateReturnItem[] = returnItems.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity),
        unitCost: parseFloat(item.unitCost)
      }))
      
      await returnApi.create({
        branchId: selectedBranch.id,
        supplierId: parseInt(selectedSupplierId),
        reason,
        items
      })
      toast.success("Return request created successfully")
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

  const handleApproveReturn = async () => {
    if (!selectedReturn) return
    setIsSaving(true)
    try {
      await returnApi.approve(selectedReturn.id)
      toast.success("Return approved successfully")
      setIsApproveDialogOpen(false)
      setSelectedReturn(null)
      loadData()
    } catch (err) {
      console.error("Failed to approve return:", err)
      toast.error("Failed to approve return")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRejectReturn = async () => {
    if (!selectedReturn) return
    setIsSaving(true)
    try {
      await returnApi.reject(selectedReturn.id)
      toast.success("Return rejected")
      setIsRejectDialogOpen(false)
      setSelectedReturn(null)
      loadData()
    } catch (err) {
      console.error("Failed to reject return:", err)
      toast.error("Failed to reject return")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedSupplierId("")
    setReason("")
    setReturnItems([{ productId: "", quantity: "1", unitCost: "0" }])
  }

  const addItem = () => {
    setReturnItems([...returnItems, { productId: "", quantity: "1", unitCost: "0" }])
  }

  const removeItem = (index: number) => {
    if (returnItems.length > 1) {
      setReturnItems(returnItems.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ReturnItemForm, value: string) => {
    const newItems = [...returnItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReturnItems(newItems)
  }

  const totalAmount = returnItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0
    const cost = parseFloat(item.unitCost) || 0
    return sum + (qty * cost)
  }, 0)

  const pendingReturns = returns.filter(r => r.status === 'PENDING')
  const totalReturnsAmount = returns.reduce((sum, r) => sum + r.totalAmount, 0)

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(returns.length / pageSize))

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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Supplier Returns</h1>
                  <p className="text-muted-foreground">Return defective/damaged goods to suppliers</p>
                </div>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }} disabled={isCompanyView} title={isCompanyView ? "Select a branch to create returns" : ""}>
                  <IconPlus className="size-4 mr-2" />
                  Create Return
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Returns Value</CardDescription>
                    <CardTitle className="text-2xl">{formatUGX(totalReturnsAmount)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Returns</CardDescription>
                    <CardTitle className="text-2xl">{returns.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending Approval</CardDescription>
                    <CardTitle className="text-2xl">{pendingReturns.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconArrowBackUp className="size-5" />
                    Returns to Suppliers
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "Returns across all branches" : `Returns from ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : returns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No returns found. Click "Create Return" to create one.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Return #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const paginatedReturns = returns.slice((currentPage - 1) * pageSize, currentPage * pageSize)
                            return paginatedReturns.map((ret) => (
                              <TableRow key={ret.id}>
                                <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                                <TableCell>{new Date(ret.returnDate).toLocaleDateString()}</TableCell>
                                <TableCell>{ret.supplierName}</TableCell>
                                <TableCell>{ret.userName}</TableCell>
                                <TableCell>{getStatusBadge(ret.status)}</TableCell>
                                <TableCell className="text-right font-medium">{formatUGX(ret.totalAmount)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedReturn(ret); setIsViewDialogOpen(true) }}>
                                    <IconEye className="size-4" />
                                  </Button>
                                  {ret.status === 'PENDING' && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => { setSelectedReturn(ret); setIsApproveDialogOpen(true) }}>
                                        <IconCheck className="size-4 text-green-600" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => { setSelectedReturn(ret); setIsRejectDialogOpen(true) }}>
                                        <IconX className="size-4 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          })()}
                        </TableBody>
                      </Table>
                      
                      {/* Pagination Controls */}
                      {returns.length > 0 && (
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
                            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, returns.length)} of {returns.length}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Supplier Return</DialogTitle>
            <DialogDescription>
              Return defective or damaged goods to supplier
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Return *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Defective items, wrong products delivered..."
              />
            </div>
            <div className="space-y-2">
              <Label>Items to Return *</Label>
              {returnItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select value={item.productId} onValueChange={(v) => updateItem(index, 'productId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      min="1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                      placeholder="Unit Cost"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)} disabled={returnItems.length === 1}>
                      <IconX className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <IconPlus className="size-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="text-right text-lg font-bold">
              Total: {formatUGX(totalAmount)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReturn} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Return Details - {selectedReturn?.returnNumber}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Supplier</Label>
                  <p className="font-medium">{selectedReturn.supplierName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(selectedReturn.returnDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested By</Label>
                  <p className="font-medium">{selectedReturn.userName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedReturn.status)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedReturn.reason}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatUGX(item.unitCost)}</TableCell>
                        <TableCell className="text-right">{formatUGX(item.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right text-lg font-bold">
                Total: {formatUGX(selectedReturn.totalAmount)}
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

      {/* Approve Confirmation */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Return</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this return? Stock will be reduced accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveReturn} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Return</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this return request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectReturn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}

export function ReturnsPage() {
  return (
    <BranchProvider>
      <ReturnsContent />
    </BranchProvider>
  )
}
