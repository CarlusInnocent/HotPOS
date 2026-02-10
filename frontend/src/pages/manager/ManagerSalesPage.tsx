import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { useCompany } from "@/context/CompanyContext"
import { salesApi, dashboardApi, type Sale, type DashboardStats } from "@/lib/api"
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
  IconReceipt,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconEye,
  IconRefresh,
  IconTrash,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

function formatUGX(amount: number | undefined | null): string {
  return `UGX ${(amount ?? 0).toLocaleString()}`
}

function getPaymentIcon(method: string) {
  switch (method.toLowerCase()) {
    case 'cash':
      return <IconCash className="size-4" />
    case 'card':
      return <IconCreditCard className="size-4" />
    case 'mobile_money':
      return <IconDeviceMobile className="size-4" />
    default:
      return <IconCash className="size-4" />
  }
}

export function ManagerSalesPage() {
  const { user } = useAuth()
  const { settings: company } = useCompany()
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  useEffect(() => {
    if (user?.branchId) {
      loadSales()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  const loadSales = async () => {
    if (!user?.branchId) return
    setLoading(true)
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const [data, statsData] = await Promise.all([
        salesApi.getByDateRange(user.branchId, today, today),
        dashboardApi.getStats(user.branchId)
      ])
      setSales(data)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load sales:", error)
      toast.error("Failed to load today's sales")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSale = async () => {
    if (!saleToDelete) return
    try {
      await salesApi.refund(saleToDelete.id)
      toast.success("Sale voided/refunded successfully")
      setIsDeleteDialogOpen(false)
      setSaleToDelete(null)
      loadSales()
    } catch (error) {
      console.error("Failed to void sale:", error)
      toast.error("Failed to void sale")
    }
  }

  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.grandTotal, 0)
  const cardSales = sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.grandTotal, 0)

  const totalPages = Math.max(1, Math.ceil(sales.length / pageSize))
  const paginatedSales = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Today's Sales</h1>
                <p className="text-muted-foreground">
                  All branch sales for {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <Button variant="outline" onClick={loadSales} disabled={loading}>
                <IconRefresh className="size-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net Sales Today</CardDescription>
                  <CardTitle className="text-2xl">{formatUGX(stats?.totalSalesToday)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stats?.transactionCountToday || 0} transactions (after refunds)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <IconCash className="size-4" /> Cash
                  </CardDescription>
                  <CardTitle className="text-xl">{formatUGX(cashSales)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <IconCreditCard className="size-4" /> Card
                  </CardDescription>
                  <CardTitle className="text-xl">{formatUGX(cardSales)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    Net Profit
                  </CardDescription>
                  <CardTitle className={`text-xl ${(stats?.netProfitThisMonth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatUGX(stats?.netProfitThisMonth)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-xs">
                    {(stats?.netProfitThisMonth || 0) >= 0 ? (
                      <IconTrendingUp className="size-3 text-green-500" />
                    ) : (
                      <IconTrendingDown className="size-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">This month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconReceipt className="size-5" />
                  Sales Transactions
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sales yet today.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.map((sale) => (
                          <TableRow key={sale.id} className={
                            sale.refundStatus === 'FULL'
                              ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50'
                              : sale.refundStatus === 'PARTIAL'
                                ? 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50'
                                : ''
                          }>
                            <TableCell className="font-mono text-sm leading-tight">
                              <div>{sale.saleNumber}</div>
                              {sale.referenceNumber && (
                                <div className="text-[11px] text-muted-foreground">Ref: {sale.referenceNumber}</div>
                              )}
                            </TableCell>
                            <TableCell>{new Date(sale.createdAt || sale.saleDate).toLocaleTimeString()}</TableCell>
                            <TableCell>{sale.customerName || "Walk-in"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                {getPaymentIcon(sale.paymentMethod)}
                                {sale.paymentMethod.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{sale.items.length}</TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(sale.grandTotal)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedSale(sale); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSaleToDelete(sale); setIsDeleteDialogOpen(true) }}
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
                {/* Pagination Controls */}
                {sales.length > 0 && (
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
                      Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sales.length)} of {sales.length}
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

      {/* View Sale Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receipt - {selectedSale?.saleNumber}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4" style={{ fontSize: '2.16em' }}>
              <div className="text-center border-b pb-4">
                <h3 className="font-bold text-lg">{company.companyName}</h3>
                <p className="text-sm text-muted-foreground">{selectedSale.branchName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedSale.createdAt || selectedSale.saleDate).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span>{selectedSale.customerName || "Walk-in"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="capitalize">{selectedSale.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                {selectedSale.items.map(item => (
                  <div key={item.id} className="text-sm border-b border-dashed pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                    <p className="font-medium">{item.productName}</p>
                    <div className="flex justify-between text-muted-foreground text-xs mt-0.5">
                      <span>{item.quantity} x {formatUGX(item.unitPrice || 0)}</span>
                      <span className="font-semibold text-foreground text-sm">{formatUGX(item.totalPrice)}</span>
                    </div>
                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                      <div className="mt-1 pl-2 border-l-2 border-foreground/30">
                        <p className="text-xs font-semibold">S/N:</p>
                        {item.serialNumbers.map((sn, idx) => (
                          <p key={idx} className="text-xs font-mono font-medium">{sn}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatUGX(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatUGX(selectedSale.grandTotal)}</span>
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

      {/* Delete/Void Sale Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Void Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to void sale <strong>{saleToDelete?.saleNumber}</strong>? 
              This will refund {formatUGX(saleToDelete?.grandTotal ?? 0)} and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSale}>
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
