import { useEffect, useState } from "react"
import { ManagerSidebar } from "@/components/manager-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { expenseApi, type Expense } from "@/lib/api"
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
  IconReceipt2,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
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

interface ExpenseForm {
  category: string
  description: string
  amount: string
  paymentMethod: string
  expenseDate: string
  receiptNumber: string
  notes: string
}

const emptyForm: ExpenseForm = {
  category: "",
  description: "",
  amount: "",
  paymentMethod: "CASH",
  expenseDate: new Date().toISOString().split('T')[0],
  receiptNumber: "",
  notes: "",
}

export function ManagerExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create/Edit expense dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<ExpenseForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
  
  // View expense dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  useEffect(() => {
    if (user?.branchId) {
      loadExpenses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  const loadExpenses = async () => {
    if (!user?.branchId) return
    setLoading(true)
    try {
      const data = await expenseApi.getByBranch(user.branchId)
      // Manager sees ALL branch expenses
      setExpenses(data)
    } catch (error) {
      console.error("Failed to load expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdateExpense = async () => {
    if (!user?.branchId || !formData.category || !formData.description || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSaving(true)
    try {
      const expenseData = {
        branchId: user.branchId,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        expenseDate: formData.expenseDate,
        receiptNumber: formData.receiptNumber || undefined,
        notes: formData.notes || undefined,
      }

      if (editingExpenseId) {
        await expenseApi.update(editingExpenseId, expenseData)
        toast.success("Expense updated successfully")
      } else {
        await expenseApi.create(expenseData)
        toast.success("Expense recorded successfully")
      }
      setIsCreateDialogOpen(false)
      setFormData(emptyForm)
      setEditingExpenseId(null)
      loadExpenses()
    } catch (err: unknown) {
      console.error("Failed to save expense:", err)
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to save expense")
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (expense: Expense) => {
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      paymentMethod: expense.paymentMethod || "CASH",
      expenseDate: expense.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      receiptNumber: expense.receiptNumber || "",
      notes: expense.notes || "",
    })
    setEditingExpenseId(expense.id)
    setIsCreateDialogOpen(true)
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    try {
      await expenseApi.delete(expenseToDelete.id)
      toast.success("Expense deleted successfully")
      setIsDeleteDialogOpen(false)
      setExpenseToDelete(null)
      loadExpenses()
    } catch (error) {
      console.error("Failed to delete expense:", error)
      toast.error("Failed to delete expense")
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Rent": "bg-blue-100 text-blue-800",
      "Utilities": "bg-yellow-100 text-yellow-800",
      "Salaries": "bg-green-100 text-green-800",
      "Transport": "bg-purple-100 text-purple-800",
      "Supplies": "bg-pink-100 text-pink-800",
      "Maintenance": "bg-orange-100 text-orange-800",
      "Marketing": "bg-cyan-100 text-cyan-800",
      "Insurance": "bg-indigo-100 text-indigo-800",
      "Taxes": "bg-red-100 text-red-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  return (
    <SidebarProvider>
      <ManagerSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Expenses</h1>
                <p className="text-muted-foreground">Manage all branch expenses</p>
              </div>
              <Button onClick={() => { setEditingExpenseId(null); setFormData(emptyForm); setIsCreateDialogOpen(true) }}>
                <IconPlus className="size-4 mr-2" />
                Record Expense
              </Button>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Branch Expenses</CardDescription>
                <CardTitle className="text-2xl">{formatUGX(totalExpenses)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{expenses.length} records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconReceipt2 className="size-5" />
                  All Branch Expenses
                </CardTitle>
                <CardDescription>All expenses recorded for this branch</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded yet.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={getCategoryColor(expense.category)}>
                                {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{(expense.paymentMethod || 'CASH').replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatUGX(expense.amount)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedExpense(expense); setIsViewDialogOpen(true) }}
                                >
                                  <IconEye className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(expense)}
                                >
                                  <IconEdit className="size-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setExpenseToDelete(expense); setIsDeleteDialogOpen(true) }}
                                >
                                  <IconTrash className="size-4 text-destructive" />
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
          </div>
        </div>
      </SidebarInset>

      {/* Create/Edit Expense Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingExpenseId ? "Edit Expense" : "Record Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpenseId ? "Update expense details" : "Record a new expense for the branch"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (UGX) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expenseDate">Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What was this expense for?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receiptNumber">Receipt Number (Optional)</Label>
              <Input
                id="receiptNumber"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})}
                placeholder="Enter receipt number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingExpenseId(null) }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdateExpense} disabled={isSaving}>
              {isSaving ? "Saving..." : editingExpenseId ? "Update Expense" : "Record Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Expense Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{new Date(selectedExpense.expenseDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p><Badge className={getCategoryColor(selectedExpense.category)}>{selectedExpense.category}</Badge></p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-bold text-lg">{formatUGX(selectedExpense.amount)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="font-medium">{selectedExpense.description}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>
                  <p className="font-medium">{(selectedExpense.paymentMethod || 'CASH').replace('_', ' ')}</p>
                </div>
                {selectedExpense.receiptNumber && (
                  <div>
                    <span className="text-muted-foreground">Receipt #:</span>
                    <p className="font-medium">{selectedExpense.receiptNumber}</p>
                  </div>
                )}
                {selectedExpense.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="text-sm">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the expense "{expenseToDelete?.description}" for {formatUGX(expenseToDelete?.amount ?? 0)}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              Delete Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
