"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function AdminShell({ 
  children, 
  showSidebar = true,
  isDisabled = false
}: { 
  children: React.ReactNode
  showSidebar?: boolean
  isDisabled?: boolean
}) {
  const pathname = usePathname()
  const isPendingPage = pathname === '/admin/pending'
  const shouldShowSidebar = showSidebar && !isPendingPage

  if (isPendingPage) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      {shouldShowSidebar && <AdminSidebar variant="inset" collapsible="offcanvas" isDisabled={isDisabled} />}
      <SidebarInset className="bg-[#f8fafc]">
        {shouldShowSidebar && <AdminHeader />}
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