import { AdminSidebar } from "@/components/admin-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { AdminSectionCards } from "@/components/admin-section-cards"
import { BranchComparison } from "@/components/branch-comparison"
import { RecentSalesTable } from "@/components/recent-sales-table"
import { LowStockTable } from "@/components/low-stock-table"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider, useBranch } from "@/context/branch-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { IconBuilding, IconBuildingStore } from "@tabler/icons-react"

function AdminDashboardContent() {
  const { selectedBranch, isCompanyView } = useBranch()

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
            {/* Branch indicator banner */}
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

            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <AdminSectionCards />
              
              {/* Branch Comparison - only shows in company view */}
              <BranchComparison />
              
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              
              {/* Low Stock Alerts */}
              <LowStockTable />
              
              {/* Recent Sales */}
              <RecentSalesTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function AdminDashboardPage() {
  return (
    <BranchProvider>
      <AdminDashboardContent />
    </BranchProvider>
  )
}
