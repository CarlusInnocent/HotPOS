import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconPackage,
  IconHash,
  IconBuildingStore,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useBranch } from "@/context/branch-context"
import { stockApi, type StockItem } from "@/lib/api"

// Format currency in UGX
const formatUGX = (amount: number) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Calculate stock level status
const getStockStatus = (quantity: number, reorderLevel: number) => {
  const percentage = reorderLevel > 0 ? (quantity / reorderLevel) * 100 : 100
  if (percentage <= 25) return { label: "Critical", variant: "destructive" as const, color: "bg-red-500" }
  if (percentage <= 50) return { label: "Low", variant: "secondary" as const, color: "bg-orange-500" }
  if (percentage <= 100) return { label: "Warning", variant: "outline" as const, color: "bg-yellow-500" }
  return { label: "OK", variant: "default" as const, color: "bg-green-500" }
}

// Column definitions
const columns: ColumnDef<StockItem>[] = [
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <IconPackage className="size-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{row.original.productName}</p>
          <p className="text-xs text-muted-foreground">
            <IconHash className="inline size-3" />
            {row.original.productSku}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "branchName",
    header: "Branch",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm">
        <IconBuildingStore className="size-4 text-muted-foreground" />
        {row.original.branchName}
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Stock Level",
    cell: ({ row }) => {
      const { quantity, reorderLevel } = row.original
      const percentage = reorderLevel > 0 
        ? Math.min((quantity / reorderLevel) * 100, 100) 
        : 100

      return (
        <div className="space-y-1 min-w-32">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{quantity} units</span>
            <span className="text-muted-foreground">/ {reorderLevel}</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const { quantity, reorderLevel } = row.original
      const status = getStockStatus(quantity, reorderLevel)
      
      return (
        <Badge variant={status.variant} className="gap-1">
          {status.label === "Critical" && (
            <IconAlertTriangle className="size-3" />
          )}
          {status.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "sellingPrice",
    header: () => <div className="text-right">Value</div>,
    cell: ({ row }) => {
      const value = row.original.quantity * row.original.costPrice
      return (
        <div className="text-right">
          <p className="font-medium">{formatUGX(value)}</p>
          <p className="text-xs text-muted-foreground">
            Cost: {formatUGX(row.original.costPrice)}
          </p>
        </div>
      )
    },
  },
]

export function LowStockTable() {
  const { selectedBranch, isCompanyView, branches } = useBranch()
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "quantity", desc: false } // Sort by quantity ascending (lowest first)
  ])

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        if (isCompanyView && branches.length > 0) {
          // Fetch low stock from all branches
          const allItems: StockItem[] = []
          for (const branch of branches) {
            try {
              const data = await stockApi.getLowStock(branch.id)
              allItems.push(...data)
            } catch (err) {
              console.error(`Failed to fetch low stock for branch ${branch.id}:`, err)
            }
          }
          // Sort by quantity (lowest first)
          allItems.sort((a, b) => a.quantity - b.quantity)
          setLowStockItems(allItems.slice(0, 20)) // Top 20 critical items
        } else if (selectedBranch?.id) {
          const data = await stockApi.getLowStock(selectedBranch.id)
          // Sort by quantity (lowest first)
          const sorted = [...data].sort((a, b) => a.quantity - b.quantity)
          setLowStockItems(sorted.slice(0, 20))
        }
      } catch (err) {
        console.error("Failed to fetch low stock items:", err)
        setError("Failed to load low stock items")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLowStock()
  }, [selectedBranch?.id, isCompanyView, branches])

  const table = useReactTable({
    data: lowStockItems,
    columns,
    state: {
      sorting,
    },
    getRowId: (row) => `${row.branchId}-${row.productId}`,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <Card className="mx-4 lg:mx-6 animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-orange-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-green-500" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription>
            Items that need restocking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <IconPackage className="size-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              All products are well stocked!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = lowStockItems.filter(
    (item) => getStockStatus(item.quantity, item.reorderLevel).label === "Critical"
  ).length

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconAlertTriangle className="size-5 text-orange-500" />
              Low Stock Alerts
              {criticalCount > 0 && (
                <Badge variant="destructive">{criticalCount} Critical</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isCompanyView
                ? "Items below reorder level across all branches"
                : `Items below reorder level at ${selectedBranch?.name}`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Create Purchase Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      getStockStatus(
                        row.original.quantity,
                        row.original.reorderLevel
                      ).label === "Critical"
                        ? "bg-destructive/5"
                        : ""
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No low stock items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary footer */}
        <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
          <span>
            Showing {lowStockItems.length} items below reorder level
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
