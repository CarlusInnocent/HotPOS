import { useEffect, useState, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
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
import { Separator } from "@/components/ui/separator"
//import { Progress } from "@/components/ui/progress"
import {
  IconBarcode,
  IconSearch,
  IconFilter,
  IconEye,
  IconPackage,
  IconShoppingCart,
  IconTransfer,
  IconArrowBack,
  IconAlertTriangle,
  IconDeviceMobile,
  IconChartPie,
} from "@tabler/icons-react"
import { useAuth } from "@/context/auth-context"
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

export function CashierSerialAnalyticsPage() {
  const { user } = useAuth()
  const [serials, setSerials] = useState<SerialNumber[]>([])
  const [stats, setStats] = useState<{ total: number; inStock: number; sold: number; transferred: number; returned: number; defective: number }>({ total: 0, inStock: 0, sold: 0, transferred: 0, returned: 0, defective: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Detail dialog
  const [selectedSerial, setSelectedSerial] = useState<SerialNumber | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Lookup dialog
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [lookupQuery, setLookupQuery] = useState("")
  const [lookupResult, setLookupResult] = useState<SerialNumber | null>(null)
  const [lookupError, setLookupError] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)

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
      const [serialsData, statsData] = await Promise.all([
        serialApi.getAllByBranch(user.branchId),
        serialApi.getStats(user.branchId),
      ])
      setSerials(serialsData)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load serial data:", error)
      toast.error("Failed to load serial data")
    } finally {
      setLoading(false)
    }
  }

  // Group serials by product for analytics
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

  // Recent activity (last 20 updated serials)
  const recentActivity = useMemo(() => {
    return [...serials]
      .filter(sn => sn.updatedAt)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
      .slice(0, 15)
  }, [serials])

  const filteredSerials = serials.filter(sn => {
    const matchesSearch =
      sn.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.productSku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || sn.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <IconDeviceMobile className="size-7" />
                  Serialized Products Analytics
                </h1>
                <p className="text-muted-foreground">
                  Track your serialized inventory — phones, devices & more
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
                {/* Overview Stats Cards */}
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

                {/* Status Distribution + Product Breakdown */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconChartPie className="size-5" />
                        Status Distribution
                      </CardTitle>
                      <CardDescription>How your serialized inventory is distributed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stats.total === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No serialized products yet</p>
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

                  {/* Product Breakdown */}
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
                        <p className="text-center text-muted-foreground py-4">No serialized products yet</p>
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
                </div>

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
                              <TableHead>Status</TableHead>
                              <TableHead>Sale #</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="w-[60px]" />
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
                                <TableCell>
                                  <Badge className={STATUS_CONFIG[sn.status]?.color || ""} variant={STATUS_CONFIG[sn.status]?.variant || "outline"}>
                                    {STATUS_CONFIG[sn.status]?.label || sn.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {sn.saleNumber || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(sn.updatedAt)}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedSerial(sn); setIsDetailOpen(true) }}>
                                    <IconEye className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Full Serial Search */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Serial Numbers ({filteredSerials.length})</CardTitle>
                    <CardDescription>Search and browse all serialized products</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by serial number, product, SKU..."
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
                        {searchTerm || statusFilter !== "all" ? "No serial numbers match your filter." : "No serialized products in this branch."}
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-auto max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial Number</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Purchase #</TableHead>
                              <TableHead>Sale #</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="w-[60px]" />
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
                                <TableCell>
                                  <Badge className={STATUS_CONFIG[sn.status]?.color || ""} variant={STATUS_CONFIG[sn.status]?.variant || "outline"}>
                                    {STATUS_CONFIG[sn.status]?.label || sn.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{sn.purchaseNumber || "—"}</TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{sn.saleNumber || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{formatDate(sn.updatedAt)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedSerial(sn); setIsDetailOpen(true) }}>
                                    <IconEye className="size-4" />
                                  </Button>
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
