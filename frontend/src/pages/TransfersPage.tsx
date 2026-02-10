import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider, useBranch } from "@/context/branch-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { 
  IconBuilding, 
  IconBuildingStore, 
  IconTransfer, 
  IconPlus,
  IconEye,
  IconCheck,
  IconClock,
  IconX,
  IconArrowRight,
  IconTruckDelivery
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { transferApi, stockApi, branchApi, type Transfer, type StockItem } from "@/lib/api"
import { toast } from "sonner"

function TransfersContent() {
  const { selectedBranch, isCompanyView, branches } = useBranch()
  const [outgoingTransfers, setOutgoingTransfers] = useState<Transfer[]>([])
  const [incomingTransfers, setIncomingTransfers] = useState<Transfer[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [targetBranch, setTargetBranch] = useState("")
  const [notes, setNotes] = useState("")
  const [transferItems, setTransferItems] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "" }
  ])

  // View dialog state
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, isCompanyView])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isCompanyView) {
        // Fetch transfers from all branches
        const branchesData = await branchApi.getAll()
        const activeBranches = branchesData.filter(b => b.isActive)
        const [allOutgoing, allIncoming, allPending] = await Promise.all([
          Promise.all(activeBranches.map(b => transferApi.getFromBranch(b.id).catch(() => [] as Transfer[]))),
          Promise.all(activeBranches.map(b => transferApi.getToBranch(b.id).catch(() => [] as Transfer[]))),
          Promise.all(activeBranches.map(b => transferApi.getPending(b.id).catch(() => [] as Transfer[]))),
        ])
        // Deduplicate by ID since transfers appear in both from/to
        const dedup = (arrays: Transfer[][]) => {
          const map = new Map<number, Transfer>()
          arrays.flat().forEach(t => map.set(t.id, t))
          return Array.from(map.values())
        }
        setOutgoingTransfers(dedup(allOutgoing))
        setIncomingTransfers(dedup(allIncoming))
        setPendingTransfers(dedup(allPending))
        setStockItems([])
      } else if (selectedBranch?.id) {
        const [outgoing, incoming, pending, stock] = await Promise.all([
          transferApi.getFromBranch(selectedBranch.id),
          transferApi.getToBranch(selectedBranch.id),
          transferApi.getPending(selectedBranch.id),
          stockApi.getByBranch(selectedBranch.id)
        ])
        setOutgoingTransfers(outgoing)
        setIncomingTransfers(incoming)
        setPendingTransfers(pending)
        setStockItems(stock)
      }
    } catch (error) {
      console.error("Failed to load transfers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setTransferItems([...transferItems, { productId: "", quantity: "" }])
  }

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...transferItems]
    updated[index] = { ...updated[index], [field]: value }
    setTransferItems(updated)
  }

  const handleCreateTransfer = async () => {
    if (!selectedBranch?.id) {
      toast.error("Please select a source branch")
      return
    }
    try {
      await transferApi.create({
        fromBranchId: selectedBranch.id,
        toBranchId: parseInt(targetBranch),
        notes: notes || undefined,
        items: transferItems
          .filter(item => item.productId && item.quantity)
          .map(item => ({
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity)
          }))
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Failed to create transfer:", error)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await transferApi.approve(id)
      loadData()
    } catch (error) {
      console.error("Failed to approve transfer:", error)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await transferApi.reject(id)
      loadData()
    } catch (error) {
      console.error("Failed to reject transfer:", error)
    }
  }

  const resetForm = () => {
    setTargetBranch("")
    setNotes("")
    setTransferItems([{ productId: "", quantity: "" }])
  }

  const viewTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setIsViewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="flex items-center gap-1"><IconClock className="size-3" />Pending</Badge>
      case "APPROVED":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800"><IconCheck className="size-3" />Approved</Badge>
      case "IN_TRANSIT":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800"><IconTruckDelivery className="size-3" />In Transit</Badge>
      case "COMPLETED":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800"><IconCheck className="size-3" />Completed</Badge>
      case "REJECTED":
        return <Badge variant="destructive" className="flex items-center gap-1"><IconX className="size-3" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const otherBranches = branches.filter(b => b.id !== selectedBranch?.id)

  const TransferTable = ({ transfers, showActions = false, isIncoming = false }: { 
    transfers: Transfer[]; 
    showActions?: boolean;
    isIncoming?: boolean;
  }) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(100)
    
    const totalPages = Math.max(1, Math.ceil(transfers.length / pageSize))
    const paginatedTransfers = transfers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transfer #</TableHead>
              <TableHead>{isIncoming ? "From Branch" : "To Branch"}</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transfers found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-medium">{transfer.transferNumber}</TableCell>
                  <TableCell>{isIncoming ? transfer.fromBranchName : transfer.toBranchName}</TableCell>
                  <TableCell>{new Date(transfer.transferDate).toLocaleDateString()}</TableCell>
                  <TableCell>{transfer.items?.length || 0} items</TableCell>
                  <TableCell>{transfer.requestedByName}</TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewTransfer(transfer)}
                      >
                        <IconEye className="size-4" />
                      </Button>
                      {showActions && transfer.status === "PENDING" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApprove(transfer.id)}
                          >
                            <IconCheck className="size-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleReject(transfer.id)}
                          >
                            <IconX className="size-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination Controls */}
        {transfers.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, transfers.length)} of {transfers.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</Button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>Next</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>Last</Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="px-4 lg:px-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isCompanyView ? (
                  <>
                    <IconBuilding className="size-4" />
                    <span>Viewing:</span>
                    <Badge variant="secondary">All Branches (Company-wide)</Badge>
                  </>
                ) : (
                  <>
                    <IconBuildingStore className="size-4" />
                    <span>Viewing:</span>
                    <Badge variant="outline">{selectedBranch?.name}</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Stock Transfers</h1>
                  <p className="text-muted-foreground">Transfer inventory between branches</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={isCompanyView} title={isCompanyView ? "Select a branch to create transfers" : ""}>
                      <IconPlus className="size-4 mr-2" />
                      New Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Stock Transfer</DialogTitle>
                      <DialogDescription>
                        Request a stock transfer to another branch
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="flex-1">
                          <Label className="text-muted-foreground">From</Label>
                          <p className="font-medium">{selectedBranch?.name || "Select a branch"}</p>
                        </div>
                        <IconArrowRight className="size-5 text-muted-foreground" />
                        <div className="flex-1">
                          <Label>To Branch</Label>
                          <Select value={targetBranch} onValueChange={setTargetBranch}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {otherBranches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Items to Transfer</Label>
                        {transferItems.map((item, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Select 
                                value={item.productId} 
                                onValueChange={(v) => handleItemChange(index, 'productId', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {stockItems.filter(s => s.quantity > 0).map(stock => (
                                    <SelectItem key={stock.id} value={stock.productId.toString()}>
                                      {stock.productName} (Available: {stock.quantity})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              type="number"
                              placeholder="Qty"
                              className="w-24"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            />
                            {transferItems.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <IconX className="size-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                          <IconPlus className="size-4 mr-2" />
                          Add Item
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea 
                          value={notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                          placeholder="Reason for transfer..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTransfer}>Create Transfer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending Approval</CardDescription>
                    <CardTitle className="text-2xl">{pendingTransfers.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Outgoing Transfers</CardDescription>
                    <CardTitle className="text-2xl">{outgoingTransfers.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Incoming Transfers</CardDescription>
                    <CardTitle className="text-2xl">{incomingTransfers.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Connected Branches</CardDescription>
                    <CardTitle className="text-2xl">{otherBranches.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Transfers Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconTransfer className="size-5" />
                    Transfer Management
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "All transfers across branches" : `Manage stock transfers for ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Tabs defaultValue="pending">
                      <TabsList>
                        <TabsTrigger value="pending">
                          Pending Approval ({pendingTransfers.length})
                        </TabsTrigger>
                        <TabsTrigger value="outgoing">
                          Outgoing ({outgoingTransfers.length})
                        </TabsTrigger>
                        <TabsTrigger value="incoming">
                          Incoming ({incomingTransfers.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="pending" className="mt-4">
                        <TransferTable transfers={pendingTransfers} showActions isIncoming />
                      </TabsContent>
                      <TabsContent value="outgoing" className="mt-4">
                        <TransferTable transfers={outgoingTransfers} />
                      </TabsContent>
                      <TabsContent value="incoming" className="mt-4">
                        <TransferTable transfers={incomingTransfers} isIncoming />
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* View Transfer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer - {selectedTransfer?.transferNumber}</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.fromBranchName} → {selectedTransfer?.toBranchName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">{selectedTransfer && getStatusBadge(selectedTransfer.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="mt-1">{selectedTransfer && new Date(selectedTransfer.transferDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Requested By:</span>
                <p className="mt-1">{selectedTransfer?.requestedByName}</p>
              </div>
              {selectedTransfer?.approvedByName && (
                <div>
                  <span className="text-muted-foreground">Approved By:</span>
                  <p className="mt-1">{selectedTransfer.approvedByName}</p>
                </div>
              )}
            </div>
            {selectedTransfer?.notes && (
              <div>
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1">{selectedTransfer.notes}</p>
              </div>
            )}
            <div>
              <span className="font-medium">Items:</span>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransfer?.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export function TransfersPage() {
  return (
    <BranchProvider>
      <TransfersContent />
    </BranchProvider>
  )
}
