"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useSalesChartData } from "@/hooks/use-dashboard-data"
import { useBranch } from "@/context/branch-context"
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart showing sales data per branch"

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

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { selectedBranch, isCompanyView, branches } = useBranch()
  const [timeRange, setTimeRange] = React.useState("30d")
  
  const days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7
  const { chartData, branchNames, branchColors, isLoading } = useSalesChartData(
    selectedBranch?.id,
    days,
    branches,
  )

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Build dynamic chart config from branch names
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    branchNames.forEach((name) => {
      config[name] = {
        label: name,
        color: branchColors[name] || "var(--primary)",
      }
    })
    return config
  }, [branchNames, branchColors])

  if (isLoading) {
    return (
      <Card className="@container/card animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {isCompanyView
              ? "Daily sales per branch for the selected period"
              : `Daily sales for ${selectedBranch?.name}`}
          </span>
          <span className="@[540px]/card:hidden">Sales trend</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              {branchNames.map((name) => (
                <linearGradient key={name} id={`fill-${name.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={branchColors[name]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={branchColors[name]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatUGXCompact(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  formatter={(value, name) => {
                    return [`UGX ${Number(value).toLocaleString()}`, name]
                  }}
                  indicator="dot"
                />
              }
            />
            {branchNames.map((name) => (
              <Area
                key={name}
                dataKey={name}
                type="monotone"
                fill={`url(#fill-${name.replace(/\s+/g, '-')})`}
                stroke={branchColors[name]}
                strokeWidth={2}
              />
            ))}
            {branchNames.length > 1 && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span style={{ color: branchColors[value] || '#888', fontSize: '12px' }}>
                    {value}
                  </span>
                )}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
