import * as React from "react"
import {
  IconBox,
  IconBuildingStore,
  IconChartBar,
  IconDashboard,
  IconFileDescription,
  IconReceipt,
  IconReceipt2,
  IconSettings,
  IconTransfer,
  IconTruck,
  IconUsers,
  IconUserCog,
  IconReportAnalytics,
  IconArrowBackUp,
  IconCashBanknote,
  IconDeviceMobile,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { BranchSelector } from "@/components/branch-selector"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"

const navMain = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: IconDashboard,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: IconReportAnalytics,
  },
  {
    title: "Inventory",
    url: "/admin/inventory",
    icon: IconBox,
  },
  {
    title: "Purchases",
    url: "/admin/purchases",
    icon: IconTruck,
  },
  {
    title: "Sales",
    url: "/admin/sales",
    icon: IconReceipt,
  },
  {
    title: "Transfers",
    url: "/admin/transfers",
    icon: IconTransfer,
  },
  {
    title: "Expenses",
    url: "/admin/expenses",
    icon: IconReceipt2,
  },
  {
    title: "Returns",
    url: "/admin/returns",
    icon: IconArrowBackUp,
  },
  {
    title: "Refunds",
    url: "/admin/refunds",
    icon: IconCashBanknote,
  },
  {
    title: "Serial Numbers",
    url: "/admin/serial-numbers",
    icon: IconDeviceMobile,
  },
]

const navSecondary = [
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IconSettings,
  },
]

const documents = [
  {
    name: "Branches",
    url: "/admin/branches",
    icon: IconBuildingStore,
  },
  {
    name: "Users",
    url: "/admin/users",
    icon: IconUserCog,
  },
  {
    name: "Reports",
    url: "/admin/reports",
    icon: IconChartBar,
  },
  {
    name: "Customers",
    url: "/admin/customers",
    icon: IconUsers,
  },
  {
    name: "Suppliers",
    url: "/admin/suppliers",
    icon: IconFileDescription,
  },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  
  const userData = {
    name: user?.fullName || "Administrator",
    email: user?.email || "",
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                  H
                </div>
                <span className="text-base font-semibold">HOTLINES Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <div className="px-2 py-2">
          <BranchSelector />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavDocuments items={documents} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
