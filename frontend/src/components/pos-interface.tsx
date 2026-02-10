import { useState, useEffect } from "react"
import {
  IconMinus,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconUser,
  IconPrinter,
  IconCheck,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useAuth } from "@/context/auth-context"
import { useCompany } from "@/context/CompanyContext"
import { stockApi, categoryApi, customerApi, salesApi, serialApi, type StockItem, type Category, type Customer, type Sale, type SerialNumber as SerialNumberType } from "@/lib/api"
import { toast } from "sonner"

// Format currency in UGX
const formatUGX = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface CartItem {
  id: number
  productId: number
  name: string
  sku: string
  price: number
  quantity: number
  maxStock: number
  requiresSerial: boolean
  serialNumbers: string[]
}

export function POSInterface() {
  const { user } = useAuth()
  const { settings: company } = useCompany()
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Data from API
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Receipt dialog
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)

  // Customer search dialog
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [quickCustomerName, setQuickCustomerName] = useState("")

  // Serial number dialog
  const [isSerialDialogOpen, setIsSerialDialogOpen] = useState(false)
  const [serialDialogStock, setSerialDialogStock] = useState<StockItem | null>(null)
  const [availableSerials, setAvailableSerials] = useState<SerialNumberType[]>([])
  const [selectedSerials, setSelectedSerials] = useState<string[]>([])
  const [serialSearch, setSerialSearch] = useState("")
  const [loadingSerials, setLoadingSerials] = useState(false)

  // Suppress unused variable warnings
  void categories

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
      const [stockData, categoriesData, customersData] = await Promise.all([
        stockApi.getByBranch(user.branchId),
        categoryApi.getAll(),
        customerApi.getAll()
      ])
      setStockItems(stockData.filter(s => s.quantity > 0)) // Only show items in stock
      setCategories(categoriesData)
      setCustomers(customersData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions: string[] = ["all", ...new Set(stockItems.map(s => s.categoryName).filter((c): c is string => !!c))]

  const filteredProducts = stockItems.filter(stock => {
    const matchesSearch = stock.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stock.productSku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || stock.categoryName === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (stock: StockItem) => {
    // If product requires serial numbers, open serial selection dialog
    if (stock.requiresSerial === true) {
      openSerialDialog(stock)
      return
    }

    const existingItem = cart.find(item => item.productId === stock.productId)
    const currentQty = existingItem?.quantity || 0
    
    if (currentQty >= stock.quantity) {
      toast.error(`Only ${stock.quantity} items in stock`)
      return
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === stock.productId)
      if (existing) {
        return prev.map(item =>
          item.productId === stock.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { 
        id: stock.id,
        productId: stock.productId, 
        name: stock.productName, 
        sku: stock.productSku, 
        price: stock.sellingPrice, 
        quantity: 1,
        maxStock: stock.quantity,
        requiresSerial: false,
        serialNumbers: []
      }]
    })
  }

  const openSerialDialog = async (stock: StockItem) => {
    if (!user?.branchId) return
    setSerialDialogStock(stock)
    setSelectedSerials([])
    setSerialSearch("")
    setIsSerialDialogOpen(true)
    setLoadingSerials(true)
    try {
      const serials = await serialApi.getAvailable(stock.productId, user.branchId)
      setAvailableSerials(serials)
    } catch (error) {
      console.error("Failed to load serial numbers:", error)
      toast.error("Failed to load serial numbers")
      setAvailableSerials([])
    } finally {
      setLoadingSerials(false)
    }
  }

  const toggleSerial = (serial: string) => {
    setSelectedSerials(prev => 
      prev.includes(serial) ? prev.filter(s => s !== serial) : [...prev, serial]
    )
  }

  const confirmSerialSelection = () => {
    if (!serialDialogStock || selectedSerials.length === 0) {
      toast.error("Please select at least one serial number")
      return
    }

    const stock = serialDialogStock
    setCart(prev => {
      const existing = prev.find(item => item.productId === stock.productId)
      if (existing) {
        // Replace serials entirely for this product
        return prev.map(item =>
          item.productId === stock.productId
            ? { ...item, quantity: selectedSerials.length, serialNumbers: selectedSerials }
            : item
        )
      }
      return [...prev, {
        id: stock.id,
        productId: stock.productId,
        name: stock.productName,
        sku: stock.productSku,
        price: stock.sellingPrice,
        quantity: selectedSerials.length,
        maxStock: stock.quantity,
        requiresSerial: true,
        serialNumbers: selectedSerials
      }]
    })
    setIsSerialDialogOpen(false)
    setSerialDialogStock(null)
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        // Don't allow quantity changes for serialized products via +/- buttons
        if (item.requiresSerial) {
          toast.error("Use serial number selection to change quantity")
          return item
        }
        const newQty = item.quantity + delta
        if (newQty > item.maxStock) {
          toast.error(`Only ${item.maxStock} items in stock`)
          return item
        }
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId))
  }

  const updatePrice = (productId: number, newPrice: number) => {
    if (newPrice < 0) return
    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, price: newPrice } : item
    ))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setQuickCustomerName("")
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal

  const handleCheckout = async (paymentMethod: string) => {
    if (!user?.branchId || cart.length === 0) return

    setIsProcessing(true)
    try {
      const sale = await salesApi.create({
        branchId: user.branchId,
        customerId: selectedCustomer?.id,
        customerName: !selectedCustomer && quickCustomerName.trim() ? quickCustomerName.trim() : undefined,
        paymentMethod: paymentMethod.toUpperCase(),
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price, // Send the (possibly modified) price
          serialNumbers: item.requiresSerial && item.serialNumbers.length > 0 ? item.serialNumbers : undefined
        }))
      })
      
      toast.success("Sale completed successfully!")
      setCompletedSale(sale)
      setIsReceiptDialogOpen(true)
      clearCart()
      loadData() // Refresh stock
    } catch (error) {
      console.error("Checkout failed:", error)
      toast.error("Failed to process sale. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  )

  const handlePrintReceipt = () => {
    const receiptContent = document.getElementById('receipt-content')
    if (!receiptContent || !completedSale) return

    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) {
      toast.error('Please allow popups to print receipt')
      return
    }

    const amountPaid = completedSale.amountPaid || completedSale.grandTotal
    const changeDue = amountPaid - completedSale.grandTotal

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${completedSale.saleNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 15px;
            width: 80mm;
            margin: 0 auto;
            color: #000;
          }
          .receipt-container { padding: 5px 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .dashed-line { border-top: 1px dashed #000; margin: 7px 0; }
          h2 { font-size: 22px; margin: 0 0 2px 0; letter-spacing: 1px; }
          .shop-info { font-size: 13px; line-height: 1.4; margin-bottom: 4px; }
          .receipt-meta { font-size: 13px; line-height: 1.5; }
          .receipt-meta td { padding: 1px 0; }
          table.items-table { width: 100%; border-collapse: collapse; font-size: 14px; }
          table.items-table th { font-size: 13px; text-align: left; padding: 3px 2px; border-bottom: 1px dashed #000; }
          table.items-table th.qty { text-align: center; width: 34px; }
          table.items-table th.price, table.items-table th.amt { text-align: right; width: 78px; }
          .item-name-row td { padding: 4px 2px 0 2px; font-weight: bold; font-size: 14px; }
          .item-detail-row td { padding: 0 2px 2px 2px; font-size: 14px; }
          .item-detail-row td.qty { text-align: center; }
          .item-detail-row td.price, .item-detail-row td.amt { text-align: right; }
          .serial-row td { padding: 0 2px 3px 6px; font-size: 12px; font-weight: bold; }
          .totals-table { width: 100%; font-size: 15px; margin-top: 4px; }
          .totals-table td { padding: 2px 2px; }
          .totals-table td:last-child { text-align: right; }
          .grand-total td { font-size: 20px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 2px; }
          .footer { font-size: 13px; text-align: center; margin-top: 8px; line-height: 1.5; }
          .footer .policy { font-weight: bold; font-size: 14px; margin-top: 4px; }
          @media print {
            body { width: 80mm; margin: 0; }
            .receipt-container { padding: 2px 5px; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center">
            <h2 class="bold">${company.companyName}</h2>
            <div class="shop-info">
              ${completedSale.branchAddress ? `<div>${completedSale.branchAddress}</div>` : (company.address ? `<div>${company.address}</div>` : '')}
              ${completedSale.branchPhone ? `<div>Tel: ${completedSale.branchPhone}</div>` : (company.phone ? `<div>Tel: ${company.phone}</div>` : '')}
            </div>
          </div>

          <div class="dashed-line"></div>

          <table class="receipt-meta" style="width:100%">
            <tr><td class="bold">Receipt #:</td><td class="text-right">${completedSale.saleNumber}</td></tr>
            <tr><td class="bold">Date:</td><td class="text-right">${new Date(completedSale.createdAt || completedSale.saleDate).toLocaleString('en-UG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Africa/Nairobi' })}</td></tr>
            <tr><td class="bold">Cashier:</td><td class="text-right">${completedSale.userName || ''}</td></tr>
            ${completedSale.customerName ? `<tr><td class="bold">Customer:</td><td class="text-right">${completedSale.customerName}</td></tr>` : ''}
            <tr><td class="bold">Branch:</td><td class="text-right">${completedSale.branchName || ''}</td></tr>
            <tr><td class="bold">Payment:</td><td class="text-right">${completedSale.paymentMethod.replace('_', ' ')}</td></tr>
          </table>

          <div class="dashed-line"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th class="qty">QTY</th>
                <th class="price">PRICE</th>
                <th class="amt">AMT</th>
              </tr>
            </thead>
            <tbody>
              ${completedSale.items.map(item => `
                <tr class="item-name-row">
                  <td colspan="4">${item.productName}</td>
                </tr>
                ${item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers.map(sn => `
                  <tr class="serial-row"><td colspan="4">SN: ${sn}</td></tr>
                `).join('') : ''}
                <tr class="item-detail-row">
                  <td></td>
                  <td class="qty">${item.quantity}</td>
                  <td class="price">${(item.unitPrice || 0).toLocaleString()}</td>
                  <td class="amt">${item.totalPrice.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="dashed-line"></div>

          <table class="totals-table">
            <tr>
              <td class="bold">Subtotal:</td>
              <td>UGX ${completedSale.totalAmount.toLocaleString()}</td>
            </tr>
            ${completedSale.discountAmount > 0 ? `
              <tr>
                <td class="bold">Discount:</td>
                <td>-UGX ${completedSale.discountAmount.toLocaleString()}</td>
              </tr>
            ` : ''}
            <tr class="grand-total">
              <td>GRAND TOTAL:</td>
              <td>UGX ${completedSale.grandTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="bold">Paid:</td>
              <td>UGX ${amountPaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="bold">Change:</td>
              <td>UGX ${changeDue.toLocaleString()}</td>
            </tr>
          </table>

          <div class="dashed-line"></div>

          <div class="footer">
            <div>${company.receiptFooter}</div>
            <div>${company.receiptTagline}</div>
            <div class="policy">Goods Once Sold Are Not Returnable</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; setTimeout(function() { window.close(); }, 2000); }</script>
      </body>
      </html>
    `

    printWindow.document.write(receiptHtml)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products List Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {stockItems.length === 0 ? "No products in stock" : "No products match your search"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(stock => (
                  <TableRow
                    key={stock.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => addToCart(stock)}
                  >
                    <TableCell className="font-medium">{stock.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{stock.productSku}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{stock.categoryName}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatUGX(stock.sellingPrice)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={stock.quantity > 10 ? "secondary" : "destructive"}>
                        {stock.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCart(stock)
                        }}
                      >
                        <IconPlus className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cart Section */}
      <Card className="w-96 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <IconShoppingCart className="size-5" />
              Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Clear
              </Button>
            )}
          </div>
          
          {/* Customer Selection */}
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              <Input
                placeholder="Customer name (optional)"
                value={selectedCustomer ? selectedCustomer.name : quickCustomerName}
                onChange={(e) => {
                  if (selectedCustomer) {
                    setSelectedCustomer(null)
                  }
                  setQuickCustomerName(e.target.value)
                }}
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setIsCustomerDialogOpen(true)}
                title="Select existing customer"
              >
                <IconUser className="size-4" />
              </Button>
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Loyalty customer</span>
                {selectedCustomer.phone && <span>• {selectedCustomer.phone}</span>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-4 ml-auto"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <IconTrash className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <IconShoppingCart className="size-12 mb-2" />
              <p>Cart is empty</p>
              <p className="text-sm">Click products to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.requiresSerial && item.serialNumbers.length > 0 && (
                      <p className="text-xs text-blue-600 font-mono truncate" title={item.serialNumbers.join(', ')}>
                        S/N: {item.serialNumbers.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>UGX</span>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                        className="h-5 w-20 px-1 py-0 text-xs"
                        min={0}
                      />
                      <span>each</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      <IconMinus className="size-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      <IconPlus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <IconTrash className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <Separator />

        <CardFooter className="flex-col gap-3 p-4">
          {/* Totals */}
          <div className="w-full space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatUGX(subtotal)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatUGX(total)}</span>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="w-full grid grid-cols-3 gap-2">
            <Button
              className="flex-col h-16 gap-1"
              onClick={() => handleCheckout("CASH")}
              disabled={cart.length === 0 || isProcessing}
            >
              <IconCash className="size-5" />
              <span className="text-xs">Cash</span>
            </Button>
            <Button
              variant="secondary"
              className="flex-col h-16 gap-1 opacity-50"
              disabled={true}
              title="Card payments coming soon"
            >
              <IconCreditCard className="size-5" />
              <span className="text-xs">Card</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-16 gap-1 opacity-50"
              disabled={true}
              title="Mobile Money coming soon"
            >
              <IconDeviceMobile className="size-5" />
              <span className="text-xs">Mobile</span>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Customer Selection Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer or leave as walk-in
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-auto space-y-1">
              <Button
                variant={!selectedCustomer ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedCustomer(null)
                  setIsCustomerDialogOpen(false)
                }}
              >
                <IconUser className="size-4 mr-2" />
                Walk-in Customer
              </Button>
              {filteredCustomers.map(customer => (
                <Button
                  key={customer.id}
                  variant={selectedCustomer?.id === customer.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedCustomer(customer)
                    setIsCustomerDialogOpen(false)
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span>{customer.name}</span>
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCheck className="size-5 text-green-500" />
              Sale Complete!
            </DialogTitle>
          </DialogHeader>
          {completedSale && (
            <div className="space-y-4" id="receipt-content" style={{ fontSize: '2.16em' }}>
              <div className="text-center border-b pb-4">
                <h3 className="font-bold text-lg">{company.companyName}</h3>
                <p className="text-sm font-medium">{completedSale.branchName}</p>
                <p className="text-xs font-medium">
                  {new Date(completedSale.createdAt || completedSale.saleDate).toLocaleString('en-UG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Africa/Nairobi' })}
                </p>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Receipt #:</span>
                  <span className="font-semibold font-mono">{completedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cashier:</span>
                  <span className="font-semibold">{completedSale.userName}</span>
                </div>
                {completedSale.customerName && (
                  <div className="flex justify-between">
                    <span className="font-medium">Customer:</span>
                    <span className="font-semibold">{completedSale.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Payment:</span>
                  <span className="font-semibold capitalize">{completedSale.paymentMethod.replace('_', ' ').toLowerCase()}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                {completedSale.items.map(item => (
                  <div key={item.id} className="text-sm border-b border-dashed pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                    <p className="font-semibold">{item.productName}</p>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="font-medium">{item.quantity} x {formatUGX(item.unitPrice || 0)}</span>
                      <span className="font-bold text-sm">{formatUGX(item.totalPrice)}</span>
                    </div>
                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                      <div className="mt-1 pl-2 border-l-2 border-foreground/30">
                        <p className="text-xs font-semibold">S/N:</p>
                        {item.serialNumbers.map((sn, idx) => (
                          <p key={idx} className="text-xs font-mono font-medium">{sn}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>Subtotal</span>
                  <span>{formatUGX(completedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatUGX(completedSale.grandTotal)}</span>
                </div>
              </div>

              <div className="text-center text-xs font-medium pt-4 border-t">
                {company.receiptFooter}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrintReceipt}>
              <IconPrinter className="size-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Serial Number Selection Dialog */}
      <Dialog open={isSerialDialogOpen} onOpenChange={setIsSerialDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Serial Numbers</DialogTitle>
            <DialogDescription>
              {serialDialogStock?.productName} — Select serial numbers to add to cart
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search serial numbers..."
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
            />
            {selectedSerials.length > 0 && (
              <div className="text-sm font-medium">
                Selected: {selectedSerials.length} serial number{selectedSerials.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="max-h-60 overflow-auto space-y-1 border rounded-md p-2">
              {loadingSerials ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : availableSerials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No serial numbers available for this product
                </div>
              ) : (
                availableSerials
                  .filter(s => s.serialNumber.toLowerCase().includes(serialSearch.toLowerCase()))
                  .map(serial => (
                    <div
                      key={serial.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedSerials.includes(serial.serialNumber) ? 'bg-primary/10 border border-primary/30' : ''
                      }`}
                      onClick={() => toggleSerial(serial.serialNumber)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSerials.includes(serial.serialNumber)}
                        onChange={() => toggleSerial(serial.serialNumber)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <span className="font-mono text-sm font-medium">{serial.serialNumber}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">IN STOCK</Badge>
                    </div>
                  ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSerialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSerialSelection} disabled={selectedSerials.length === 0}>
              Add {selectedSerials.length || ''} to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
