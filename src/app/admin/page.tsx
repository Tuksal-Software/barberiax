"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowRight,
  CalendarDays,
  Hourglass,
  CheckCheck,
  CircleCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  MessageSquare,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardStats, getWeeklyAppointments, getAppointmentStatusStats } from "@/lib/actions/stats.actions"
import { getRecentAppointments } from "@/lib/actions/appointment-query.actions"
import { getFinanceSummary } from "@/lib/actions/dashboard-finance.actions"
import { getTodayAuditSummary } from "@/lib/actions/audit.actions"
import { format } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { WeeklyAppointmentsChart } from "@/components/app/WeeklyAppointmentsChart"
import { formatAppointmentTimeRange } from "@/lib/time"
import { cn } from "@/lib/utils"
import type { DashboardStats, WeeklyAppointmentData, AppointmentStatusStats } from "@/lib/actions/stats.actions"
import type { AppointmentRequestListItem } from "@/lib/actions/appointment-query.actions"
import type { FinanceSummary } from "@/lib/actions/dashboard-finance.actions"
import type { TodayAuditSummary } from "@/lib/actions/audit.actions"

const statusLabels = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal",
  done: "Tamamlandı",
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    approvedToday: 0,
    approvedTotal: 0,
    activeBarbers: 0,
    subscriptionCustomers: 0,
  })
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRequestListItem[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyAppointmentData[]>([])
  const [statusStats, setStatusStats] = useState<AppointmentStatusStats>({ approved: 0, cancelled: 0 })
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ totalRevenue: 0, totalExpense: 0, netProfit: 0 })
  const [auditSummary, setAuditSummary] = useState<TodayAuditSummary>({
    totalEvents: 0,
    appointmentActions: 0,
    ledgerActions: 0,
    expenseActions: 0,
    smsSent: 0,
    authActions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [statsData, appointmentsData, weeklyData, statusStats, financeData, auditSummaryData] = await Promise.all([
          getDashboardStats(),
          getRecentAppointments(5),
          getWeeklyAppointments(),
          getAppointmentStatusStats(),
          getFinanceSummary('all'),
          getTodayAuditSummary(),
        ])
        setStats(statsData)
        setRecentAppointments(appointmentsData)
        setWeeklyData(weeklyData)
        setStatusStats(statusStats)
        setFinanceSummary(financeData)
        setAuditSummary(auditSummaryData)
      } catch (error) {
        console.error("Dashboard veri yükleme hatası:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'd MMM', { locale: tr })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200 font-normal">Onaylandı</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-normal">Bekliyor</Badge>
      case 'done':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">Tamamlandı</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-200 font-normal">İptal</Badge>
      case 'rejected':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-normal">Reddedildi</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-40 bg-slate-100" />
            <Skeleton className="h-40 bg-slate-100" />
            <Skeleton className="h-40 bg-slate-100" />
            <Skeleton className="h-40 bg-slate-100" />
          </div>
          <div className="grid gap-4 md:grid-cols-7">
            <Skeleton className="h-96 col-span-4 bg-slate-100" />
            <Skeleton className="h-96 col-span-3 bg-slate-100" />
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            İşletmenizin genel görünümü ve önemli metrikleri
          </p>
        </div>

        {/* Hero Stats - 4 Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Bugünkü Randevular */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardHeader className="relative pb-2">
              <CardDescription className="text-blue-700">Bugünkü Randevular</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-blue-900">
                {stats.approvedToday}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm pt-4">
              <div className="flex gap-2 font-medium text-blue-800">
                <TrendingUp className="h-4 w-4" />
                Bugün onaylanan
              </div>
              <div className="text-blue-600 text-xs">
                Aktif randevularınız
              </div>
            </CardFooter>
          </Card>

          {/* Card 2: Bekleyen Randevular */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
            <CardHeader className="relative pb-2">
              <CardDescription className="text-amber-700">Bekleyen Randevular</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-amber-900">
                {stats.pending}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Hourglass className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm pt-4">
              <div className="flex gap-2 font-medium text-amber-800">
                <Clock className="h-4 w-4" />
                Onay bekliyor
              </div>
              <div className="text-amber-600 text-xs">
                Hemen kontrol edin
              </div>
            </CardFooter>
          </Card>

          {/* Card 3: Toplam Onaylı */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
            <CardHeader className="relative pb-2">
              <CardDescription className="text-green-700">Toplam Onaylı</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-green-900">
                {stats.approvedTotal}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm pt-4">
              <div className="flex gap-2 font-medium text-green-800">
                <TrendingUp className="h-4 w-4" />
                Tüm zamanlar
              </div>
              <div className="text-green-600 text-xs">
                Onaylanmış randevular
              </div>
            </CardFooter>
          </Card>

          {/* Card 4: Aktif Berberler */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-sm">
            <CardHeader className="relative pb-2">
              <CardDescription className="text-purple-700">Aktif Berberler</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-purple-900">
                {stats.activeBarbers}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm pt-4">
              <div className="flex gap-2 font-medium text-purple-800">
                <Activity className="h-4 w-4" />
                Sistemde aktif
              </div>
              <div className="text-purple-600 text-xs">
                Çalışan berber sayısı
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Chart + Finance Section */}
        <div className="grid gap-4 md:grid-cols-7">
          {/* Weekly Chart */}
          <div className="col-span-4">
            <WeeklyAppointmentsChart data={weeklyData} />
          </div>

          {/* Finance + Stats */}
          <div className="col-span-3 space-y-4">
            {/* Finance Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900">Finansal Özet</CardTitle>
                    <CardDescription className="text-slate-600">Tüm zamanlar</CardDescription>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Gelir</span>
                    <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ArrowUpRight className="h-3 w-3" />
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(financeSummary.totalRevenue)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Gider</span>
                    <div className="flex items-center gap-1 text-red-600 font-semibold">
                      <ArrowDownRight className="h-3 w-3" />
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(financeSummary.totalExpense)}
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Net Kâr/Zarar</span>
                    <div className={cn(
                        "text-lg font-bold",
                        financeSummary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(financeSummary.netProfit)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-900">Randevu İstatistikleri</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PieChart className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-slate-600">Onaylanan</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{statusStats.approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-sm text-slate-600">İptal Edilen</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{statusStats.cancelled}</span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Toplam</span>
                  <span className="text-lg font-bold text-slate-900">
                  {statusStats.approved + statusStats.cancelled}
                </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity + Quick Actions */}
        <div className="grid gap-4 md:grid-cols-7">
          {/* Recent Appointments */}
          <Card className="col-span-4 bg-white border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900">Son Randevular</CardTitle>
                  <CardDescription className="text-slate-600">En son 5 randevu talebi</CardDescription>
                </div>
                <Button
                    size="sm"
                    onClick={() => router.push('/admin/randevular')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tümünü Gör
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {recentAppointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Henüz randevu yok
                  </div>
              ) : (
                  <div className="space-y-3">
                    {recentAppointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="flex items-center justify-between p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                            onClick={() => router.push('/admin/randevular')}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">{apt.customerName}</span>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(apt.date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatAppointmentTimeRange(apt.requestedStartTime, apt.requestedEndTime, apt.appointmentSlots)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {apt.barberName}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                    ))}
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions + Activity */}
          <div className="col-span-3 space-y-4">
            {/* Quick Actions */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <CardTitle className="text-slate-900">Hızlı Erişim</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-2">
                <Button
                    className="w-full justify-start bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-500"
                    onClick={() => router.push('/admin/randevular')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Randevular
                </Button>
                <Button
                    className="w-full justify-start bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-500"
                    onClick={() => router.push('/admin/randevular/takvim')}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Takvim
                </Button>
                <Button
                    className="w-full justify-start bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-500"
                    onClick={() => router.push('/admin/defter')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Defter
                </Button>
                <Button
                    className="w-full justify-start bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-blue-500"
                    onClick={() => router.push('/admin/berberler')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Berberler
                </Button>
              </CardContent>
            </Card>

            {/* Today Activity */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-900">Bugünkü Aktivite</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <Calendar className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600">Randevu İşlemleri</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{auditSummary.appointmentActions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded">
                      <DollarSign className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-600">Defter Kayıtları</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{auditSummary.ledgerActions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded">
                      <MessageSquare className="h-3 w-3 text-amber-600" />
                    </div>
                    <span className="text-sm text-slate-600">SMS Gönderimi</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{auditSummary.smsSent}</span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Toplam İşlem</span>
                  <span className="text-lg font-bold text-slate-900">{auditSummary.totalEvents}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}