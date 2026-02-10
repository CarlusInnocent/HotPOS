import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider, useBranch } from "@/context/branch-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { IconBuilding, IconBuildingStore, IconUsers, IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { customerApi, type Customer } from "@/lib/api"

function CustomersContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true)
        const data = await customerApi.getAll()
        setCustomers(data)
      } catch (err) {
        console.error("Failed to fetch customers:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize))
  const paginatedCustomers = customers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Customer Management</h1>
                  <p className="text-muted-foreground">Manage your customer database</p>
                </div>
                <Button>
                  <IconPlus className="size-4 mr-2" />
                  Add Customer
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconUsers className="size-5" />
                    All Customers
                  </CardTitle>
                  <CardDescription>
                    View and manage customer information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Loyalty Points</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCustomers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No customers found
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedCustomers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.email || "-"}</TableCell>
                                <TableCell>{customer.phone || "-"}</TableCell>
                                <TableCell>{customer.loyaltyPoints}</TableCell>
                                <TableCell>
                                  <Badge variant={customer.isActive ? "default" : "secondary"}>
                                    {customer.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm">
                                    <IconPencil className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <IconTrash className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      
                      {/* Pagination Controls */}
                      {customers.length > 0 && (
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
                            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, customers.length)} of {customers.length}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function CustomersPage() {
  return (
    <BranchProvider>
      <CustomersContent />
    </BranchProvider>
  )
}
