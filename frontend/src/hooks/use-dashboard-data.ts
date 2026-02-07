import { useState, useEffect, useCallback } from 'react'
import { 
  dashboardApi, 
  salesApi,
  stockApi,
  branchApi,
  type DashboardStats, 
  type Sale,
  type StockItem,
  type Branch,
} from '@/lib/api'

export function useDashboardStats(branchId?: number) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await dashboardApi.getStats(branchId)
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
      setError('Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}

export function useSales(branchId: number) {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSales = useCallback(async () => {
    if (!branchId) return
    
    try {
      setIsLoading(true)
      setError(null)
      const data = await salesApi.getByBranch(branchId)
      setSales(data)
    } catch (err) {
      console.error('Failed to fetch sales:', err)
      setError('Failed to load sales')
    } finally {
      setIsLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return { sales, isLoading, error, refetch: fetchSales }
}

export function useLowStock(branchId: number) {
  const [items, setItems] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLowStock = useCallback(async () => {
    if (!branchId) return
    
    try {
      setIsLoading(true)
      setError(null)
      const data = await stockApi.getLowStock(branchId)
      setItems(data)
    } catch (err) {
      console.error('Failed to fetch low stock items:', err)
      setError('Failed to load low stock items')
    } finally {
      setIsLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchLowStock()
  }, [fetchLowStock])

  return { items, isLoading, error, refetch: fetchLowStock }
}

// Branch colors for multi-branch charts
export const BRANCH_COLORS = [
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
]

export interface MultiBranchChartRow {
  date: string
  [branchName: string]: number | string // branch name keys → sales values
}

export interface MultiBranchChartResult {
  chartData: MultiBranchChartRow[]
  branchNames: string[]
  branchColors: Record<string, string>
  isLoading: boolean
}

// Real sales chart data — fetches actual sales per branch and aggregates by day
export function useSalesChartData(
  branchId: number | undefined,
  days: number = 30,
  branches: Branch[] = [],
): MultiBranchChartResult {
  const [chartData, setChartData] = useState<MultiBranchChartRow[]>([])
  const [branchNames, setBranchNames] = useState<string[]>([])
  const [branchColors, setBranchColors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        const today = new Date()
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - (days - 1))
        const startStr = startDate.toLocaleDateString('en-CA')
        const endStr = today.toLocaleDateString('en-CA')

        // Generate date range
        const dates: string[] = []
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + i)
          dates.push(d.toLocaleDateString('en-CA'))
        }

        const isCompanyView = !branchId
        let branchesToFetch: Branch[] = []

        if (isCompanyView && branches.length > 0) {
          branchesToFetch = branches
        } else if (branchId) {
          // Single branch — find it or create a placeholder
          const found = branches.find(b => b.id === branchId)
          branchesToFetch = found ? [found] : [{ id: branchId, name: 'Branch', code: '', isActive: true }]
        }

        if (branchesToFetch.length === 0) {
          // Fallback: try to load branches
          try {
            const allBranches = await branchApi.getAll()
            branchesToFetch = branchId
              ? allBranches.filter(b => b.id === branchId)
              : allBranches
          } catch {
            branchesToFetch = []
          }
        }

        // Fetch sales for each branch in parallel
        const salesByBranch = await Promise.all(
          branchesToFetch.map(async (branch) => {
            try {
              const sales = await salesApi.getByDateRange(branch.id, startStr, endStr)
              return { branch, sales }
            } catch {
              return { branch, sales: [] as Sale[] }
            }
          })
        )

        // Build branch names and colors
        const names = salesByBranch.map(b => b.branch.name)
        const colors: Record<string, string> = {}
        names.forEach((name, idx) => {
          colors[name] = BRANCH_COLORS[idx % BRANCH_COLORS.length]
        })

        // Build chart rows: one row per date, with a column per branch
        const rows: MultiBranchChartRow[] = dates.map(date => {
          const row: MultiBranchChartRow = { date }
          for (const { branch, sales } of salesByBranch) {
            const dayTotal = sales
              .filter(s => s.saleDate.startsWith(date))
              .reduce((sum, s) => sum + s.grandTotal, 0)
            row[branch.name] = dayTotal
          }
          return row
        })

        setChartData(rows)
        setBranchNames(names)
        setBranchColors(colors)
      } catch (err) {
        console.error('Failed to fetch chart data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [branchId, days, branches])

  return { chartData, branchNames, branchColors, isLoading }
}
