import axios from 'axios';

const API_BASE_URL = `http://${window.location.hostname}:8081/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 errors - redirect to login for auth issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const hadToken = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (hadToken && !window.location.pathname.includes('/login')) {
        // Check if this was a session takeover from another device
        const isSessionExpired = error.response?.data?.sessionExpired;
        if (isSessionExpired) {
          localStorage.setItem('sessionExpiredMsg', 'You were logged out because your account was signed in on another device.');
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ TYPES ============

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  branchId: number;
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STOCK_KEEPER';
  phone?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  branchId: number;
  branchName: string;
}

// Branch types
export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parentName?: string;
  isActive: boolean;
}

// Product types
export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  sku: string;
  description?: string;
  unitOfMeasure?: string;
  sellingPrice: number;
  taxRate?: number;
  reorderLevel?: number;
  requiresSerial: boolean;
  isActive: boolean;
}

// Stock types
export interface StockItem {
  id: number;
  branchId: number;
  branchName: string;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  lastStockDate?: string;
  categoryName?: string;
  requiresSerial?: boolean;
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt?: string;
}

// Supplier types
export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

// Sale types
export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalPrice: number;
  serialNumbers?: string[];
}

export interface Sale {
  id: number;
  branchId: number;
  branchName: string;
  branchCode?: string;
  branchAddress?: string;
  branchPhone?: string;
  referenceNumber?: string;
  referenceSequence?: number;
  userId: number;
  userName: string;
  customerId?: number;
  customerName?: string;
  saleNumber: string;
  saleDate: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  amountPaid?: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  items: SaleItem[];
  createdAt?: string;
  refundStatus?: string; // NONE, PARTIAL, FULL
  refundedAmount?: number;
}

export interface CreateSaleItem {
  productId: number;
  quantity: number;
  unitPrice?: number; // Optional custom price - if not provided, uses default
  serialNumbers?: string[];
}

export interface CreateSale {
  branchId: number;
  customerId?: number;
  customerName?: string;
  paymentMethod: string;
  items: CreateSaleItem[];
}

// Purchase types
export interface PurchaseItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitCost: number;
  sellingPrice?: number;
  totalCost: number;
}

export interface Purchase {
  id: number;
  branchId: number;
  branchName: string;
  supplierId: number;
  supplierName: string;
  userId: number;
  userName: string;
  purchaseNumber: string;
  purchaseDate: string;
  totalAmount: number;
  status: string;
  notes?: string;
  items: PurchaseItem[];
}

// Transfer types
export interface TransferItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface Transfer {
  id: number;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  requestedById: number;
  requestedByName: string;
  approvedById?: number;
  approvedByName?: string;
  transferNumber: string;
  transferDate: string;
  status: string;
  notes?: string;
  items: TransferItem[];
}

// Expense types
export interface Expense {
  id: number;
  branchId: number;
  branchName: string;
  userId: number;
  userName: string;
  expenseNumber?: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  expenseDate: string;
  receiptNumber?: string;
  notes?: string;
  createdAt?: string;
}

// Return types (returns to suppliers)
export interface ReturnItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason?: string;
}

export interface Return {
  id: number;
  branchId: number;
  branchName: string;
  supplierId: number;
  supplierName: string;
  purchaseId?: number;
  purchaseNumber?: string;
  userId: number;
  userName: string;
  returnNumber: string;
  returnDate: string;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  items: ReturnItem[];
  createdAt: string;
}

export interface CreateReturnItem {
  productId: number;
  quantity: number;
  unitCost: number;
  reason?: string;
}

export interface CreateReturn {
  branchId: number;
  supplierId: number;
  purchaseId?: number;
  reason: string;
  items: CreateReturnItem[];
}

// Refund types (refunds to customers)
export interface RefundItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string;
}

export interface Refund {
  id: number;
  branchId: number;
  branchName: string;
  customerId?: number;
  customerName?: string;
  saleId?: number;
  saleNumber?: string;
  userId: number;
  userName: string;
  refundNumber: string;
  refundDate: string;
  totalAmount: number;
  refundMethod: 'cash' | 'card' | 'mobile_money' | 'credit' | 'bank_transfer';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  items: RefundItem[];
  createdAt: string;
}

export interface CreateRefundItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateRefund {
  branchId: number;
  customerId?: number;
  saleId?: number;
  reason: string;
  refundMethod: string; // CASH, CARD, MOBILE_MONEY, CREDIT, BANK_TRANSFER
  items: CreateRefundItem[];
}

// User types
export interface User {
  id: number;
  branchId: number;
  branchName: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalSalesToday: number;
  totalSalesThisMonth: number;
  totalSalesThisYear: number;
  transactionCountToday: number;
  transactionCountThisMonth: number;
  averageTransactionValue: number;
  topSellingProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  lowStockItems: StockItem[];
  recentSales: Sale[];
  salesByPaymentMethod: Record<string, number>;
  totalExpensesThisMonth: number;
  netProfitThisMonth: number;
}

// ============ API SERVICES ============

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
  },
};

// Branch API
export const branchApi = {
  getAll: async (): Promise<Branch[]> => {
    const response = await api.get<Branch[]>('/branches');
    return response.data;
  },

  getById: async (id: number): Promise<Branch> => {
    const response = await api.get<Branch>(`/branches/${id}`);
    return response.data;
  },

  create: async (data: Partial<Branch>): Promise<Branch> => {
    const response = await api.post<Branch>('/branches', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Branch>): Promise<Branch> => {
    const response = await api.put<Branch>(`/branches/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/branches/${id}`);
  },
};

// Category API
export const categoryApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Category>): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// Product API
export const productApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products');
    return response.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  getByCategory: async (categoryId: number): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/category/${categoryId}`);
    return response.data;
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await api.post<Product>('/products', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};

