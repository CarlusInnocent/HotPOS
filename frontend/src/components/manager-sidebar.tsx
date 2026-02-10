import * as React from "react"
import {
  IconBuildingStore,
  IconDashboard,
  IconReportAnalytics,
  IconReceipt,
  IconSettings,
  IconCashBanknote,
  IconHistory,
  IconTruckReturn,
  IconReceipt2,
  IconPackageImport,
  IconBox,
  IconCategory,
  IconTransfer,
  IconDeviceMobile,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { Badge } from "@/components/ui/badge"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: IconReportAnalytics,
  },
  {
    title: "Today's Sales",
    url: "/dashboard/sales",
    icon: IconReceipt,
  },
  {
    title: "Transaction History",
    url: "/dashboard/history",
    icon: IconHistory,
  },
  {
    title: "Purchases",
    url: "/dashboard/purchases",
    icon: IconPackageImport,
  },
  {
    title: "Products",
    url: "/dashboard/products",
    icon: IconBox,
  },
  {
    title: "Categories",
    url: "/dashboard/categories",
    icon: IconCategory,
  },
  {
    title: "Expenses",
    url: "/dashboard/expenses",
    icon: IconReceipt2,
  },
  {
    title: "Returns to Supplier",
    url: "/dashboard/returns",
    icon: IconTruckReturn,
  },
  {
    title: "Refunds",
    url: "/dashboard/refunds",
    icon: IconCashBanknote,
  },
  {
    title: "Transfers",
    url: "/dashboard/transfers",
    icon: IconTransfer,
  },
  {
    title: "Serial Numbers",
    url: "/dashboard/serial-numbers",
    icon: IconDeviceMobile,
  },
]

const navSecondary = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: IconSettings,
  },
]

export function ManagerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  
  const userData = {
    name: user?.fullName || "Manager",
    email: user?.email || "",
    avatar: "",
  }

  const userBranch = user?.branchName || "Unknown Branch"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                  H
                </div>
                <span className="text-base font-semibold">HOTLINES Manager</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Branch indicator */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconBuildingStore className="size-3" />
            <span>Branch:</span>
            <Badge variant="outline" className="text-xs">{userBranch}</Badge>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
