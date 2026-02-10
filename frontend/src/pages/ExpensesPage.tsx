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
  IconReceipt2, 
  IconPlus,
  IconPencil,
  IconTrash
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
} from "@/components/ui/dialog"
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
import { expenseApi, branchApi, type Expense } from "@/lib/api"
import { toast } from "sonner"

interface ExpenseForm {
  category: string
  description: string
  amount: string
  expenseDate: string
  receiptNumber: string
  notes: string
}

const emptyForm: ExpenseForm = {
  category: "",
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split('T')[0],
  receiptNumber: "",
  notes: "",
}

const expenseCategories = [
  "Rent",
  "Utilities",
  "Salaries",
  "Transport",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Taxes",
  "Other"
]

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function ExpensesContent() {
  const { selectedBranch, isCompanyView } = useBranch()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState<ExpenseForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, isCompanyView])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isCompanyView) {
        const branchesData = await branchApi.getAll()
        const allExpenses = await Promise.all(
          branchesData.filter(b => b.isActive).map(b => expenseApi.getByBranch(b.id).catch(() => [] as Expense[]))
        )
        setExpenses(allExpenses.flat().sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()))
      } else if (selectedBranch?.id) {
        const data = await expenseApi.getByBranch(selectedBranch.id)
        setExpenses(data)
      } else {
        setExpenses([])
      }
    } catch (error) {
      console.error("Failed to load expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    if (!selectedBranch?.id || !formData.category || !formData.description || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsSaving(true)
    try {
      await expenseApi.create({
        branchId: selectedBranch.id,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        receiptNumber: formData.receiptNumber || undefined,
        notes: formData.notes || undefined,
      })
      toast.success("Expense created successfully")
      setIsAddDialogOpen(false)
      setFormData(emptyForm)
      loadData()
    } catch (err: unknown) {
      console.error("Failed to create expense:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to create expense")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditExpense = async () => {
    if (!selectedExpense || !formData.category || !formData.description || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsSaving(true)
    try {
      await expenseApi.update(selectedExpense.id, {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        receiptNumber: formData.receiptNumber || undefined,
        notes: formData.notes || undefined,
      })
      toast.success("Expense updated successfully")
      setIsEditDialogOpen(false)
      setSelectedExpense(null)
      setFormData(emptyForm)
      loadData()
    } catch (err: unknown) {
      console.error("Failed to update expense:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to update expense")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return
    setIsSaving(true)
    try {
      await expenseApi.delete(selectedExpense.id)
      toast.success("Expense deleted successfully")
      setIsDeleteDialogOpen(false)
      setSelectedExpense(null)
      loadData()
    } catch (err) {
      console.error("Failed to delete expense:", err)
      toast.error("Failed to delete expense")
    } finally {
      setIsSaving(false)
    }
  }

  const openAddDialog = () => {
    setFormData({
      ...emptyForm,
      expenseDate: new Date().toISOString().split('T')[0]
    })
    setIsAddDialogOpen(true)
  }

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate.split('T')[0],
      receiptNumber: expense.receiptNumber || "",
      notes: expense.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsDeleteDialogOpen(true)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize))
  const paginatedExpenses = expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
                  <h1 className="text-2xl font-bold">Expense Management</h1>
                  <p className="text-muted-foreground">Track and manage business expenses</p>
                </div>
                <Button onClick={openAddDialog} disabled={isCompanyView} title={isCompanyView ? "Select a branch to add expenses" : ""}>
                  <IconPlus className="size-4 mr-2" />
                  Add Expense
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Expenses</CardDescription>
                    <CardTitle className="text-2xl">{formatUGX(totalExpenses)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Number of Expenses</CardDescription>
                    <CardTitle className="text-2xl">{expenses.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Categories Used</CardDescription>
                    <CardTitle className="text-2xl">{Object.keys(expensesByCategory).length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconReceipt2 className="size-5" />
                    Expenses
                  </CardTitle>
                  <CardDescription>
                    {isCompanyView ? "All expenses across branches" : `All expenses for ${selectedBranch?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No expenses found. Click "Add Expense" to create one.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Recorded By</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{expense.category}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">{expense.description}</TableCell>
                              <TableCell>{expense.userName}</TableCell>
                              <TableCell className="text-right font-medium">{formatUGX(expense.amount)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                                  <IconPencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(expense)}>
                                  <IconTrash className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Pagination Controls */}
                      {expenses.length > 0 && (
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
                            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, expenses.length)} of {expenses.length}
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

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Record a new business expense
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter expense description..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receiptNumber">Receipt Number (Optional)</Label>
              <Input
                id="receiptNumber"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                placeholder="Enter receipt number..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-receiptNumber">Receipt Number (Optional)</Label>
              <Input
                id="edit-receiptNumber"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditExpense} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}

export function ExpensesPage() {
  return (
    <BranchProvider>
      <ExpensesContent />
    </BranchProvider>
  )
}
