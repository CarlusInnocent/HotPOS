import { useEffect, useState } from "react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useBranch } from "@/context/branch-context"
import { dashboardApi, type DashboardStats, type Branch } from "@/lib/api"

// Format currency in UGX (compact)
const formatUGXCompact = (amount: number) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toString()
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)",
  },
  target: {
    label: "Target",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

interface BranchStats {
  branch: Branch
  stats: DashboardStats
}

export function BranchComparison() {
  const { isCompanyView, branches } = useBranch()
  const [branchStats, setBranchStats] = useState<BranchStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAllBranchStats = async () => {
      if (!isCompanyView || branches.length === 0) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const statsPromises = branches.map(async (branch) => {
          const stats = await dashboardApi.getStats(branch.id)
          return { branch, stats }
        })
        const results = await Promise.all(statsPromises)
        setBranchStats(results)
      } catch (err) {
        console.error("Failed to fetch branch stats:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllBranchStats()
  }, [isCompanyView, branches])

  // Only show branch comparison in company-wide view
  if (!isCompanyView) {
    return null
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2 animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare chart data
  const chartData = branchStats.map(({ branch, stats }) => ({
    branch: branch.name.split(' ')[0], // Short name for chart
    revenue: stats.totalSalesThisMonth,
    target: stats.totalSalesThisMonth * 1.2, // Placeholder target
  }))

  // Sort by revenue for top/low performers
  const sortedByRevenue = [...branchStats].sort(
    (a, b) => b.stats.totalSalesThisMonth - a.stats.totalSalesThisMonth
  )

  const topPerformers = sortedByRevenue.slice(0, 3).map(({ branch, stats }) => ({
    branch: branch.name,
    metric: "Revenue",
    value: stats.totalSalesThisMonth,
    change: stats.totalSalesThisMonth > 0 ? 
      ((stats.totalSalesThisMonth / (stats.totalSalesThisYear / 12)) - 1) * 100 : 0
  }))

  const lowPerformers = sortedByRevenue.slice(-3).reverse().map(({ branch, stats }) => ({
    branch: branch.name,
    metric: "Revenue",
    value: stats.totalSalesThisMonth,
    change: stats.totalSalesThisMonth > 0 ? 
      ((stats.totalSalesThisMonth / (stats.totalSalesThisYear / 12)) - 1) * 100 : 0
  }))

  return (
    <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Branch Revenue Comparison Chart */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Branch Revenue Comparison</CardTitle>
          <CardDescription>
            Monthly revenue performance across all branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => formatUGXCompact(value)}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="branch" 
                    width={80}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`UGX ${Number(value).toLocaleString()}`, ""]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="var(--primary)" 
                    radius={[0, 4, 4, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No branch data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top & Low Performers */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IconTrendingUp className="size-4 text-green-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPerformers.length > 0 ? topPerformers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{item.branch}</p>
                  <p className="text-muted-foreground text-xs">{item.metric}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    UGX {formatUGXCompact(item.value)}
                  </p>
                  <p className={item.change >= 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                    {item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IconTrendingDown className="size-4 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowPerformers.length > 0 ? lowPerformers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{item.branch}</p>
                  <p className="text-muted-foreground text-xs">{item.metric}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    UGX {formatUGXCompact(item.value)}
                  </p>
                  <p className={item.change >= 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                    {item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
