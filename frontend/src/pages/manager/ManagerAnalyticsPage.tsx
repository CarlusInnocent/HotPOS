import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  IconTrendingUp,
  IconTrendingDown,
  IconShoppingCart,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconChartPie
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { salesApi, dashboardApi, type Sale, type DashboardStats } from "@/lib/api"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart, ResponsiveContainer } from "recharts"

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export function ManagerAnalyticsPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
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
      const [salesData, statsData] = await Promise.all([
        salesApi.getByBranch(user.branchId),
        dashboardApi.getStats(user.branchId)
      ])
      setSales(salesData)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const today = new Date()
  const thisMonthSales = sales.filter(s => {
    const saleDate = new Date(s.saleDate)
    return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear()
  })

  // Sales by day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const salesByDay = dayNames.map(day => ({
    day,
    sales: thisMonthSales
      .filter(s => dayNames[new Date(s.saleDate).getDay()] === day)
      .reduce((acc, s) => acc + s.grandTotal, 0)
  }))

  // Sales by payment method
  const paymentMethods = [...new Set(sales.map(s => s.paymentMethod))]
  const salesByPayment = paymentMethods.map(method => ({
    name: method,
    value: sales.filter(s => s.paymentMethod === method).reduce((acc, s) => acc + s.grandTotal, 0)
  }))

  // Daily sales for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date
  })
  const dailySales = last7Days.map(date => ({
    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    total: sales
      .filter(s => new Date(s.saleDate).toDateString() === date.toDateString())
      .reduce((acc, s) => acc + s.grandTotal, 0)
  }))

  // Top selling products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  sales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
      }
      productSales[item.productId].quantity += item.quantity
      productSales[item.productId].revenue += item.totalPrice
    })
  })
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-muted-foreground">Business insights and performance metrics for your branch</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconCash className="size-4" />
                        Today's Sales (Net)
                      </CardDescription>
                      <CardTitle className="text-2xl">{formatUGX(stats?.totalSalesToday || 0)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{stats?.transactionCountToday || 0} transactions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconReceipt className="size-4" />
                        This Month (Net)
                      </CardDescription>
                      <CardTitle className="text-2xl">{formatUGX(stats?.totalSalesThisMonth || 0)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{stats?.transactionCountThisMonth || 0} transactions this month</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconShoppingCart className="size-4" />
                        Avg Transaction
                      </CardDescription>
                      <CardTitle className="text-2xl">{formatUGX(Math.round(stats?.averageTransactionValue || 0))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Based on {stats?.transactionCountThisMonth || 0} sales</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <IconReceipt className="size-4" />
                        Net Profit
                      </CardDescription>
                      <CardTitle className={`text-2xl ${(stats?.netProfitThisMonth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatUGX(stats?.netProfitThisMonth || 0)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-xs">
                        {(stats?.netProfitThisMonth || 0) >= 0 ? (
                          <IconTrendingUp className="size-3 text-green-500" />
                        ) : (
                          <IconTrendingDown className="size-3 text-red-500" />
                        )}
                        <span className={(stats?.netProfitThisMonth || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                          {(stats?.netProfitThisMonth || 0) >= 0 ? "Profitable" : "Loss"}
                        </span>
                        <span className="text-muted-foreground">after expenses & COGS</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Daily Sales Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconChartBar className="size-5" />
                        Sales Trend (Last 7 Days)
                      </CardTitle>
                      <CardDescription>Daily revenue over the past week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{}} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailySales}>
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="#8884d8" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Sales by Day of Week */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconChartBar className="size-5" />
                        Sales by Day of Week
                      </CardTitle>
                      <CardDescription>Performance by weekday this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{}} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesByDay}>
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="sales" fill="#8884d8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Payment Methods Pie */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconChartPie className="size-5" />
                        Sales by Payment Method
                      </CardTitle>
                      <CardDescription>Revenue breakdown by payment type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{}} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={salesByPayment}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {salesByPayment.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Top Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconTrendingUp className="size-5" />
                        Top Selling Products
                      </CardTitle>
                      <CardDescription>Best performers by revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topProducts.map((product, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="size-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                              </div>
                            </div>
                            <p className="font-medium">{formatUGX(product.revenue)}</p>
                          </div>
                        ))}
                        {topProducts.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">No sales data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
