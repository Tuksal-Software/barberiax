"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { logout } from "@/lib/actions/auth"

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white">
      <div className="flex w-full items-center gap-2 px-4 md:px-6">
        <SidebarTrigger className="-ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md" />
        <Separator
          orientation="vertical"
          className="h-4 bg-slate-300"
        />
        <AdminBreadcrumb />
        
        <div className="ml-auto">
          <form action={logout}>
            <Button 
              type="submit" 
              variant="ghost" 
              size="sm"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
