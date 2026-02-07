import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/CompanyContext';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { settings: company } = useCompany();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md font-bold">
              H
            </div>
            <span className="font-semibold text-lg">{company.companyName}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{user?.fullName}</span>
              <span className="mx-2">•</span>
              <span>{user?.branchName}</span>
              <span className="mx-2">•</span>
              <span className="capitalize">{user?.role.toLowerCase()}</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at {user?.branchName} today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Today's Sales</div>
            <div className="text-2xl font-bold mt-2">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">+0% from yesterday</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Orders</div>
            <div className="text-2xl font-bold mt-2">0</div>
            <p className="text-xs text-muted-foreground mt-1">0 pending</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Low Stock Items</div>
            <div className="text-2xl font-bold mt-2">0</div>
            <p className="text-xs text-muted-foreground mt-1">Items below reorder level</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Pending Transfers</div>
            <div className="text-2xl font-bold mt-2">0</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting receipt</p>
          </div>
        </div>

        {/* Placeholder for future content */}
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Dashboard Content Coming Soon</h3>
          <p className="text-muted-foreground mt-2">
            Sales charts, recent transactions, and quick actions will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
