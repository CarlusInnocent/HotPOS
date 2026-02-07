import * as React from "react"
import {
  IconBuildingStore,
  IconReceipt,
  IconSettings,
  IconShoppingCart,
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
    title: "Point of Sale",
    url: "/pos",
    icon: IconShoppingCart,
  },
  {
    title: "Today's Sales",
    url: "/pos/sales",
    icon: IconReceipt,
  },
  {
    title: "Process Refund",
    url: "/pos/refunds",
    icon: IconCashBanknote,
  },
  {
    title: "Returns to Supplier",
    url: "/pos/returns",
    icon: IconTruckReturn,
  },
  {
    title: "Purchases",
    url: "/pos/purchases",
    icon: IconPackageImport,
  },
  {
    title: "Products",
    url: "/pos/products",
    icon: IconBox,
  },
  {
    title: "Categories",
    url: "/pos/categories",
    icon: IconCategory,
  },
  {
    title: "Expenses",
    url: "/pos/expenses",
    icon: IconReceipt2,
  },
  {
    title: "Transaction History",
    url: "/pos/history",
    icon: IconHistory,
  },
  {
    title: "Transfers",
    url: "/pos/transfers",
    icon: IconTransfer,
  },
  {
    title: "Serial Numbers",
    url: "/pos/serial-analytics",
    icon: IconDeviceMobile,
  },
]

const navSecondary = [
  {
    title: "Settings",
    url: "/pos/settings",
    icon: IconSettings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  
  const userData = {
    name: user?.fullName || "Cashier",
    email: user?.email || "",
    avatar: "",
  }

  // Get user's branch from auth context
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
              <a href="/pos">
                <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                  H
                </div>
                <span className="text-base font-semibold">HOTLINES</span>
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
