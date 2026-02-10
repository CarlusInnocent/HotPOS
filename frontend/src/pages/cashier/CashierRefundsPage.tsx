import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { refundApi, customerApi, salesApi, type Refund, type Customer, type Sale, type SaleItem, type CreateRefundItem } from "@/lib/api"
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
  IconCashBanknote,
  IconPlus,
  IconEye,
  IconSearch,
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
import { Separator } from "@/components/ui/separator"

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

export function CashierRefundsPage() {
  const { user } = useAuth()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

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
    if (user?.branchId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

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
      if (sale.customerId) {
        setSelectedCustomerId(sale.customerId.toString())
      }
      if (sale.paymentMethod) {
        setRefundMethod(sale.paymentMethod.toLowerCase())
      }
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
    if (!user?.branchId) return
    setLoading(true)
    try {
      const [refundsData, customersData] = await Promise.all([
        refundApi.getByBranch(user.branchId),
        customerApi.getAll()
      ])
      const myRefunds = refundsData.filter(r => r.userId === user.userId)
      setRefunds(myRefunds)
      setCustomers(customersData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load refunds")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRefund = async () => {
    const selectedItems = refundItems.filter(item => item.selected)
    if (!user?.branchId || !lookupSale || !reason || !refundMethod || selectedItems.length === 0) {
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
        branchId: user.branchId,
        saleId: lookupSale.id,
        customerId: selectedCustomerId ? parseInt(selectedCustomerId) : undefined,
        reason,
        refundMethod: refundMethod.toUpperCase() as 'cash' | 'card' | 'mobile_money' | 'credit' | 'bank_transfer',
        items
      })
      toast.success("Refund request submitted for approval")
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

  const pendingCount = refunds.filter(r => r.status === 'PENDING').length
  const approvedCount = refunds.filter(r => r.status === 'APPROVED').length
  const totalRefunded = refunds.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.totalAmount, 0)

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(refunds.length / pageSize))
  const paginatedRefunds = refunds.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Process Refunds</h1>
                <p className="text-muted-foreground">Create and track customer refunds</p>
              </div>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
                <IconPlus className="size-4 mr-2" />
                New Refund
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Refunded</CardDescription>
                  <CardTitle className="text-2xl">{formatUGX(totalRefunded)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{approvedCount} approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Approval</CardDescription>
                  <CardTitle className="text-2xl">{pendingCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>My Total Refunds</CardDescription>
                  <CardTitle className="text-2xl">{refunds.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCashBanknote className="size-5" />
                  My Refund Requests
                </CardTitle>
                <CardDescription>
                  Refunds you have processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : refunds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No refunds yet. Click "New Refund" to create one.
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
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRefunds.map((refund) => (
                          <TableRow key={refund.id}>
                            <TableCell className="font-mono text-sm">{refund.refundNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{refund.saleNumber || "—"}</TableCell>
                            <TableCell>{new Date(refund.refundDate).toLocaleDateString()}</TableCell>
                            <TableCell>{refund.customerName || "Walk-in"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {refund.refundMethod.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(refund.status)}</TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(refund.totalAmount)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => { setSelectedRefund(refund); setIsViewDialogOpen(true) }}
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
                {refunds.length > 0 && (
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
                      Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, refunds.length)} of {refunds.length}
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

      {/* Create Refund Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Customer Refund</DialogTitle>
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
                  {isLookingUp ? "..." : "Look Up"}
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
                    placeholder="e.g., Customer dissatisfied, wrong item purchased, defective product..."
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
              {isSaving ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Refund Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Refund Details - {selectedRefund?.refundNumber}</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedRefund.customerName || "Walk-in"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Receipt #</Label>
                  <p className="font-medium font-mono">{selectedRefund.saleNumber || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(selectedRefund.refundDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Method</Label>
                  <p className="font-medium capitalize">{selectedRefund.refundMethod.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedRefund.status)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedRefund.reason}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                {selectedRefund.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span>{item.productName}</span>
                      <span className="text-muted-foreground"> x{item.quantity}</span>
                    </div>
                    <span>{formatUGX(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatUGX(selectedRefund.totalAmount)}</span>
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
