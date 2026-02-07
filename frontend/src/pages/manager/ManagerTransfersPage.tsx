import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { transferApi, type Transfer } from "@/lib/api"
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
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
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

export function ManagerTransfersPage() {
  const { user } = useAuth()
  const [outgoing, setOutgoing] = useState<Transfer[]>([])
  const [incoming, setIncoming] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  // View dialog
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

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
      const [outData, inData] = await Promise.all([
        transferApi.getFromBranch(user.branchId),
        transferApi.getToBranch(user.branchId),
      ])
      setOutgoing(outData)
      setIncoming(inData)
    } catch (error) {
      console.error("Failed to load transfers:", error)
      toast.error("Failed to load transfers")
    } finally {
      setLoading(false)
    }
  }

  const viewTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setViewOpen(true)
  }

  const pendingReceiptCount = incoming.filter((t) => t.status === "IN_TRANSIT").length

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IconTransfer className="size-6" />
              Stock Transfers
            </h1>
            <p className="text-muted-foreground">
              View stock transfers for your branch (read-only)
            </p>
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
                  Incoming ({incoming.length})
                  {pendingReceiptCount > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 text-blue-700 border-blue-300">
                      {pendingReceiptCount} in transit
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
                      Transfers initiated from your branch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {outgoing.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No outgoing transfers.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transfer #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Destination</TableHead>
                              <TableHead>Requested By</TableHead>
                              <TableHead className="text-center">Items</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {outgoing.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-mono text-sm">
                                  {t.transferNumber}
                                </TableCell>
                                <TableCell>
                                  {new Date(t.transferDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{t.toBranchName}</TableCell>
                                <TableCell>{t.requestedByName}</TableCell>
                                <TableCell className="text-center">
                                  {t.items.reduce((sum, i) => sum + i.quantity, 0)}
                                </TableCell>
                                <TableCell>{getStatusBadge(t.status)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => viewTransfer(t)}
                                  >
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
              </TabsContent>

              {/* INCOMING TAB */}
              <TabsContent value="incoming">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconArrowLeft className="size-5" />
                      Incoming Transfers
                    </CardTitle>
                    <CardDescription>
                      Transfers sent to your branch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incoming.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No incoming transfers.
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
                            {incoming.map((t) => (
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => viewTransfer(t)}
                                  >
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
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SidebarInset>

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
