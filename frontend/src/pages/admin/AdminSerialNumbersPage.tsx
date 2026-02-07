import { useEffect, useState, useMemo } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  IconBarcode,
  IconSearch,
  IconFilter,
  IconEye,
  IconEdit,
  IconPackage,
  IconShoppingCart,
  IconTransfer,
  IconArrowBack,
  IconAlertTriangle,
  IconDeviceMobile,
  IconChartPie,
  IconBuildingStore,
} from "@tabler/icons-react"
import { BranchProvider, useBranch } from "@/context/branch-context"
import { serialApi, type SerialNumber } from "@/lib/api"
import { toast } from "sonner"

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline"; bgClass: string }> = {
  IN_STOCK: { label: "In Stock", color: "bg-green-100 text-green-800 border-green-300", variant: "outline", bgClass: "bg-green-500" },
  SOLD: { label: "Sold", color: "bg-blue-100 text-blue-800 border-blue-300", variant: "outline", bgClass: "bg-blue-500" },
  TRANSFERRED: { label: "Transferred", color: "bg-purple-100 text-purple-800 border-purple-300", variant: "outline", bgClass: "bg-purple-500" },
  RETURNED: { label: "Returned", color: "bg-yellow-100 text-yellow-800 border-yellow-300", variant: "outline", bgClass: "bg-amber-500" },
  DEFECTIVE: { label: "Defective", color: "bg-red-100 text-red-800 border-red-300", variant: "destructive", bgClass: "bg-red-500" },
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function AdminSerialNumbersPageContent() {
  const { selectedBranch, branches, isCompanyView } = useBranch()
  const [serials, setSerials] = useState<SerialNumber[]>([])
  const [stats, setStats] = useState<{ total: number; inStock: number; sold: number; transferred: number; returned: number; defective: number }>({ total: 0, inStock: 0, sold: 0, transferred: 0, returned: 0, defective: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Detail dialog
  const [selectedSerial, setSelectedSerial] = useState<SerialNumber | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Status update dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Lookup dialog
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [lookupQuery, setLookupQuery] = useState("")
  const [lookupResult, setLookupResult] = useState<SerialNumber | null>(null)
  const [lookupError, setLookupError] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, branches])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isCompanyView) {
        // Aggregate across all branches
        const allResults = await Promise.all(
          branches.map(async (b) => {
            const [serialsData, statsData] = await Promise.all([
              serialApi.getAllByBranch(b.id),
              serialApi.getStats(b.id),
            ])
            return { serials: serialsData, stats: statsData }
          })
        )
        const allSerials = allResults.flatMap(r => r.serials)
        const aggStats = allResults.reduce((acc, r) => ({
          total: acc.total + r.stats.total,
          inStock: acc.inStock + r.stats.inStock,
          sold: acc.sold + r.stats.sold,
          transferred: acc.transferred + r.stats.transferred,
          returned: acc.returned + r.stats.returned,
          defective: acc.defective + r.stats.defective,
        }), { total: 0, inStock: 0, sold: 0, transferred: 0, returned: 0, defective: 0 })
        setSerials(allSerials)
        setStats(aggStats)
      } else if (selectedBranch) {
        const [serialsData, statsData] = await Promise.all([
          serialApi.getAllByBranch(selectedBranch.id),
          serialApi.getStats(selectedBranch.id),
        ])
        setSerials(serialsData)
        setStats(statsData)
      }
    } catch (error) {
      console.error("Failed to load serial data:", error)
      toast.error("Failed to load serial data")
    } finally {
      setLoading(false)
    }
  }

  // Group by product
  const productBreakdown = useMemo(() => {
    const grouped = new Map<string, { productName: string; sku: string; total: number; inStock: number; sold: number; transferred: number; returned: number; defective: number }>()
    serials.forEach(sn => {
      const key = `${sn.productId}`
      if (!grouped.has(key)) {
        grouped.set(key, { productName: sn.productName, sku: sn.productSku, total: 0, inStock: 0, sold: 0, transferred: 0, returned: 0, defective: 0 })
      }
      const entry = grouped.get(key)!
      entry.total++
      if (sn.status === "IN_STOCK") entry.inStock++
      else if (sn.status === "SOLD") entry.sold++
      else if (sn.status === "TRANSFERRED") entry.transferred++
      else if (sn.status === "RETURNED") entry.returned++
      else if (sn.status === "DEFECTIVE") entry.defective++
    })
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }, [serials])

  // Group by branch (for company-wide view)
  const branchBreakdown = useMemo(() => {
    if (!isCompanyView) return []
    const grouped = new Map<string, { branchName: string; total: number; inStock: number; sold: number }>()
    serials.forEach(sn => {
      const key = `${sn.branchId}`
      if (!grouped.has(key)) {
        grouped.set(key, { branchName: sn.branchName, total: 0, inStock: 0, sold: 0 })
      }
      const entry = grouped.get(key)!
      entry.total++
      if (sn.status === "IN_STOCK") entry.inStock++
      else if (sn.status === "SOLD") entry.sold++
    })
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }, [serials, isCompanyView])

  const recentActivity = useMemo(() => {
    return [...serials]
      .filter(sn => sn.updatedAt)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
      .slice(0, 20)
  }, [serials])

  const filteredSerials = serials.filter(sn => {
    const matchesSearch =
      sn.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sn.saleNumber && sn.saleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sn.purchaseNumber && sn.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || sn.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleUpdateStatus = async () => {
    if (!editingSerial || !newStatus) return
    setIsUpdating(true)
    try {
      await serialApi.updateStatus(editingSerial.id, newStatus, statusNotes || undefined)
      toast.success(`Serial ${editingSerial.serialNumber} status updated`)
      setIsStatusDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("Failed to update status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return
    setIsLookingUp(true)
    setLookupResult(null)
    setLookupError("")
    try {
      const result = await serialApi.lookup(lookupQuery.trim())
      setLookupResult(result)
    } catch {
      setLookupError("Serial number not found in any branch.")
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <IconDeviceMobile className="size-7" />
                  Serialized Products
                  {selectedBranch && (
                    <Badge variant="outline" className="ml-2 font-normal">
                      <IconBuildingStore className="size-3 mr-1" />
                      {selectedBranch.name}
                    </Badge>
                  )}
                  {isCompanyView && (
                    <Badge variant="secondary" className="ml-2 font-normal">All Branches</Badge>
                  )}
                </h1>
                <p className="text-muted-foreground">
                  Analytics & management for all serialized inventory across your business
                </p>
              </div>
              <Button onClick={() => { setIsLookupOpen(true); setLookupQuery(""); setLookupResult(null); setLookupError(""); }}>
                <IconSearch className="size-4 mr-2" />
                Lookup Serial
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <Card>
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs">Total Units</CardDescription>
                      <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <IconPackage className="size-3" /> In Stock
                      </CardDescription>
                      <CardTitle className="text-2xl text-green-700 dark:text-green-400">{stats.inStock}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <IconShoppingCart className="size-3" /> Sold
                      </CardDescription>
                      <CardTitle className="text-2xl text-blue-700 dark:text-blue-400">{stats.sold}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/30">
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <IconTransfer className="size-3" /> Transferred
                      </CardDescription>
                      <CardTitle className="text-2xl text-purple-700 dark:text-purple-400">{stats.transferred}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30">
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <IconArrowBack className="size-3" /> Returned
                      </CardDescription>
                      <CardTitle className="text-2xl text-yellow-700 dark:text-yellow-400">{stats.returned}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
                    <CardHeader className="pb-1 pt-3 px-4">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <IconAlertTriangle className="size-3" /> Defective
                      </CardDescription>
                      <CardTitle className="text-2xl text-red-700 dark:text-red-400">{stats.defective}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Distribution + Product + Branch Breakdown */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconChartPie className="size-5" />
                        Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stats.total === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No serialized products</p>
                      ) : (
                        <>
                          {[
                            { key: "IN_STOCK", value: stats.inStock },
                            { key: "SOLD", value: stats.sold },
                            { key: "TRANSFERRED", value: stats.transferred },
                            { key: "RETURNED", value: stats.returned },
                            { key: "DEFECTIVE", value: stats.defective },
                          ].filter(s => s.value > 0).map(s => {
                            const pct = Math.round((s.value / stats.total) * 100)
                            const cfg = STATUS_CONFIG[s.key]
                            return (
                              <div key={s.key} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{cfg.label}</span>
                                  <span className="text-muted-foreground">{s.value} ({pct}%)</span>
                                </div>
                                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`absolute left-0 top-0 h-full rounded-full ${cfg.bgClass}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Branch Breakdown (company-wide) OR Product Breakdown */}
                  {isCompanyView && branchBreakdown.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <IconBuildingStore className="size-5" />
                          By Branch
                        </CardTitle>
                        <CardDescription>Serial units per branch</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-[320px] overflow-auto">
                          {branchBreakdown.map((b, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                              <div>
                                <p className="font-medium text-sm">{b.branchName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  {b.inStock} in stock
                                </Badge>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  {b.sold} sold
                                </Badge>
                                <Badge variant="secondary" className="text-xs font-bold">
                                  {b.total}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <IconBarcode className="size-5" />
                          By Product
                        </CardTitle>
                        <CardDescription>Serial number count per product</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {productBreakdown.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">No serialized products</p>
                        ) : (
                          <div className="space-y-3 max-h-[320px] overflow-auto">
                            {productBreakdown.map((p, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                <div>
                                  <p className="font-medium text-sm">{p.productName}</p>
                                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {p.inStock} in stock
                                  </Badge>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                    {p.sold} sold
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs font-bold">
                                    {p.total}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Product breakdown (show when company-wide, since branch breakdown takes the right slot) */}
                {isCompanyView && productBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconBarcode className="size-5" />
                        By Product (All Branches)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {productBreakdown.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{p.productName}</p>
                              <p className="text-xs text-muted-foreground">{p.sku}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="secondary" className="text-xs font-bold">{p.total} total</Badge>
                              <div className="flex gap-1">
                                <span className="text-xs text-green-600">{p.inStock} stock</span>
                                <span className="text-xs text-blue-600">{p.sold} sold</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest serial number updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No recent activity</p>
                    ) : (
                      <div className="rounded-md border overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial Number</TableHead>
                              <TableHead>Product</TableHead>
                              {isCompanyView && <TableHead>Branch</TableHead>}
                              <TableHead>Status</TableHead>
                              <TableHead>Sale #</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="w-[80px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentActivity.map(sn => (
                              <TableRow key={sn.id}>
                                <TableCell className="font-mono font-semibold text-sm">{sn.serialNumber}</TableCell>
                                <TableCell>
                                  <span className="font-medium text-sm">{sn.productName}</span>
                                  <span className="text-xs text-muted-foreground ml-1.5">({sn.productSku})</span>
                                </TableCell>
                                {isCompanyView && (
                                  <TableCell className="text-sm">{sn.branchName}</TableCell>
                                )}
                                <TableCell>
                                  <Badge className={STATUS_CONFIG[sn.status]?.color || ""} variant={STATUS_CONFIG[sn.status]?.variant || "outline"}>
                                    {STATUS_CONFIG[sn.status]?.label || sn.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{sn.saleNumber || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{formatDate(sn.updatedAt)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedSerial(sn); setIsDetailOpen(true) }}>
                                      <IconEye className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditingSerial(sn); setNewStatus(sn.status); setStatusNotes(""); setIsStatusDialogOpen(true) }}>
                                      <IconEdit className="size-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Full Table with Search */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Serial Numbers ({filteredSerials.length})</CardTitle>
                    <CardDescription>Search, filter and manage all serialized products</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by serial, product, SKU, sale #, purchase #..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <IconFilter className="size-4 mr-2" />
                          <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="IN_STOCK">In Stock</SelectItem>
                          <SelectItem value="SOLD">Sold</SelectItem>
                          <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                          <SelectItem value="RETURNED">Returned</SelectItem>
                          <SelectItem value="DEFECTIVE">Defective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {filteredSerials.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {searchTerm || statusFilter !== "all" ? "No serial numbers match your filter." : "No serialized products found."}
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-auto max-h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial Number</TableHead>
                              <TableHead>Product</TableHead>
                              {isCompanyView && <TableHead>Branch</TableHead>}
                              <TableHead>Status</TableHead>
                              <TableHead>Purchase #</TableHead>
                              <TableHead>Sale #</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="w-[80px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSerials.map(sn => (
                              <TableRow key={sn.id}>
                                <TableCell className="font-mono font-semibold text-sm">{sn.serialNumber}</TableCell>
                                <TableCell>
                                  <span className="font-medium text-sm">{sn.productName}</span>
                                  <span className="text-xs text-muted-foreground ml-1.5">({sn.productSku})</span>
                                </TableCell>
                                {isCompanyView && (
                                  <TableCell className="text-sm">{sn.branchName}</TableCell>
                                )}
                                <TableCell>
                                  <Badge className={STATUS_CONFIG[sn.status]?.color || ""} variant={STATUS_CONFIG[sn.status]?.variant || "outline"}>
                                    {STATUS_CONFIG[sn.status]?.label || sn.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{sn.purchaseNumber || "—"}</TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{sn.saleNumber || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{formatDate(sn.updatedAt)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedSerial(sn); setIsDetailOpen(true) }}>
                                      <IconEye className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditingSerial(sn); setNewStatus(sn.status); setStatusNotes(""); setIsStatusDialogOpen(true) }}>
                                      <IconEdit className="size-4" />
                                    </Button>
                                  </div>
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

      {/* Serial Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBarcode className="size-5" />
              Serial Number Details
            </DialogTitle>
          </DialogHeader>
          {selectedSerial && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                <p className="text-2xl font-mono font-bold tracking-wider">{selectedSerial.serialNumber}</p>
                <Badge className={`mt-2 ${STATUS_CONFIG[selectedSerial.status]?.color || ""}`} variant={STATUS_CONFIG[selectedSerial.status]?.variant || "outline"}>
                  {STATUS_CONFIG[selectedSerial.status]?.label || selectedSerial.status}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Product</p>
                  <p className="font-medium">{selectedSerial.productName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">SKU</p>
                  <p className="font-mono">{selectedSerial.productSku}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Branch</p>
                  <p className="font-medium">{selectedSerial.branchName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <p className="font-medium">{STATUS_CONFIG[selectedSerial.status]?.label}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">History</h4>
                {selectedSerial.purchaseNumber && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                    <IconPackage className="size-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Purchased</p>
                      <p className="text-xs text-muted-foreground">Purchase #{selectedSerial.purchaseNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedSerial.createdAt)}</p>
                    </div>
                  </div>
                )}
                {selectedSerial.saleNumber && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                    <IconShoppingCart className="size-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Sold</p>
                      <p className="text-xs text-muted-foreground">Sale #{selectedSerial.saleNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedSerial.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {selectedSerial.notes && (
                  <div className="p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedSerial.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          {editingSerial && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-mono font-bold">{editingSerial.serialNumber}</p>
                <p className="text-sm text-muted-foreground">{editingSerial.productName}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Reason for status change..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lookup Dialog */}
      <Dialog open={isLookupOpen} onOpenChange={setIsLookupOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSearch className="size-5" />
              Serial Number Lookup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter serial number (e.g. IMEI)..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <Button onClick={handleLookup} disabled={isLookingUp || !lookupQuery.trim()}>
                {isLookingUp ? "..." : "Search"}
              </Button>
            </div>
            {lookupError && (
              <div className="text-center py-4">
                <IconAlertTriangle className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{lookupError}</p>
              </div>
            )}
            {lookupResult && (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="text-center">
                  <p className="font-mono font-bold text-lg">{lookupResult.serialNumber}</p>
                  <Badge className={`mt-1 ${STATUS_CONFIG[lookupResult.status]?.color || ""}`} variant={STATUS_CONFIG[lookupResult.status]?.variant || "outline"}>
                    {STATUS_CONFIG[lookupResult.status]?.label || lookupResult.status}
                  </Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{lookupResult.productName}</span></div>
                  <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{lookupResult.productSku}</span></div>
                  <div><span className="text-muted-foreground">Branch:</span> <span className="font-medium">{lookupResult.branchName}</span></div>
                  {lookupResult.saleNumber && <div><span className="text-muted-foreground">Sale #:</span> <span className="font-mono">{lookupResult.saleNumber}</span></div>}
                  {lookupResult.purchaseNumber && <div><span className="text-muted-foreground">Purchase #:</span> <span className="font-mono">{lookupResult.purchaseNumber}</span></div>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLookupOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export function AdminSerialNumbersPage() {
  return (
    <BranchProvider>
      <AdminSerialNumbersPageContent />
    </BranchProvider>
  )
}
