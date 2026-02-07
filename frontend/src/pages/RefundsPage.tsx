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
  IconCashBanknote, 
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
import { refundApi, customerApi, branchApi, salesApi, type Refund, type Customer, type Sale, type SaleItem, type CreateRefundItem } from "@/lib/api"
import { IconSearch } from "@tabler/icons-react"
import { toast } from "sonner"

interface RefundItemForm {
  productId: string
  productName: string
  quantity: string
  maxQuantity: number
  unitPrice: string
  selected: boolean
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "credit", label: "Store Credit" },
  { value: "bank_transfer", label: "Bank Transfer" },
]

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

function getPaymentMethodLabel(method: string) {
  const found = paymentMethods.find(m => m.value === method)
  return found?.label || method
}

function RefundsContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Receipt lookup state
  const [receiptNumber, setReceiptNumber] = useState("")
  const [lookupSale, setLookupSale] = useState<Sale | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState("")

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [refundMethod, setRefundMethod] = useState<string>("cash")
  const [reason, setReason] = useState("")
  const [refundItems, setRefundItems] = useState<RefundItemForm[]>([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, isCompanyView])

  const handleLookupReceipt = async () => {
    if (!receiptNumber.trim()) {
      toast.error("Please enter a receipt number")
      return
    }
    setIsLookingUp(true)
    setLookupError("")
    setLookupSale(null)
    setRefundItems([])
    try {
      const sale = await salesApi.getBySaleNumber(receiptNumber.trim())
      setLookupSale(sale)
      // Auto-fill customer
      if (sale.customerId) {
        setSelectedCustomerId(sale.customerId.toString())
      }
      // Auto-fill payment method
      if (sale.paymentMethod) {
        setRefundMethod(sale.paymentMethod.toLowerCase())
      }
      // Populate items from sale with checkboxes
      setRefundItems(sale.items.map((item: SaleItem) => ({
        productId: item.productId.toString(),
        productName: item.productName,
        quantity: item.quantity.toString(),
        maxQuantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        selected: true
      })))
    } catch {
      setLookupError("Receipt not found. Please check the number and try again.")
    } finally {
      setIsLookingUp(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const customersData = await customerApi.getAll()
      setCustomers(customersData)

      if (isCompanyView) {
        const branchesData = await branchApi.getAll()
        const allRefunds = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => refundApi.getByBranch(b.id).catch(() => [] as Refund[]))
        )
        setRefunds(allRefunds.flat().sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()))
      } else if (selectedBranch?.id) {
        const refundsData = await refundApi.getByBranch(selectedBranch.id)
        setRefunds(refundsData)
      } else {
        setRefunds([])
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load refunds")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRefund = async () => {
    const selectedItems = refundItems.filter(item => item.selected)
    if (!selectedBranch?.id || !lookupSale || !reason || !refundMethod || selectedItems.length === 0) {
      toast.error("Please look up a receipt, select items, and fill in required fields")
      return
    }
    setIsSaving(true)
    try {
      const items: CreateRefundItem[] = selectedItems.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice)
      }))
      
      await refundApi.create({
        branchId: selectedBranch.id,
        saleId: lookupSale.id,
        customerId: selectedCustomerId ? parseInt(selectedCustomerId) : undefined,
        reason,
        refundMethod: refundMethod as 'cash' | 'card' | 'mobile_money' | 'credit' | 'bank_transfer',
        items
      })
      toast.success("Refund request created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (err: unknown) {
      console.error("Failed to create refund:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to create refund")
    } finally {
      setIsSaving(false)
    }
  }

  const handleApproveRefund = async () => {
    if (!selectedRefund) return
    setIsSaving(true)
    try {
      await refundApi.approve(selectedRefund.id)
      toast.success("Refund approved successfully")
      setIsApproveDialogOpen(false)
      setSelectedRefund(null)
      loadData()
    } catch (err) {
      console.error("Failed to approve refund:", err)
      toast.error("Failed to approve refund")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRejectRefund = async () => {
    if (!selectedRefund) return
    setIsSaving(true)
    try {
      await refundApi.reject(selectedRefund.id)
      toast.success("Refund rejected")
      setIsRejectDialogOpen(false)
      setSelectedRefund(null)
      loadData()
    } catch (err) {
      console.error("Failed to reject refund:", err)
      toast.error("Failed to reject refund")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedCustomerId("")
    setRefundMethod("cash")
    setReason("")
    setRefundItems([])
    setReceiptNumber("")
    setLookupSale(null)
    setLookupError("")
  }

  const toggleItem = (index: number) => {
    const newItems = [...refundItems]
    newItems[index] = { ...newItems[index], selected: !newItems[index].selected }
    setRefundItems(newItems)
  }

  const updateItemQuantity = (index: number, value: string) => {
    const newItems = [...refundItems]
    const qty = parseInt(value) || 0
    // Don't allow more than original sale quantity
    if (qty <= newItems[index].maxQuantity) {
      newItems[index] = { ...newItems[index], quantity: value }
      setRefundItems(newItems)
    }
  }

  const totalAmount = refundItems.filter(i => i.selected).reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0
    const price = parseFloat(item.unitPrice) || 0
    return sum + (qty * price)
  }, 0)

  const pendingRefunds = refunds.filter(r => r.status === 'PENDING')
  const totalRefundsAmount = refunds.reduce((sum, r) => sum + r.totalAmount, 0)

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
                  <h1 className="text-2xl font-bold">Customer Refunds</h1>
                  <p className="text-muted-foreground">Process refunds for returned items</p>
                </div>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }} disabled={isCompanyView} title={isCompanyView ? "Select a branch to create refunds" : ""}>
                  <IconPlus className="size-4 mr-2" />
                  Create Refund
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Refunds Value</CardDescription>
                    <CardTitle className="text-2xl">{formatUGX(totalRefundsAmount)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Refunds</CardDescription>
                    <CardTitle className="text-2xl">{refunds.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending Approval</CardDescription>
                    <CardTitle className="text-2xl">{pendingRefunds.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconCashBanknote className="size-5" />
                    Customer Refunds
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "Refunds across all branches" : `Refunds from ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : refunds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No refunds found. Click "Create Refund" to create one.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Refund #</TableHead>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Processed By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {refunds.map((refund) => (
                            <TableRow key={refund.id}>
                              <TableCell className="font-medium">{refund.refundNumber}</TableCell>
                              <TableCell className="font-mono text-sm">{refund.saleNumber || "—"}</TableCell>
                              <TableCell>{new Date(refund.refundDate).toLocaleDateString()}</TableCell>
                              <TableCell>{refund.customerName || "Walk-in"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{getPaymentMethodLabel(refund.refundMethod)}</Badge>
                              </TableCell>
                              <TableCell>{refund.userName}</TableCell>
                              <TableCell>{getStatusBadge(refund.status)}</TableCell>
                              <TableCell className="text-right font-medium">{formatUGX(refund.totalAmount)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedRefund(refund); setIsViewDialogOpen(true) }}>
                                  <IconEye className="size-4" />
                                </Button>
                                {refund.status === 'PENDING' && (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedRefund(refund); setIsApproveDialogOpen(true) }}>
                                      <IconCheck className="size-4 text-green-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedRefund(refund); setIsRejectDialogOpen(true) }}>
                                      <IconX className="size-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
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
        </div>
      </SidebarInset>

      {/* Create Refund Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Customer Refund</DialogTitle>
            <DialogDescription>
              Enter a receipt number to look up the sale and select items to refund
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Receipt Lookup */}
            <div className="grid gap-2">
              <Label htmlFor="receiptNumber">Receipt / Sale Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="receiptNumber"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g., SAL-HQ-20260206143022"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupReceipt()}
                />
                <Button onClick={handleLookupReceipt} disabled={isLookingUp} variant="secondary">
                  <IconSearch className="size-4 mr-1" />
                  {isLookingUp ? "Looking up..." : "Look Up"}
                </Button>
              </div>
              {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
            </div>

            {lookupSale && (
              <>
                {/* Sale Info */}
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Receipt:</span> <span className="font-medium">{lookupSale.saleNumber}</span></div>
                    <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(lookupSale.saleDate).toLocaleDateString()}</span></div>
                    <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{lookupSale.customerName || "Walk-in"}</span></div>
                    <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{formatUGX(lookupSale.grandTotal)}</span></div>
                  </div>
                </div>

                {/* Items from sale with checkboxes */}
                <div className="space-y-2">
                  <Label>Select Items to Refund *</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="w-[80px] text-right">Qty</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {refundItems.map((item, index) => (
                          <TableRow key={index} className={!item.selected ? "opacity-50" : ""}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleItem(index)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-right">{formatUGX(parseFloat(item.unitPrice))}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, e.target.value)}
                                min="1"
                                max={item.maxQuantity}
                                className="w-16 h-8 text-right"
                                disabled={!item.selected}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {item.selected ? formatUGX((parseInt(item.quantity) || 0) * parseFloat(item.unitPrice)) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Walk-in customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="refundMethod">Refund Method *</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason for Refund *</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Customer dissatisfied, wrong item purchased..."
                  />
                </div>

                <div className="text-right text-lg font-bold">
                  Total Refund: {formatUGX(totalAmount)}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRefund} disabled={isSaving || !lookupSale}>
              {isSaving ? "Creating..." : "Create Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Refund Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Refund Details - {selectedRefund?.refundNumber}</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedRefund.customerName || "Walk-in"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(selectedRefund.refundDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Receipt #</Label>
                  <p className="font-medium font-mono">{selectedRefund.saleNumber || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Processed By</Label>
                  <p className="font-medium">{selectedRefund.userName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedRefund.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Refund Method</Label>
                  <p className="font-medium">{getPaymentMethodLabel(selectedRefund.refundMethod)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedRefund.reason}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRefund.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatUGX(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatUGX(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right text-lg font-bold">
                Total: {formatUGX(selectedRefund.totalAmount)}
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
            <AlertDialogTitle>Approve Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this refund? The refund amount will be processed and stock will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveRefund} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this refund request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectRefund}
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

export function RefundsPage() {
  return (
    <BranchProvider>
      <RefundsContent />
    </BranchProvider>
  )
}
