"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const routeNames: Record<string, string> = {
  admin: "Dashboard",
  randevular: "Randevular",
  takvim: "Takvim",
  berberler: "Berberler",
  "working-hours": "Çalışma Saatleri",
  abonmanlar: "Abonmanlar",
  "manuel-randevu": "Manuel Randevu",
  "engellenen-musteriler": "Engellenen Müşteriler",
  defter: "Defter",
  giderler: "Giderler",
  sabit: "Sabit Giderler",
  "sms-log": "SMS Logları",
  "audit-logs": "Sistem Logları",
  settings: "Ayarlar",
  "bekleme-listesi": "Bekleme Listesi",
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  
  const segments = pathname.split('/').filter(Boolean)
  
  const breadcrumbSegments = segments.slice(1)
  
  if (breadcrumbSegments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1 text-slate-900">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
  
  let currentPath = '/admin'
  
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              href="/admin" 
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbSegments.map((segment, index) => {
          currentPath += `/${segment}`
          const isLast = index === breadcrumbSegments.length - 1
          const label = routeNames[segment] || segment
          
          return (
            <div key={segment} className="flex items-center gap-2">
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-slate-900 font-medium">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      href={currentPath}
                      className="text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
