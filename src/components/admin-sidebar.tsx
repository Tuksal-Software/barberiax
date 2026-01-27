"use client"

import * as React from "react"
import {
  LayoutDashboardIcon,
  CalendarIcon,
  CalendarDaysIcon,
  UsersIcon,
  BookOpenIcon,
  ReceiptIcon,
  MessageSquareIcon,
  ActivityIcon,
  SettingsIcon,
  ClockIcon,
  RepeatIcon,
  CalendarPlusIcon,
  RefreshCwIcon,
  ShieldBan,
  Bell,
} from "lucide-react"
import { usePathname } from "next/navigation"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getSessionClient } from "@/lib/actions/auth"
import { getShopName } from "@/lib/actions/settings.actions"
import { getBarberById } from "@/lib/actions/barber.actions"

const navItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboardIcon,
    group: "main"
  },
  {
    title: "Randevular",
    url: "/admin/randevular",
    icon: CalendarIcon,
    group: "main"
  },
  {
    title: "Takvim",
    url: "/admin/randevular/takvim",
    icon: CalendarDaysIcon,
    group: "main"
  },
  {
    title: "Berberler",
    url: "/admin/berberler",
    icon: UsersIcon,
    group: "business"
  },
  {
    title: "Çalışma Saatleri",
    url: "/admin/working-hours",
    icon: ClockIcon,
    group: "business"
  },
  {
    title: "Abonmanlar",
    url: "/admin/abonmanlar",
    icon: RepeatIcon,
    group: "business"
  },
  {
    title: "Manuel Randevu",
    url: "/admin/manuel-randevu",
    icon: CalendarPlusIcon,
    group: "business"
  },
  {
    title: "Engellenen Müşteriler",
    url: "/admin/engellenen-musteriler",
    icon: ShieldBan,
    group: "business"
  },
  {
    title: "Bekleme Listesi",
    url: "/admin/bekleme-listesi",
    icon: Bell,
    group: "business"
  },
  {
    title: "Defter",
    url: "/admin/defter",
    icon: BookOpenIcon,
    group: "finance"
  },
  {
    title: "Giderler",
    url: "/admin/giderler",
    icon: ReceiptIcon,
    group: "finance"
  },
  {
    title: "Sabit Giderler",
    url: "/admin/giderler/sabit",
    icon: RefreshCwIcon,
    group: "finance"
  },
  {
    title: "SMS Logları",
    url: "/admin/sms-log",
    icon: MessageSquareIcon,
    group: "logs"
  },
  {
    title: "Sistem Logları",
    url: "/admin/audit-logs",
    icon: ActivityIcon,
    group: "logs"
  },
  {
    title: "Ayarlar",
    url: "/admin/settings",
    icon: SettingsIcon,
    group: "settings"
  },
]

const groupLabels: Record<string, string> = {
  main: "Platform",
  business: "İşletme",
  finance: "Defter & Finans",
  logs: "Loglar & Kayıtlar",
  settings: "Ayarlar"
}

export function AdminSidebar({ 
  isDisabled = false,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { isDisabled?: boolean }) {
  const pathname = usePathname()
  const [user, setUser] = React.useState<{ 
    name: string
    email: string
    image?: string | null
  } | null>(null)
  const [shopName, setShopName] = React.useState<string>("Barberiax")
  const { isMobile, setOpenMobile } = useSidebar()

  React.useEffect(() => {
    async function loadUser() {
      const session = await getSessionClient()
      if (session) {
        let barberImage: string | null = null
        
        try {
          const barber = await getBarberById(session.userId)
          if (barber) {
            barberImage = barber.image
          }
        } catch (error) {
          console.error('Error loading barber image:', error)
        }

        setUser({
          name: session.name,
          email: session.email,
          image: barberImage,
        })
      }
    }
    loadUser()
  }, [])

  React.useEffect(() => {
    async function loadShopName() {
      const name = await getShopName()
      setShopName(name)
    }
    loadShopName()
  }, [])

  const navItemsWithActive = navItems.map((item) => ({
    ...item,
    isActive: pathname === item.url || 
      (item.url === "/admin/randevular" && pathname.startsWith("/admin/randevular") && pathname !== "/admin/randevular/takvim") || 
      (item.url === "/admin/giderler/sabit" && pathname.startsWith("/admin/giderler/sabit")),
  }))

  const groupedItems = navItemsWithActive.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof navItemsWithActive>)

  const groupOrder = ["main", "business", "finance", "logs", "settings"]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isDisabled ? (
              <SidebarMenuButton
                size="lg"
                disabled
                className="data-[slot=sidebar-menu-button]:bg-sidebar opacity-50 cursor-not-allowed"
              >
                <Avatar className="h-8 w-8 ring-2 ring-white/20">
                  <AvatarImage 
                    src={user?.image || undefined}
                    alt={user?.name || "Admin"} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{shopName}</span>
                  <span className="truncate text-xs">{user?.name || "Admin"}</span>
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                size="lg"
                asChild
                className="data-[slot=sidebar-menu-button]:bg-sidebar"
              >
                <Link 
                  href="/admin"
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false)
                    }
                  }}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-white/20">
                    <AvatarImage 
                      src={user?.image || undefined}
                      alt={user?.name || "Admin"} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                      {user?.name?.[0]?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{shopName}</span>
                    <span className="truncate text-xs">{user?.name || "Admin"}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groupOrder.map((groupKey) => {
          const items = groupedItems[groupKey]
          if (!items || items.length === 0) return null

          return (
            <SidebarGroup key={groupKey}>
              <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 uppercase px-2">
                {groupLabels[groupKey]}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.title}>
                        {isDisabled ? (
                          <SidebarMenuButton
                            tooltip={item.title}
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          >
                            {Icon && <Icon />}
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={item.isActive}
                          >
                            <Link 
                              href={item.url}
                              onClick={() => {
                                if (isMobile) {
                                  setOpenMobile(false)
                                }
                              }}
                            >
                              {Icon && <Icon />}
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}

