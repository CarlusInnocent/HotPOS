import { useEffect, useState } from "react"
import {
  IconCurrencyDollar,
  IconReceipt,
  IconUser,
  IconCalendar,
  IconEye,
  IconCreditCard,
  IconCash,
  IconDeviceMobile,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useBranch } from "@/context/branch-context"
import { salesApi, type Sale } from "@/lib/api"

// Format currency in UGX
const formatUGX = (amount: number) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Payment method icon
const PaymentIcon = ({ method }: { method: string }) => {
  switch (method.toUpperCase()) {
    case "CASH":
      return <IconCash className="size-4" />
    case "CARD":
    case "CREDIT_CARD":
      return <IconCreditCard className="size-4" />
    case "MOBILE_MONEY":
    case "MOBILE":
      return <IconDeviceMobile className="size-4" />
    default:
      return <IconCurrencyDollar className="size-4" />
  }
}

// Sale details dialog
function SaleDetailsDialog({ sale }: { sale: Sale }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconEye className="size-4" />
          <span className="sr-only">View details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconReceipt className="size-5" />
            {sale.saleNumber}
          </DialogTitle>
          <DialogDescription>
            {formatDate(sale.saleDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Branch:</span>
              <p className="font-medium">{sale.branchName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cashier:</span>
              <p className="font-medium">{sale.userName}</p>
            </div>
            {sale.customerName && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">{sale.customerName}</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">Items</h4>
            <div className="space-y-2">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatUGX(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatUGX(sale.totalAmount)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatUGX(sale.discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatUGX(sale.grandTotal)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <PaymentIcon method={sale.paymentMethod} />
            <span>Paid via {sale.paymentMethod.replace("_", " ")}</span>
            <Badge
              variant={sale.paymentStatus === "COMPLETED" ? "default" : "secondary"}
            >
              {sale.paymentStatus}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Column definitions
const columns: ColumnDef<Sale>[] = [
  {
    accessorKey: "saleNumber",
    header: "Receipt",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <IconReceipt className="size-4 text-muted-foreground" />
        <span className="font-mono text-sm">{row.original.saleNumber}</span>
      </div>
    ),
  },
  {
    accessorKey: "saleDate",
    header: "Date",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm">
        <IconCalendar className="size-4 text-muted-foreground" />
        {formatDate(row.original.saleDate)}
      </div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <IconUser className="size-4 text-muted-foreground" />
        <span className="text-sm">
          {row.original.customerName || "Walk-in"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "grandTotal",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatUGX(row.original.grandTotal)}
      </div>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        <PaymentIcon method={row.original.paymentMethod} />
        {row.original.paymentMethod.replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.paymentStatus === "COMPLETED"
            ? "default"
            : row.original.paymentStatus === "PENDING"
            ? "secondary"
            : "destructive"
        }
      >
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <SaleDetailsDialog sale={row.original} />,
  },
]

export function RecentSalesTable() {
  const { selectedBranch, isCompanyView, branches } = useBranch()
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setIsLoading(true)
        setError(null)

        let allSales: Sale[] = []

        if (isCompanyView && branches.length > 0) {
          // Company view: fetch from all branches in parallel
          const results = await Promise.all(
            branches.map((branch) =>
              salesApi.getByBranch(branch.id).catch(() => [] as Sale[])
            )
          )
          allSales = results.flat()
        } else if (selectedBranch?.id) {
          allSales = await salesApi.getByBranch(selectedBranch.id)
        }

        // Sort by date descending and take recent ones
        const sortedSales = allSales.sort(
          (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
        )
        setSales(sortedSales.slice(0, 50))
      } catch (err) {
        console.error("Failed to fetch sales:", err)
        setError("Failed to load recent sales")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSales()
  }, [selectedBranch?.id, isCompanyView, branches])

  const table = useReactTable({
    data: sales,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
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
          <div className="h-[300px] bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconReceipt className="size-5" />
          Recent Sales
        </CardTitle>
        <CardDescription>
          {isCompanyView
            ? "Recent sales from all branches"
            : `Recent sales from ${selectedBranch?.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Input
            placeholder="Search by receipt number..."
            value={
              (table.getColumn("saleNumber")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("saleNumber")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) =>
              setPagination((prev) => ({ ...prev, pageSize: parseInt(value) }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
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
                    data-state={row.getIsSelected() && "selected"}
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
                    No sales found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {sales.length} sales
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
