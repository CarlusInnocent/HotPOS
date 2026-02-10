import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import {
  transferApi,
  branchApi,
  stockApi,
  type Transfer,
  type Branch,
  type StockItem,
} from "@/lib/api"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"
import {
  IconTransfer,
  IconEye,
  IconPlus,
  IconX,
  IconSend,
  IconCheck,
  IconPackage,
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Pending</Badge>
    case "IN_TRANSIT":
      return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">In Transit</Badge>
    case "RECEIVED":
      return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Received</Badge>
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

interface TransferItemInput {
  productId: number
  productName: string
  productSku: string
  quantity: number
  available: number
}

export function CashierTransfersPage() {
  const { user } = useAuth()
  const [outgoing, setOutgoing] = useState<Transfer[]>([])
  const [incoming, setIncoming] = useState<Transfer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [toBranchId, setToBranchId] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<TransferItemInput[]>([])
  const [creating, setCreating] = useState(false)

  // View dialog state
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  // Pagination for outgoing
  const [outgoingPage, setOutgoingPage] = useState(1)
  const [outgoingPageSize, setOutgoingPageSize] = useState(100)

  // Pagination for incoming
  const [incomingPage, setIncomingPage] = useState(1)
  const [incomingPageSize, setIncomingPageSize] = useState(100)

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
      const [outData, inData, branchData, stockData] = await Promise.all([
        transferApi.getFromBranch(user.branchId),
        transferApi.getToBranch(user.branchId),
        branchApi.getAll(),
        stockApi.getByBranch(user.branchId),
      ])
      setOutgoing(outData)
      setIncoming(inData)
      setBranches(branchData.filter((b) => b.id !== user.branchId))
      setStock(stockData)
    } catch (error) {
      console.error("Failed to load transfers:", error)
      toast.error("Failed to load transfers")
    } finally {
      setLoading(false)
    }
  }

  // --- Create Transfer ---
  const addItem = () => {
    setItems([
      ...items,
      { productId: 0, productName: "", productSku: "", quantity: 1, available: 0 },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, productId: number) => {
    const stockItem = stock.find((s) => s.productId === productId)
    if (!stockItem) return
    const updated = [...items]
    updated[index] = {
      productId: stockItem.productId,
      productName: stockItem.productName,
      productSku: stockItem.productSku,
      quantity: 1,
      available: stockItem.quantity,
    }
    setItems(updated)
  }

  const updateQuantity = (index: number, qty: number) => {
    const updated = [...items]
    updated[index].quantity = qty
    setItems(updated)
  }

  const handleCreate = async () => {
    if (!user?.branchId || !toBranchId) return
    if (items.length === 0 || items.some((i) => i.productId === 0)) {
      toast.error("Please add at least one product")
      return
    }
    if (items.some((i) => i.quantity <= 0)) {
      toast.error("All quantities must be greater than 0")
      return
    }
    if (items.some((i) => i.quantity > i.available)) {
      toast.error("Quantity exceeds available stock for some items")
      return
    }
    setCreating(true)
    try {
      await transferApi.create({
        fromBranchId: user.branchId,
        toBranchId: parseInt(toBranchId),
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
      toast.success("Transfer created successfully")
      setCreateOpen(false)
      resetCreateForm()
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create transfer")
    } finally {
      setCreating(false)
    }
  }

  const resetCreateForm = () => {
    setToBranchId("")
    setNotes("")
    setItems([])
  }

  // --- Send Transfer ---
  const handleSend = async (id: number) => {
    try {
      await transferApi.send(id)
      toast.success("Transfer sent! Stock has been deducted from your branch.")
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send transfer")
    }
  }

  // --- Receive Transfer ---
  const handleReceive = async (id: number) => {
    try {
      await transferApi.receive(id)
      toast.success("Transfer received! Stock has been added to your branch.")
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to receive transfer")
    }
  }

  // --- View Transfer ---
  const viewTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setViewOpen(true)
  }

  // Available products (not already added)
  const availableProducts = stock.filter(
    (s) => s.quantity > 0 && !items.some((i) => i.productId === s.productId)
  )

  // Separate incoming into pending receipt (IN_TRANSIT)
  const pendingReceipt = incoming.filter((t) => t.status === "IN_TRANSIT")

  // Pagination calculations for outgoing
  const outgoingTotalPages = Math.max(1, Math.ceil(outgoing.length / outgoingPageSize))
  const paginatedOutgoing = outgoing.slice((outgoingPage - 1) * outgoingPageSize, outgoingPage * outgoingPageSize)

  // Pagination calculations for incoming
  const incomingTotalPages = Math.max(1, Math.ceil(incoming.length / incomingPageSize))
  const paginatedIncoming = incoming.slice((incomingPage - 1) * incomingPageSize, incomingPage * incomingPageSize)

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <IconTransfer className="size-6" />
                Stock Transfers
              </h1>
              <p className="text-muted-foreground">
                Transfer stock between branches
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-4 mr-2" />
              New Transfer
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="outgoing" className="w-full">
              <TabsList>
                <TabsTrigger value="outgoing" className="flex items-center gap-1">
                  <IconArrowRight className="size-4" />
                  Outgoing ({outgoing.length})
                </TabsTrigger>
                <TabsTrigger value="incoming" className="flex items-center gap-1">
                  <IconArrowLeft className="size-4" />
                  Incoming
                  {pendingReceipt.length > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                      {pendingReceipt.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* OUTGOING TAB */}
              <TabsContent value="outgoing">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconArrowRight className="size-5" />
                      Outgoing Transfers
                    </CardTitle>
                    <CardDescription>
                      Transfers you've initiated from your branch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {outgoing.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No outgoing transfers yet.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transfer #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Destination</TableHead>
                              <TableHead className="text-center">Items</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedOutgoing.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-mono text-sm">
                                  {t.transferNumber}
                                </TableCell>
                                <TableCell>
                                  {new Date(t.transferDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{t.toBranchName}</TableCell>
                                <TableCell className="text-center">
                                  {t.items.reduce((sum, i) => sum + i.quantity, 0)}
                                </TableCell>
                                <TableCell>{getStatusBadge(t.status)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewTransfer(t)}
                                    >
                                      <IconEye className="size-4" />
                                    </Button>
                                    {t.status === "PENDING" && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleSend(t.id)}
                                      >
                                        <IconSend className="size-4 mr-1" />
                                        Send
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {/* Pagination Controls for Outgoing */}
                    {outgoing.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rows per page</span>
                          <Select value={outgoingPageSize.toString()} onValueChange={(v) => { setOutgoingPageSize(Number(v)); setOutgoingPage(1) }}>
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
                          Showing {(outgoingPage - 1) * outgoingPageSize + 1}-{Math.min(outgoingPage * outgoingPageSize, outgoing.length)} of {outgoing.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setOutgoingPage(1)} disabled={outgoingPage === 1}>First</Button>
                          <Button variant="outline" size="sm" onClick={() => setOutgoingPage(p => p - 1)} disabled={outgoingPage === 1}>Previous</Button>
                          <span className="text-sm">Page {outgoingPage} of {outgoingTotalPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setOutgoingPage(p => p + 1)} disabled={outgoingPage >= outgoingTotalPages}>Next</Button>
                          <Button variant="outline" size="sm" onClick={() => setOutgoingPage(outgoingTotalPages)} disabled={outgoingPage >= outgoingTotalPages}>Last</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* INCOMING TAB */}
              <TabsContent value="incoming">
                {/* Pending Receipt section */}
                {pendingReceipt.length > 0 && (
                  <Card className="mb-4 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <IconPackage className="size-5" />
                        Pending Receipt ({pendingReceipt.length})
                      </CardTitle>
                      <CardDescription>
                        These transfers are in transit to your branch. Confirm receipt to add the stock.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transfer #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>From Branch</TableHead>
                              <TableHead>Requested By</TableHead>
                              <TableHead className="text-center">Items</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingReceipt.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-mono text-sm">
                                  {t.transferNumber}
                                </TableCell>
                                <TableCell>
                                  {new Date(t.transferDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{t.fromBranchName}</TableCell>
                                <TableCell>{t.requestedByName}</TableCell>
                                <TableCell className="text-center">
                                  {t.items.reduce((sum, i) => sum + i.quantity, 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewTransfer(t)}
                                    >
                                      <IconEye className="size-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleReceive(t.id)}
                                    >
                                      <IconCheck className="size-4 mr-1" />
                                      Receive
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All incoming transfers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconArrowLeft className="size-5" />
                      All Incoming Transfers
                    </CardTitle>
                    <CardDescription>
                      All transfers sent to your branch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incoming.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No incoming transfers yet.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transfer #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>From Branch</TableHead>
                              <TableHead>Requested By</TableHead>
                              <TableHead className="text-center">Items</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedIncoming.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-mono text-sm">
                                  {t.transferNumber}
                                </TableCell>
                                <TableCell>
                                  {new Date(t.transferDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{t.fromBranchName}</TableCell>
                                <TableCell>{t.requestedByName}</TableCell>
                                <TableCell className="text-center">
                                  {t.items.reduce((sum, i) => sum + i.quantity, 0)}
                                </TableCell>
                                <TableCell>{getStatusBadge(t.status)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewTransfer(t)}
                                    >
                                      <IconEye className="size-4" />
                                    </Button>
                                    {t.status === "IN_TRANSIT" && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleReceive(t.id)}
                                      >
                                        <IconCheck className="size-4 mr-1" />
                                        Receive
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {/* Pagination Controls for Incoming */}
                    {incoming.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rows per page</span>
                          <Select value={incomingPageSize.toString()} onValueChange={(v) => { setIncomingPageSize(Number(v)); setIncomingPage(1) }}>
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
                          Showing {(incomingPage - 1) * incomingPageSize + 1}-{Math.min(incomingPage * incomingPageSize, incoming.length)} of {incoming.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIncomingPage(1)} disabled={incomingPage === 1}>First</Button>
                          <Button variant="outline" size="sm" onClick={() => setIncomingPage(p => p - 1)} disabled={incomingPage === 1}>Previous</Button>
                          <span className="text-sm">Page {incomingPage} of {incomingTotalPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setIncomingPage(p => p + 1)} disabled={incomingPage >= incomingTotalPages}>Next</Button>
                          <Button variant="outline" size="sm" onClick={() => setIncomingPage(incomingTotalPages)} disabled={incomingPage >= incomingTotalPages}>Last</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SidebarInset>

      {/* CREATE TRANSFER DIALOG */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Transfer</DialogTitle>
            <DialogDescription>
              Select a destination branch and add products to transfer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Branch</Label>
                <Input value={user?.branchName || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Destination Branch</Label>
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this transfer..."
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Transfer Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={availableProducts.length === 0}
                >
                  <IconPlus className="size-4 mr-1" />
                  Add Product
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                  No items added. Click "Add Product" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-end gap-3 border rounded-md p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Product</Label>
                        <Select
                          value={item.productId ? item.productId.toString() : ""}
                          onValueChange={(val) => updateItem(index, parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...availableProducts,
                              ...(item.productId
                                ? stock.filter((s) => s.productId === item.productId)
                                : []),
                            ].map((s) => (
                              <SelectItem
                                key={s.productId}
                                value={s.productId.toString()}
                              >
                                {s.productName} ({s.productSku}) — {s.quantity} in stock
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs">
                          Qty (max {item.available})
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={item.available}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(index, parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !toBranchId ||
                items.length === 0 ||
                items.some((i) => i.productId === 0)
              }
            >
              {creating ? "Creating..." : "Create Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW TRANSFER DIALOG */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.transferNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{selectedTransfer.fromBranchName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To</p>
                  <p className="font-medium">{selectedTransfer.toBranchName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedTransfer.transferDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Requested By</p>
                  <p className="font-medium">{selectedTransfer.requestedByName}</p>
                </div>
                {selectedTransfer.approvedByName && (
                  <div>
                    <p className="text-muted-foreground">Received By</p>
                    <p className="font-medium">{selectedTransfer.approvedByName}</p>
                  </div>
                )}
              </div>

              {selectedTransfer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedTransfer.notes}</p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {item.productSku}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action buttons in view dialog */}
              {selectedTransfer.status === "PENDING" &&
                selectedTransfer.fromBranchId === user?.branchId && (
                  <div className="flex justify-end">
                    <Button onClick={() => { handleSend(selectedTransfer.id); setViewOpen(false); }}>
                      <IconSend className="size-4 mr-1" />
                      Send Transfer
                    </Button>
                  </div>
                )}
              {selectedTransfer.status === "IN_TRANSIT" &&
                selectedTransfer.toBranchId === user?.branchId && (
                  <div className="flex justify-end">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => { handleReceive(selectedTransfer.id); setViewOpen(false); }}
                    >
                      <IconCheck className="size-4 mr-1" />
                      Confirm Receipt
                    </Button>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
