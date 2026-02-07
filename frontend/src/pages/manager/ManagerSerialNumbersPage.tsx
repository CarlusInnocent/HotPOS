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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@tabler/icons-react"
import { useAuth } from "@/context/auth-context"
import { serialApi, type SerialNumber } from "@/lib/api"
import { toast } from "sonner"

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  IN_STOCK: { label: "In Stock", color: "bg-green-100 text-green-800 border-green-300", variant: "outline" },
  SOLD: { label: "Sold", color: "bg-blue-100 text-blue-800 border-blue-300", variant: "outline" },
  TRANSFERRED: { label: "Transferred", color: "bg-purple-100 text-purple-800 border-purple-300", variant: "outline" },
  RETURNED: { label: "Returned", color: "bg-yellow-100 text-yellow-800 border-yellow-300", variant: "outline" },
  DEFECTIVE: { label: "Defective", color: "bg-red-100 text-red-800 border-red-300", variant: "destructive" },
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

export function ManagerSerialNumbersPage() {
  const { user } = useAuth()
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
      console.error("Failed to load serial numbers:", error)
      toast.error("Failed to load serial numbers")
    } finally {
      setLoading(false)
    }
  }

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

  const openDetail = (sn: SerialNumber) => {
    setSelectedSerial(sn)
    setIsDetailOpen(true)
  }

  const openStatusDialog = (sn: SerialNumber) => {
    setEditingSerial(sn)
    setNewStatus(sn.status)
    setStatusNotes("")
    setIsStatusDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!editingSerial || !newStatus) return
    setIsUpdating(true)
    try {
      await serialApi.updateStatus(editingSerial.id, newStatus, statusNotes || undefined)
      toast.success(`Serial ${editingSerial.serialNumber} status updated to ${STATUS_CONFIG[newStatus]?.label}`)
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
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <IconBarcode className="size-7" />
                  Serial Number Tracking
                </h1>
                <p className="text-muted-foreground">
                  Track every serialized product — see where each unit came from and where it went.
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
                      <CardDescription className="text-xs">Total</CardDescription>
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

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by serial number, product, SKU, sale #, purchase #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <IconFilter className="size-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
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

                {/* Serial Numbers Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Serial Numbers ({filteredSerials.length})
                    </CardTitle>
                    <CardDescription>
                      Complete record of every serialized product in your branch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredSerials.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                          ? "No serial numbers match your search or filter."
                          : "No serialized products in this branch yet."}
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial Number</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Purchase #</TableHead>
                              <TableHead>Sale #</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSerials.map((sn) => (
                              <TableRow key={sn.id} className="group">
                                <TableCell className="font-mono font-semibold">
                                  {sn.serialNumber}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">{sn.productName}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({sn.productSku})</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={STATUS_CONFIG[sn.status]?.color || ""} variant={STATUS_CONFIG[sn.status]?.variant || "outline"}>
                                    {STATUS_CONFIG[sn.status]?.label || sn.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {sn.purchaseNumber || "—"}
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {sn.saleNumber || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(sn.updatedAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openDetail(sn)} title="View Details">
                                      <IconEye className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openStatusDialog(sn)} title="Update Status">
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
                <h4 className="font-semibold">Transaction History</h4>
                {selectedSerial.purchaseNumber && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                    <IconPackage className="size-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Purchased / Received</p>
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
                {selectedSerial.status === "TRANSFERRED" && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-purple-50 dark:bg-purple-950/30">
                    <IconTransfer className="size-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Transferred</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedSerial.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {selectedSerial.status === "RETURNED" && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
                    <IconArrowBack className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Returned</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedSerial.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {selectedSerial.status === "DEFECTIVE" && (
                  <div className="flex items-start gap-3 p-2 rounded-md bg-red-50 dark:bg-red-950/30">
                    <IconAlertTriangle className="size-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Marked Defective</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedSerial.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedSerial.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedSerial.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
            <Button onClick={() => { setIsDetailOpen(false); if (selectedSerial) openStatusDialog(selectedSerial); }}>
              <IconEdit className="size-4 mr-2" /> Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Serial Status</DialogTitle>
            <DialogDescription>
              {editingSerial && (
                <>Change status for <span className="font-mono font-semibold">{editingSerial.serialNumber}</span> ({editingSerial.productName})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                  <SelectItem value="DEFECTIVE">Defective</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (Optional)</label>
              <Textarea
                placeholder="Reason for status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
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
            <DialogDescription>
              Search any serial number across all branches to see its full history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter serial number..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="font-mono"
              />
              <Button onClick={handleLookup} disabled={isLookingUp || !lookupQuery.trim()}>
                {isLookingUp ? "..." : "Search"}
              </Button>
            </div>

            {lookupError && (
              <div className="text-center py-6 text-muted-foreground">
                <IconBarcode className="size-10 mx-auto mb-2 opacity-30" />
                <p>{lookupError}</p>
              </div>
            )}

            {lookupResult && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-mono font-bold">{lookupResult.serialNumber}</p>
                  <Badge className={`mt-2 ${STATUS_CONFIG[lookupResult.status]?.color || ""}`} variant={STATUS_CONFIG[lookupResult.status]?.variant || "outline"}>
                    {STATUS_CONFIG[lookupResult.status]?.label || lookupResult.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Product</p>
                    <p className="font-medium">{lookupResult.productName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">SKU</p>
                    <p className="font-mono">{lookupResult.productSku}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Branch</p>
                    <p className="font-medium">{lookupResult.branchName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Created</p>
                    <p>{formatDate(lookupResult.createdAt)}</p>
                  </div>
                  {lookupResult.purchaseNumber && (
                    <div>
                      <p className="text-muted-foreground text-xs">Purchase</p>
                      <p className="font-mono">{lookupResult.purchaseNumber}</p>
                    </div>
                  )}
                  {lookupResult.saleNumber && (
                    <div>
                      <p className="text-muted-foreground text-xs">Sale</p>
                      <p className="font-mono">{lookupResult.saleNumber}</p>
                    </div>
                  )}
                </div>
                {lookupResult.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="text-sm">{lookupResult.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
