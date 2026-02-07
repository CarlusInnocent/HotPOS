import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBranch } from "@/context/branch-context"
import { dashboardApi, type DashboardStats } from "@/lib/api"

// Format currency in UGX
const formatUGX = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AdminSectionCards() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await dashboardApi.getStats(selectedBranch?.id)
        setStats(data)
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
        setError("Failed to load statistics")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [selectedBranch?.id])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded mt-2" />
            </CardHeader>
            <CardFooter>
              <div className="h-4 w-full bg-muted rounded" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="p-6 text-center text-muted-foreground">
          {error || "No data available"}
        </Card>
      </div>
    )
  }

  // Calculate monthly growth percentage
  const monthlyGrowth = stats.totalSalesThisMonth > 0 && stats.totalSalesThisYear > 0
    ? ((stats.totalSalesThisMonth / (stats.totalSalesThisYear / 12)) - 1) * 100
    : 0

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            {isCompanyView ? "Total Sales Today" : "Branch Sales Today"}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatUGX(stats.totalSalesToday)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Today
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.transactionCountToday} transactions today
          </div>
          <div className="text-muted-foreground">
            {isCompanyView ? "All branches combined" : `${selectedBranch?.name} only`}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Sales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatUGX(stats.totalSalesThisMonth)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {monthlyGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {monthlyGrowth >= 0 ? "+" : ""}{monthlyGrowth.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.transactionCountThisMonth.toLocaleString()} transactions
            {monthlyGrowth >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            This month total
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg. Transaction</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatUGX(stats.averageTransactionValue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Avg
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Per transaction value
          </div>
          <div className="text-muted-foreground">
            Based on this month's data
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Net Profit</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatUGX(stats.netProfitThisMonth)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.netProfitThisMonth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              This Month
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.netProfitThisMonth >= 0 ? "Profitable" : "Loss"}
            {stats.netProfitThisMonth >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            After {formatUGX(stats.totalExpensesThisMonth)} expenses
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
