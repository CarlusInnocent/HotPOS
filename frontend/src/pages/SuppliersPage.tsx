import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider } from "@/context/branch-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { IconTruck, IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
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
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { supplierApi, type Supplier } from "@/lib/api"

interface SupplierForm {
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  isActive: boolean
}

const emptyForm: SupplierForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  isActive: true,
}

function SuppliersContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true)
      const data = await supplierApi.getAll()
      setSuppliers(data)
    } catch (err) {
      console.error("Failed to fetch suppliers:", err)
      toast.error("Failed to load suppliers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleAddSupplier = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }
    setIsSaving(true)
    try {
      await supplierApi.create({
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        isActive: formData.isActive,
      })
      toast.success("Supplier created")
      setIsAddDialogOpen(false)
      setFormData(emptyForm)
      fetchSuppliers()
    } catch (err) {
      console.error("Failed to create supplier:", err)
      toast.error("Failed to create supplier")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSupplier = async () => {
    if (!selectedSupplier) return
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }
    setIsSaving(true)
    try {
      await supplierApi.update(selectedSupplier.id, {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        isActive: formData.isActive,
      })
      toast.success("Supplier updated")
      setIsEditDialogOpen(false)
      setSelectedSupplier(null)
      setFormData(emptyForm)
      fetchSuppliers()
    } catch (err) {
      console.error("Failed to update supplier:", err)
      toast.error("Failed to update supplier")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return
    setIsSaving(true)
    try {
      await supplierApi.delete(selectedSupplier.id)
      toast.success("Supplier deleted")
      setIsDeleteDialogOpen(false)
      setSelectedSupplier(null)
      fetchSuppliers()
    } catch (err) {
      console.error("Failed to delete supplier:", err)
      toast.error("Failed to delete supplier")
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      isActive: supplier.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteDialogOpen(true)
  }

  // Pagination calculations
  const totalPages = Math.ceil(suppliers.length / pageSize)
  const paginatedSuppliers = suppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Supplier Management</h1>
                  <p className="text-muted-foreground">Manage your suppliers and vendors</p>
                </div>
                <Button onClick={() => { setFormData(emptyForm); setIsAddDialogOpen(true) }}>
                  <IconPlus className="size-4 mr-2" />
                  Add Supplier
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconTruck className="size-5" />
                    All Suppliers
                  </CardTitle>
                  <CardDescription>
                    View and manage supplier information
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
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSuppliers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No suppliers found. Click "Add Supplier" to create one.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedSuppliers.map((supplier) => (
                              <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>{supplier.contactPerson || "-"}</TableCell>
                                <TableCell>{supplier.email || "-"}</TableCell>
                                <TableCell>{supplier.phone || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={supplier.isActive ? "default" : "secondary"}>
                                    {supplier.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(supplier)}>
                                    <IconPencil className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(supplier)}>
                                    <IconTrash className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      
                      {/* Pagination Controls */}
                      {suppliers.length > 0 && (
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
                            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, suppliers.length)} of {suppliers.length}
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

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Supplier</DialogTitle>
                    <DialogDescription>Enter supplier details</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="Contact person"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Address"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-1">
                        <Label htmlFor="isActive">Active</Label>
                        <p className="text-sm text-muted-foreground">Controls whether the supplier is active.</p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSupplier} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Add Supplier"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Supplier</DialogTitle>
                    <DialogDescription>Update supplier details</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contactPerson">Contact Person</Label>
                      <Input
                        id="edit-contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="Contact person"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Address"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-1">
                        <Label htmlFor="edit-isActive">Active</Label>
                        <p className="text-sm text-muted-foreground">Controls whether the supplier is active.</p>
                      </div>
                      <Switch
                        id="edit-isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditSupplier} disabled={isSaving || !selectedSupplier}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The supplier will be removed permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSupplier} disabled={isSaving}>
                      {isSaving ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function SuppliersPage() {
  return (
    <BranchProvider>
      <SuppliersContent />
    </BranchProvider>
  )
}
