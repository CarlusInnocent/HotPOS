import { useState, useEffect } from "react"
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
  IconReceipt,
  IconPackage,
  IconTruck,
  IconCash,
  IconDownload,
  IconCalendar,
  IconArrowLeft
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
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { salesApi, purchaseApi, stockApi, branchApi, type Sale, type Purchase, type StockItem } from "@/lib/api"

type ReportType = "sales" | "inventory" | "purchases" | "profit" | null

function ReportsContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [activeReport, setActiveReport] = useState<ReportType>(null)
  const [loading, setLoading] = useState(false)
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Report data
  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])

  const loadSalesReport = async () => {
    setLoading(true)
    try {
      if (isCompanyView) {
        const branchesData = await branchApi.getAll()
        const allSales = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => salesApi.getByDateRange(b.id, startDate, endDate).catch(() => [] as Sale[]))
        )
        setSales(allSales.flat())
      } else if (selectedBranch) {
        const data = await salesApi.getByDateRange(selectedBranch.id, startDate, endDate)
        setSales(data)
      }
    } catch (error) {
      console.error("Failed to load sales report:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPurchasesReport = async () => {
    setLoading(true)
    try {
      let data: Purchase[] = []
      if (isCompanyView) {
        const branchesData = await branchApi.getAll()
        const allPurchases = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => purchaseApi.getByBranch(b.id).catch(() => [] as Purchase[]))
        )
        data = allPurchases.flat()
      } else if (selectedBranch) {
        data = await purchaseApi.getByBranch(selectedBranch.id)
      }
      // Filter by date client-side
      const filtered = data.filter(p => {
        const date = new Date(p.purchaseDate)
        return date >= new Date(startDate) && date <= new Date(endDate)
      })
      setPurchases(filtered)
    } catch (error) {
      console.error("Failed to load purchases report:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryReport = async () => {
    setLoading(true)
    try {
      if (isCompanyView) {
        const branchesData = await branchApi.getAll()
        const allStock = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => stockApi.getByBranch(b.id).catch(() => [] as StockItem[]))
        )
        setStockItems(allStock.flat())
      } else if (selectedBranch) {
        const data = await stockApi.getByBranch(selectedBranch.id)
        setStockItems(data)
      }
    } catch (error) {
      console.error("Failed to load inventory report:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeReport === "sales") loadSalesReport()
    else if (activeReport === "purchases") loadPurchasesReport()
    else if (activeReport === "inventory") loadInventoryReport()
    else if (activeReport === "profit") {
      loadSalesReport()
      loadPurchasesReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, selectedBranch])

  const handleGenerateReport = () => {
    if (activeReport === "sales") loadSalesReport()
    else if (activeReport === "purchases") loadPurchasesReport()
    else if (activeReport === "inventory") loadInventoryReport()
    else if (activeReport === "profit") {
      loadSalesReport()
      loadPurchasesReport()
    }
  }

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate totals
  const totalSales = sales.reduce((acc, s) => acc + s.grandTotal, 0)
  const totalPurchases = purchases.reduce((acc, p) => acc + p.totalAmount, 0)
  const totalStockValue = stockItems.reduce((acc, s) => acc + (s.quantity * s.costPrice), 0)
  const grossProfit = totalSales - totalPurchases

  const reportCards = [
    {
      type: "sales" as ReportType,
      title: "Sales Report",
      description: "Daily, weekly, monthly sales summaries",
      icon: IconReceipt,
      color: "text-blue-500"
    },
    {
      type: "inventory" as ReportType,
      title: "Inventory Report",
      description: "Stock levels, valuations, and movements",
      icon: IconPackage,
      color: "text-green-500"
    },
    {
      type: "purchases" as ReportType,
      title: "Purchase Report",
      description: "Supplier purchases and costs",
      icon: IconTruck,
      color: "text-orange-500"
    },
    {
      type: "profit" as ReportType,
      title: "Profit & Loss",
      description: "Revenue, expenses, and profit analysis",
      icon: IconCash,
      color: "text-purple-500"
    }
  ]

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
              {!activeReport ? (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Reports</h1>
                    <p className="text-muted-foreground">Generate and view business reports</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {reportCards.map((report) => (
                      <Card 
                        key={report.type}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setActiveReport(report.type)}
                      >
                        <CardHeader>
                          <report.icon className={`size-8 ${report.color}`} />
                          <CardTitle className="mt-2">{report.title}</CardTitle>
                          <CardDescription>{report.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Report View */}
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setActiveReport(null)}>
                      <IconArrowLeft className="size-5" />
                    </Button>
                    <div>
                      <h1 className="text-2xl font-bold">
                        {reportCards.find(r => r.type === activeReport)?.title}
                      </h1>
                      <p className="text-muted-foreground">{selectedBranch?.name}</p>
                    </div>
                  </div>

                  {/* Date Filters */}
                  {activeReport !== "inventory" && (
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconCalendar className="size-4" />
                          Date Range
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>End Date</Label>
                            <Input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleGenerateReport}>
                            Generate Report
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {/* Sales Report */}
                      {activeReport === "sales" && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Sales Summary</CardTitle>
                                <CardDescription>{startDate} to {endDate}</CardDescription>
                              </div>
                              <Button variant="outline" onClick={() => exportToCSV(sales.map(s => ({
                                Receipt: s.saleNumber,
                                Date: s.saleDate,
                                Customer: s.customerName || 'Walk-in',
                                Subtotal: s.totalAmount,

                                Total: s.grandTotal,
                                Payment: s.paymentMethod
                              })), 'sales-report')}>
                                <IconDownload className="size-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 mb-6">
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Sales</p>
                                <p className="text-2xl font-bold">UGX {totalSales.toLocaleString()}</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Transactions</p>
                                <p className="text-2xl font-bold">{sales.length}</p>
                              </div>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Receipt / Ref</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Customer</TableHead>
                                  <TableHead>Payment</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sales.slice(0, 20).map((sale) => (
                                  <TableRow key={sale.id} className={
                                    sale.refundStatus === 'FULL'
                                      ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50'
                                      : sale.refundStatus === 'PARTIAL'
                                        ? 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50'
                                        : ''
                                  }>
                                    <TableCell className="font-medium leading-tight">
                                      <div>{sale.saleNumber}</div>
                                      {sale.referenceNumber && (
                                        <div className="text-xs text-muted-foreground">Ref: {sale.referenceNumber}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{sale.customerName || 'Walk-in'}</TableCell>
                                    <TableCell><Badge variant="outline">{sale.paymentMethod}</Badge></TableCell>
                                    <TableCell className="text-right">UGX {sale.grandTotal.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {sales.length > 20 && (
                              <p className="text-center text-muted-foreground mt-4">
                                Showing 20 of {sales.length} transactions
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Inventory Report */}
                      {activeReport === "inventory" && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Inventory Summary</CardTitle>
                                <CardDescription>Current stock levels</CardDescription>
                              </div>
                              <Button variant="outline" onClick={() => exportToCSV(stockItems.map(s => ({
                                Product: s.productName,
                                SKU: s.productSku,
                                Quantity: s.quantity,
                                CostPrice: s.costPrice,
                                SellingPrice: s.sellingPrice,
                                TotalValue: s.quantity * s.costPrice
                              })), 'inventory-report')}>
                                <IconDownload className="size-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-3 mb-6">
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Products</p>
                                <p className="text-2xl font-bold">{stockItems.length}</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                                <p className="text-2xl font-bold">UGX {totalStockValue.toLocaleString()}</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                                <p className="text-2xl font-bold">{stockItems.filter(s => s.quantity <= (s.reorderLevel || 10)).length}</p>
                              </div>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Cost Price</TableHead>
                                  <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stockItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">UGX {item.costPrice.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">UGX {(item.quantity * item.costPrice).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}

                      {/* Purchases Report */}
                      {activeReport === "purchases" && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Purchases Summary</CardTitle>
                                <CardDescription>{startDate} to {endDate}</CardDescription>
                              </div>
                              <Button variant="outline" onClick={() => exportToCSV(purchases.map(p => ({
                                PONumber: p.purchaseNumber,
                                Date: p.purchaseDate,
                                Supplier: p.supplierName,
                                Status: p.status,
                                Total: p.totalAmount
                              })), 'purchases-report')}>
                                <IconDownload className="size-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-3 mb-6">
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Purchases</p>
                                <p className="text-2xl font-bold">UGX {totalPurchases.toLocaleString()}</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Purchase Orders</p>
                                <p className="text-2xl font-bold">{purchases.length}</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{purchases.filter(p => p.status === 'PENDING').length}</p>
                              </div>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>PO #</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Supplier</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchases.map((purchase) => (
                                  <TableRow key={purchase.id}>
                                    <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                                    <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{purchase.supplierName}</TableCell>
                                    <TableCell><Badge variant="outline">{purchase.status}</Badge></TableCell>
                                    <TableCell className="text-right">UGX {purchase.totalAmount.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}

                      {/* Profit & Loss Report */}
                      {activeReport === "profit" && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Profit & Loss Statement</CardTitle>
                                <CardDescription>{startDate} to {endDate}</CardDescription>
                              </div>
                              <Button variant="outline" onClick={() => exportToCSV([{
                                Period: `${startDate} to ${endDate}`,
                                TotalRevenue: totalSales,
                                TotalPurchases: totalPurchases,
                                GrossProfit: grossProfit
                              }], 'profit-loss-report')}>
                                <IconDownload className="size-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold text-lg mb-4">Revenue</h3>
                                <div className="flex justify-between py-2 border-b">
                                  <span>Total Sales</span>
                                  <span className="font-medium">UGX {totalSales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-2 text-muted-foreground">
                                  <span className="pl-4">Number of Transactions</span>
                                  <span>{sales.length}</span>
                                </div>
                              </div>

                              <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold text-lg mb-4">Cost of Goods Sold</h3>
                                <div className="flex justify-between py-2 border-b">
                                  <span>Total Purchases</span>
                                  <span className="font-medium text-red-500">UGX {totalPurchases.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-2 text-muted-foreground">
                                  <span className="pl-4">Number of Purchase Orders</span>
                                  <span>{purchases.length}</span>
                                </div>
                              </div>

                              <div className="p-4 border-2 rounded-lg bg-muted">
                                <div className="flex justify-between py-2">
                                  <span className="font-semibold text-lg">Gross Profit</span>
                                  <span className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    UGX {grossProfit.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 text-muted-foreground">
                                  <span>Profit Margin</span>
                                  <span>{totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0}%</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function ReportsPage() {
  return (
    <BranchProvider>
      <ReportsContent />
    </BranchProvider>
  )
}
