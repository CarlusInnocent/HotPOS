import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
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
  IconCash,
  IconReceipt,
  IconTrendingUp,
  IconTrendingDown,
  IconShoppingCart,
  IconAlertTriangle,
  IconReceipt2,
  IconBarcode,
} from "@tabler/icons-react"
import { useAuth } from "@/context/auth-context"
import { salesApi, expenseApi, stockApi, serialApi, type Sale, type Expense, type StockItem } from "@/lib/api"
import { toast } from "sonner"

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export function DashboardPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [lowStock, setLowStock] = useState<StockItem[]>([])
  const [serialStats, setSerialStats] = useState<{ total: number; inStock: number; sold: number; transferred: number; returned: number; defective: number }>({ total: 0, inStock: 0, sold: 0, transferred: 0, returned: 0, defective: 0 })
  const [loading, setLoading] = useState(true)

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
      const today = new Date().toLocaleDateString("en-CA")
      const firstOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toLocaleDateString("en-CA")

      const [salesData, expenseData, lowStockData, serialStatsData] = await Promise.all([
        salesApi.getByDateRange(user.branchId, firstOfMonth, today),
        expenseApi.getByBranch(user.branchId),
        stockApi.getLowStock(user.branchId),
        serialApi.getStats(user.branchId),
      ])
      setSales(salesData)
      setExpenses(expenseData)
      setLowStock(lowStockData)
      setSerialStats(serialStatsData)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  // Calculate KPIs
  const today = new Date()
  const todaySales = sales.filter(
    (s) => new Date(s.saleDate).toDateString() === today.toDateString()
  )
  const totalToday = todaySales.reduce((sum, s) => sum + s.grandTotal, 0)
  const totalThisMonth = sales.reduce((sum, s) => sum + s.grandTotal, 0)

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.expenseDate)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

  const profit = totalThisMonth - totalExpenses

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Manager Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.fullName}. Here's how your branch is doing.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconCash className="size-4" />
                        Today's Sales
                      </CardDescription>
                      <CardTitle className="text-2xl">
                        {formatUGX(totalToday)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {todaySales.length} transactions today
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconReceipt className="size-4" />
                        This Month's Revenue
                      </CardDescription>
                      <CardTitle className="text-2xl">
                        {formatUGX(totalThisMonth)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {sales.length} total transactions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconReceipt2 className="size-4" />
                        This Month's Expenses
                      </CardDescription>
                      <CardTitle className="text-2xl">
                        {formatUGX(totalExpenses)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {thisMonthExpenses.length} expense records
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        {profit >= 0 ? (
                          <IconTrendingUp className="size-4 text-green-500" />
                        ) : (
                          <IconTrendingDown className="size-4 text-red-500" />
                        )}
                        Net Profit (This Month)
                      </CardDescription>
                      <CardTitle
                        className={`text-2xl ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatUGX(profit)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Revenue minus expenses
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconShoppingCart className="size-4" />
                        Avg Transaction Value
                      </CardDescription>
                      <CardTitle className="text-xl">
                        {formatUGX(
                          sales.length > 0
                            ? Math.round(totalThisMonth / sales.length)
                            : 0
                        )}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconAlertTriangle className="size-4 text-orange-500" />
                        Low Stock Items
                      </CardDescription>
                      <CardTitle
                        className={`text-xl ${lowStock.length > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {lowStock.length}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {lowStock.length === 0
                          ? "All items well stocked"
                          : "Items below reorder level"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconCash className="size-4" />
                        Today's Transactions
                      </CardDescription>
                      <CardTitle className="text-xl">
                        {todaySales.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconBarcode className="size-4 text-blue-600" />
                        Serialized Products
                      </CardDescription>
                      <CardTitle className="text-xl text-blue-700 dark:text-blue-400">
                        {serialStats.total}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-600 font-medium">{serialStats.inStock} in stock</span>
                        <span className="text-muted-foreground">{serialStats.sold} sold</span>
                        {serialStats.defective > 0 && (
                          <span className="text-red-500">{serialStats.defective} defective</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Low Stock Items Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconAlertTriangle className="size-5 text-orange-500" />
                      Low Stock Items
                    </CardTitle>
                    <CardDescription>
                      Products that are below their reorder level and need
                      restocking
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lowStock.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        All products are well stocked. No items below reorder
                        level.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">
                                In Stock
                              </TableHead>
                              <TableHead className="text-right">
                                Reorder Level
                              </TableHead>
                              <TableHead className="text-right">
                                Deficit
                              </TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lowStock
                              .sort(
                                (a, b) =>
                                  a.quantity -
                                  a.reorderLevel -
                                  (b.quantity - b.reorderLevel)
                              )
                              .map((item) => {
                                const deficit =
                                  item.reorderLevel - item.quantity
                                const isOutOfStock = item.quantity === 0
                                const isCritical =
                                  item.quantity <= item.reorderLevel * 0.25
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      {item.productName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-sm">
                                      {item.productSku}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      {item.reorderLevel}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-red-600">
                                      -{deficit}
                                    </TableCell>
                                    <TableCell>
                                      {isOutOfStock ? (
                                        <Badge variant="destructive">
                                          Out of Stock
                                        </Badge>
                                      ) : isCritical ? (
                                        <Badge
                                          variant="destructive"
                                          className="bg-orange-600"
                                        >
                                          Critical
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-yellow-700 border-yellow-300 bg-yellow-50"
                                        >
                                          Low
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Sales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconReceipt className="size-5" />
                      Recent Sales Today
                    </CardTitle>
                    <CardDescription>
                      Latest transactions from today
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todaySales.length === 0 ? (
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
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {todaySales.slice(0, 10).map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="font-mono text-sm">
                                  {sale.saleNumber}
                                </TableCell>
                                <TableCell>
                                  {new Date(sale.saleDate).toLocaleTimeString()}
                                </TableCell>
                                <TableCell>
                                  {sale.customerName || "Walk-in"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {sale.paymentMethod.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatUGX(sale.grandTotal)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
