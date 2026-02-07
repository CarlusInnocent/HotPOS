import { GalleryVerticalEnd } from "lucide-react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import { LoginForm } from "@/components/login-form"
import { AuthProvider } from "@/context/AuthContext"
import { useAuth } from "@/context/auth-context"
import { CompanyProvider } from "@/context/CompanyContext"
import { Toaster } from "@/components/ui/sonner"

// Lazy load all pages for code splitting
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })))
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage").then(m => ({ default: m.AdminDashboardPage })))
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const InventoryPage = lazy(() => import("@/pages/InventoryPage").then(m => ({ default: m.InventoryPage })))
const PurchasesPage = lazy(() => import("@/pages/PurchasesPage").then(m => ({ default: m.PurchasesPage })))
const SalesPage = lazy(() => import("@/pages/SalesPage").then(m => ({ default: m.SalesPage })))
const TransfersPage = lazy(() => import("@/pages/TransfersPage").then(m => ({ default: m.TransfersPage })))
const BranchesPage = lazy(() => import("@/pages/BranchesPage").then(m => ({ default: m.BranchesPage })))
const UsersPage = lazy(() => import("@/pages/UsersPage").then(m => ({ default: m.UsersPage })))
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })))
const CustomersPage = lazy(() => import("@/pages/CustomersPage").then(m => ({ default: m.CustomersPage })))
const SuppliersPage = lazy(() => import("@/pages/SuppliersPage").then(m => ({ default: m.SuppliersPage })))
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })))
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage").then(m => ({ default: m.ExpensesPage })))
const ReturnsPage = lazy(() => import("@/pages/ReturnsPage").then(m => ({ default: m.ReturnsPage })))
const RefundsPage = lazy(() => import("@/pages/RefundsPage").then(m => ({ default: m.RefundsPage })))
const POSPage = lazy(() => import("@/pages/POSPage"))

// Cashier-specific pages
const CashierSalesPage = lazy(() => import("@/pages/cashier/CashierSalesPage").then(m => ({ default: m.CashierSalesPage })))
const CashierRefundsPage = lazy(() => import("@/pages/cashier/CashierRefundsPage").then(m => ({ default: m.CashierRefundsPage })))
const CashierHistoryPage = lazy(() => import("@/pages/cashier/CashierHistoryPage").then(m => ({ default: m.CashierHistoryPage })))
const CashierReturnsPage = lazy(() => import("@/pages/cashier/CashierReturnsPage").then(m => ({ default: m.CashierReturnsPage })))
const CashierExpensesPage = lazy(() => import("@/pages/cashier/CashierExpensesPage").then(m => ({ default: m.CashierExpensesPage })))
const CashierPurchasesPage = lazy(() => import("@/pages/cashier/CashierPurchasesPage").then(m => ({ default: m.CashierPurchasesPage })))
const CashierProductsPage = lazy(() => import("@/pages/cashier/CashierProductsPage").then(m => ({ default: m.CashierProductsPage })))
const CashierCategoriesPage = lazy(() => import("@/pages/cashier/CashierCategoriesPage").then(m => ({ default: m.CashierCategoriesPage })))
const CashierSettingsPage = lazy(() => import("@/pages/cashier/CashierSettingsPage").then(m => ({ default: m.CashierSettingsPage })))
const CashierTransfersPage = lazy(() => import("@/pages/cashier/CashierTransfersPage").then(m => ({ default: m.CashierTransfersPage })))
const CashierSerialAnalyticsPage = lazy(() => import("@/pages/cashier/CashierSerialAnalyticsPage").then(m => ({ default: m.CashierSerialAnalyticsPage })))

// Manager-specific pages
const ManagerSalesPage = lazy(() => import("@/pages/manager/ManagerSalesPage").then(m => ({ default: m.ManagerSalesPage })))
const ManagerHistoryPage = lazy(() => import("@/pages/manager/ManagerHistoryPage").then(m => ({ default: m.ManagerHistoryPage })))
const ManagerExpensesPage = lazy(() => import("@/pages/manager/ManagerExpensesPage").then(m => ({ default: m.ManagerExpensesPage })))
const ManagerPurchasesPage = lazy(() => import("@/pages/manager/ManagerPurchasesPage").then(m => ({ default: m.ManagerPurchasesPage })))
const ManagerProductsPage = lazy(() => import("@/pages/manager/ManagerProductsPage").then(m => ({ default: m.ManagerProductsPage })))
const ManagerCategoriesPage = lazy(() => import("@/pages/manager/ManagerCategoriesPage").then(m => ({ default: m.ManagerCategoriesPage })))
const ManagerReturnsPage = lazy(() => import("@/pages/manager/ManagerReturnsPage").then(m => ({ default: m.ManagerReturnsPage })))
const ManagerRefundsPage = lazy(() => import("@/pages/manager/ManagerRefundsPage").then(m => ({ default: m.ManagerRefundsPage })))
const ManagerSettingsPage = lazy(() => import("@/pages/manager/ManagerSettingsPage").then(m => ({ default: m.ManagerSettingsPage })))
const ManagerAnalyticsPage = lazy(() => import("@/pages/manager/ManagerAnalyticsPage").then(m => ({ default: m.ManagerAnalyticsPage })))
const ManagerTransfersPage = lazy(() => import("@/pages/manager/ManagerTransfersPage").then(m => ({ default: m.ManagerTransfersPage })))
const ManagerSerialNumbersPage = lazy(() => import("@/pages/manager/ManagerSerialNumbersPage").then(m => ({ default: m.ManagerSerialNumbersPage })))
const AdminSerialNumbersPage = lazy(() => import("@/pages/admin/AdminSerialNumbersPage").then(m => ({ default: m.AdminSerialNumbersPage })))

// Loading spinner for lazy loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === "CASHIER") {
      return <Navigate to="/pos" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function LoginPage() {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === "CASHIER") {
      return <Navigate to="/pos" replace />
    }
    if (user?.role === "ADMIN") {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            HOTLINES
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Cashier POS */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <POSPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/sales"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierSalesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/refunds"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierRefundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/history"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/returns"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierReturnsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/expenses"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/purchases"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierPurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/products"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/categories"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierCategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/settings"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/transfers"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierTransfersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos/serial-analytics"
        element={
          <ProtectedRoute allowedRoles={["CASHIER", "MANAGER", "ADMIN"]}>
            <CashierSerialAnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Manager/Stock Keeper Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["MANAGER", "STOCK_KEEPER"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/sales"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerSalesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/history"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/expenses"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/purchases"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerPurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/products"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/categories"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerCategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/returns"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerReturnsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/refunds"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerRefundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/transfers"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerTransfersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/serial-numbers"
        element={
          <ProtectedRoute allowedRoles={["MANAGER", "STOCK_KEEPER"]}>
            <ManagerSerialNumbersPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "STOCK_KEEPER"]}>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/purchases"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <PurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sales"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <SalesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transfers"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "STOCK_KEEPER"]}>
            <TransfersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/branches"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <BranchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <CustomersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/suppliers"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/expenses"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "STOCK_KEEPER"]}>
            <ReturnsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/refunds"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
            <RefundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/serial-numbers"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminSerialNumbersPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <Toaster richColors position="top-right" />
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