// Stock API
export const stockApi = {
  getByBranch: async (branchId: number): Promise<StockItem[]> => {
    const response = await api.get<StockItem[]>(`/stock/branch/${branchId}`);
    return response.data;
  },

  getByProduct: async (productId: number): Promise<StockItem[]> => {
    const response = await api.get<StockItem[]>(`/stock/product/${productId}`);
    return response.data;
  },

  getLowStock: async (branchId: number): Promise<StockItem[]> => {
    const response = await api.get<StockItem[]>(`/stock/branch/${branchId}/low`);
    return response.data;
  },

  updateStock: async (branchId: number, productId: number, data: {
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    reorderLevel?: number;
  }): Promise<StockItem> => {
    const response = await api.post<StockItem>(`/stock/${branchId}/${productId}`, data);
    return response.data;
  },
};

// Customer API
export const customerApi = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  search: async (query: string): Promise<Customer[]> => {
    const response = await api.get<Customer[]>(`/customers/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  create: async (data: Partial<Customer>): Promise<Customer> => {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Customer>): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};

// Supplier API
export const supplierApi = {
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get<Supplier[]>('/suppliers');
    return response.data;
  },

  getById: async (id: number): Promise<Supplier> => {
    const response = await api.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.post<Supplier>('/suppliers', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};

// Sales API
export const salesApi = {
  getByBranch: async (branchId: number): Promise<Sale[]> => {
    const response = await api.get<Sale[]>(`/sales/branch/${branchId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Sale> => {
    const response = await api.get<Sale>(`/sales/${id}`);
    return response.data;
  },

  getByDateRange: async (branchId: number, startDate: string, endDate: string): Promise<Sale[]> => {
    const response = await api.get<Sale[]>(`/sales/branch/${branchId}/range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  create: async (data: CreateSale): Promise<Sale> => {
    const response = await api.post<Sale>('/sales', data);
    return response.data;
  },

  refund: async (id: number): Promise<Sale> => {
    const response = await api.post<Sale>(`/sales/${id}/refund`);
    return response.data;
  },

  getBySaleNumber: async (saleNumber: string): Promise<Sale> => {
    const response = await api.get<Sale>(`/sales/number/${saleNumber}`);
    return response.data;
  },
};

// Purchase API
export const purchaseApi = {
  getByBranch: async (branchId: number): Promise<Purchase[]> => {
    const response = await api.get<Purchase[]>(`/purchases/branch/${branchId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Purchase> => {
    const response = await api.get<Purchase>(`/purchases/${id}`);
    return response.data;
  },

  create: async (data: {
    branchId: number;
    supplierId: number;
    paymentMethod?: string;
    notes?: string;
    items: Array<{ productId: number; quantity: number; unitCost?: number; serialNumbers?: string[] }>;
  }): Promise<Purchase> => {
    const response = await api.post<Purchase>('/purchases', {
      ...data,
      paymentMethod: data.paymentMethod || 'CASH'
    });
    return response.data;
  },

  receive: async (id: number, items?: Array<{ productId: number; sellingPrice?: number; serialNumbers?: string[] }>): Promise<Purchase> => {
    const response = await api.post<Purchase>(`/purchases/${id}/receive`, items ? { items } : undefined);
    return response.data;
  },
};

// Transfer API
export const transferApi = {
  getFromBranch: async (branchId: number): Promise<Transfer[]> => {
    const response = await api.get<Transfer[]>(`/transfers/from/${branchId}`);
    return response.data;
  },

  getToBranch: async (branchId: number): Promise<Transfer[]> => {
    const response = await api.get<Transfer[]>(`/transfers/to/${branchId}`);
    return response.data;
  },

  getPending: async (branchId: number): Promise<Transfer[]> => {
    const response = await api.get<Transfer[]>(`/transfers/pending/${branchId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Transfer> => {
    const response = await api.get<Transfer>(`/transfers/${id}`);
    return response.data;
  },

  create: async (data: {
    fromBranchId: number;
    toBranchId: number;
    notes?: string;
    items: Array<{ productId: number; quantity: number }>;
  }): Promise<Transfer> => {
    const response = await api.post<Transfer>('/transfers', data);
    return response.data;
  },

  approve: async (id: number): Promise<Transfer> => {
    const response = await api.post<Transfer>(`/transfers/${id}/approve`);
    return response.data;
  },

  reject: async (id: number): Promise<Transfer> => {
    const response = await api.post<Transfer>(`/transfers/${id}/reject`);
    return response.data;
  },

  send: async (id: number): Promise<Transfer> => {
    const response = await api.post<Transfer>(`/transfers/${id}/send`);
    return response.data;
  },

  receive: async (id: number): Promise<Transfer> => {
    const response = await api.post<Transfer>(`/transfers/${id}/receive`);
    return response.data;
  },
};

// Expense API
export const expenseApi = {
  getByBranch: async (branchId: number): Promise<Expense[]> => {
    const response = await api.get<Expense[]>(`/expenses/branch/${branchId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Expense> => {
    const response = await api.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  create: async (data: Partial<Expense>): Promise<Expense> => {
    const response = await api.post<Expense>('/expenses', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Expense>): Promise<Expense> => {
    const response = await api.put<Expense>(`/expenses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};

// User API
export const userApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  getByBranch: async (branchId: number): Promise<User[]> => {
    const response = await api.get<User[]>(`/users/branch/${branchId}`);
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  create: async (data: {
    branchId: number;
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
  }): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  changePassword: async (id: number, data: { currentPassword?: string; newPassword: string }): Promise<void> => {
    await api.post(`/users/${id}/change-password`, { newPassword: data.newPassword });
  },

  deactivate: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Return API (returns to suppliers)
export const returnApi = {
  getAll: async (): Promise<Return[]> => {
    const response = await api.get<Return[]>('/returns');
    return response.data;
  },

  getByBranch: async (branchId: number): Promise<Return[]> => {
    const response = await api.get<Return[]>(`/returns/branch/${branchId}`);
    return response.data;
  },

  getBySupplier: async (supplierId: number): Promise<Return[]> => {
    const response = await api.get<Return[]>(`/returns/supplier/${supplierId}`);
    return response.data;
  },

  getByPurchase: async (purchaseId: number): Promise<Return[]> => {
    const response = await api.get<Return[]>(`/returns/purchase/${purchaseId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Return> => {
    const response = await api.get<Return>(`/returns/${id}`);
    return response.data;
  },

  create: async (data: CreateReturn): Promise<Return> => {
    const response = await api.post<Return>('/returns', data);
    return response.data;
  },

  approve: async (id: number): Promise<Return> => {
    const response = await api.post<Return>(`/returns/${id}/approve`);
    return response.data;
  },

  reject: async (id: number): Promise<Return> => {
    const response = await api.post<Return>(`/returns/${id}/reject`);
    return response.data;
  },
};

// Refund API (refunds to customers)
export const refundApi = {
  getAll: async (): Promise<Refund[]> => {
    const response = await api.get<Refund[]>('/refunds');
    return response.data;
  },

  getByBranch: async (branchId: number): Promise<Refund[]> => {
    const response = await api.get<Refund[]>(`/refunds/branch/${branchId}`);
    return response.data;
  },

  getByCustomer: async (customerId: number): Promise<Refund[]> => {
    const response = await api.get<Refund[]>(`/refunds/customer/${customerId}`);
    return response.data;
  },

  getBySale: async (saleId: number): Promise<Refund[]> => {
    const response = await api.get<Refund[]>(`/refunds/sale/${saleId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Refund> => {
    const response = await api.get<Refund>(`/refunds/${id}`);
    return response.data;
  },

  create: async (data: CreateRefund): Promise<Refund> => {
    const response = await api.post<Refund>('/refunds', data);
    return response.data;
  },

  approve: async (id: number): Promise<Refund> => {
    const response = await api.post<Refund>(`/refunds/${id}/approve`);
    return response.data;
  },

  reject: async (id: number): Promise<Refund> => {
    const response = await api.post<Refund>(`/refunds/${id}/reject`);
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (branchId?: number): Promise<DashboardStats> => {
    const url = branchId ? `/dashboard/stats?branchId=${branchId}` : '/dashboard/stats';
    const response = await api.get<DashboardStats>(url);
    return response.data;
  },
};

// Company Settings types
export interface CompanySettings {
  id?: number;
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  taxId?: string;
  receiptFooter: string;
  receiptTagline: string;
  currencySymbol: string;
  updatedAt?: string;
}

// Serial Number types
export interface SerialNumber {
  id: number;
  stockItemId: number;
  productId: number;
  productName: string;
  productSku: string;
  serialNumber: string;
  status: 'IN_STOCK' | 'SOLD' | 'TRANSFERRED' | 'RETURNED' | 'DEFECTIVE';
  purchaseId?: number;
  purchaseNumber?: string;
  saleId?: number;
  saleNumber?: string;
  branchId: number;
  branchName: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Company Settings API
export const companySettingsApi = {
  get: async (): Promise<CompanySettings> => {
    const response = await api.get<CompanySettings>('/company-settings');
    return response.data;
  },
  update: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const response = await api.put<CompanySettings>('/company-settings', data);
    return response.data;
  },
};

// Serial Number API
export const serialApi = {
  getByBranch: async (branchId: number): Promise<SerialNumber[]> => {
    const response = await api.get<SerialNumber[]>(`/serial-numbers/branch/${branchId}`);
    return response.data;
  },

  getAllByBranch: async (branchId: number, status?: string): Promise<SerialNumber[]> => {
    const url = status 
      ? `/serial-numbers/branch/${branchId}/all?status=${status}`
      : `/serial-numbers/branch/${branchId}/all`;
    const response = await api.get<SerialNumber[]>(url);
    return response.data;
  },

  getAvailable: async (productId: number, branchId: number): Promise<SerialNumber[]> => {
    const response = await api.get<SerialNumber[]>(`/serial-numbers/available?productId=${productId}&branchId=${branchId}`);
    return response.data;
  },

  lookup: async (serialNumber: string): Promise<SerialNumber> => {
    const response = await api.get<SerialNumber>(`/serial-numbers/lookup/${encodeURIComponent(serialNumber)}`);
    return response.data;
  },

  getByPurchase: async (purchaseId: number): Promise<SerialNumber[]> => {
    const response = await api.get<SerialNumber[]>(`/serial-numbers/purchase/${purchaseId}`);
    return response.data;
  },

  getBySale: async (saleId: number): Promise<SerialNumber[]> => {
    const response = await api.get<SerialNumber[]>(`/serial-numbers/sale/${saleId}`);
    return response.data;
  },

  updateStatus: async (id: number, status: string, notes?: string): Promise<SerialNumber> => {
    const params = new URLSearchParams({ status });
    if (notes) params.append('notes', notes);
    const response = await api.put<SerialNumber>(`/serial-numbers/${id}/status?${params.toString()}`);
    return response.data;
  },

  getStats: async (branchId: number): Promise<{ total: number; inStock: number; sold: number; transferred: number; returned: number; defective: number }> => {
    const response = await api.get(`/serial-numbers/stats/${branchId}`);
    return response.data;
  },
};

export default api;
