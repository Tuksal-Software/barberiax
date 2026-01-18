"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar variant="inset" collapsible="offcanvas" />
      <SidebarInset className="bg-[#f8fafc]">
        <AdminHeader />
        <div className="flex flex-1 flex-col">
          <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}