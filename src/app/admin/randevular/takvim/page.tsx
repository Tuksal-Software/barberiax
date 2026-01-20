"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Hourglass,
  CheckCheck,
  LayoutGrid,
} from "lucide-react"
import { getActiveBarbers } from "@/lib/actions/barber.actions"
import { getCalendarAppointments, CalendarAppointment } from "@/lib/actions/appointment-query.actions"
import { approveAppointmentRequest, cancelAppointmentRequest } from "@/lib/actions/appointment.actions"
import { parseTimeToMinutes, minutesToTime, overlaps, getNowUTC } from "@/lib/time"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BarberFilter } from "@/components/admin/BarberFilter"
import { cn } from "@/lib/utils"

interface Barber {
  id: string
  name: string
}

const TIME_SLOTS = (() => {
  const slots: string[] = []
  for (let hour = 10; hour < 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  return slots
})()

const DAYS_OF_WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateRange(dates: Date[]): string {
  const first = dates[0]
  const last = dates[dates.length - 1]
  const firstStr = first.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  const lastStr = last.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${firstStr} – ${lastStr}`
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeTime(time: string): string {
  const trimmed = time.trim()
  const first5 = trimmed.slice(0, 5)
  const colonIndex = first5.indexOf(':')

  if (colonIndex === -1) {
    return '00:00'
  }

  const h = first5.slice(0, colonIndex)
  const m = first5.slice(colonIndex + 1)
  const hours = h.padStart(2, '0')
  const minutes = m.padStart(2, '0')

  return `${hours}:${minutes}`
}

function getAppointmentsForDate(
    appointments: CalendarAppointment[],
    dateKey: string,
    barberId: string | null
): CalendarAppointment[] {
  return appointments.filter(apt => {
    if (apt.date !== dateKey) return false
    if (barberId && apt.barberId !== barberId) return false
    return true
  })
}

function getStatusPriority(status: CalendarAppointment['status']): number {
  switch (status) {
    case 'approved': return 3
    case 'pending': return 2
    case 'done': return 2
    case 'cancelled': return 1
    case 'rejected': return 1
    default: return 0
  }
}

function getPrimaryAppointment(appointments: CalendarAppointment[]): CalendarAppointment | null {
  if (appointments.length === 0) return null
  return appointments.reduce((primary, current) => {
    const primaryPriority = getStatusPriority(primary.status)
    const currentPriority = getStatusPriority(current.status)
    return currentPriority > primaryPriority ? current : primary
  })
}

const SLOT_HEIGHT = 40
const DAY_START = "10:00"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getSlotIndexSafe(time: string): number {
  const t = normalizeTime(time)
  const idx = TIME_SLOTS.findIndex(s => s === t)
  if (idx !== -1) return idx

  const minutes = parseTimeToMinutes(t)
  const dayStartMin = parseTimeToMinutes(DAY_START)
  const delta = minutes - dayStartMin
  return clamp(Math.floor(delta / 30), 0, TIME_SLOTS.length - 1)
}

function getSlotSpan(startTime: string, endTime: string): { rowStart: number; rowEnd: number } {
  const startIdx = getSlotIndexSafe(startTime)
  const startMin = parseTimeToMinutes(normalizeTime(startTime))
  const endMin = parseTimeToMinutes(normalizeTime(endTime))
  const duration = Math.max(30, endMin - startMin)
  const span = Math.max(1, Math.ceil(duration / 30))

  const rowStart = startIdx + 1
  const rowEnd = rowStart + span
  return { rowStart, rowEnd }
}

function groupBySlot(apts: CalendarAppointment[]): Map<string, CalendarAppointment[]> {
  const map = new Map<string, CalendarAppointment[]>()
  for (const a of apts) {
    const key = `${a.date}-${normalizeTime(a.startTime)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return map
}

function getBorderColor(status: CalendarAppointment['status'], subscriptionId?: string | null): string {
  if (subscriptionId) {
    return 'border-purple-500'
  }
  switch (status) {
    case 'approved': return 'border-green-500'
    case 'pending': return 'border-amber-500'
    case 'done': return 'border-emerald-500'
    case 'cancelled': return 'border-red-500'
    case 'rejected': return 'border-red-500'
    default: return 'border-slate-300'
  }
}

function getBackgroundColor(status: CalendarAppointment['status'], subscriptionId?: string | null): string {
  if (subscriptionId) {
    return 'bg-purple-50'
  }
  switch (status) {
    case 'approved': return 'bg-green-50'
    case 'pending': return 'bg-amber-50'
    case 'done': return 'bg-emerald-50'
    case 'cancelled': return 'bg-red-50'
    case 'rejected': return 'bg-red-50'
    default: return 'bg-slate-50'
  }
}

export default function TakvimPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const isMobile = useIsMobile()

  const weekDates = useMemo(() => getWeekDates(new Date(currentWeek)), [currentWeek])
  const dateRange = useMemo(() => formatDateRange(weekDates), [weekDates])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedAppointment) return
    const start = parseTimeToMinutes(normalizeTime(selectedAppointment.startTime))
    const end = parseTimeToMinutes(normalizeTime(selectedAppointment.endTime))
    const duration = end - start

    if (duration === 60) {
      setSelectedDuration(60)
    } else if (duration === 30) {
      setSelectedDuration(30)
    } else {
      if (selectedAppointment.serviceType === 'sac_sakal') {
        setSelectedDuration(60)
      } else {
        setSelectedDuration(30)
      }
    }
  }, [selectedAppointment])

  const loadData = async () => {
    setLoading(true)
    try {
      const barbersList = await getActiveBarbers()
      setBarbers(barbersList.map(b => ({ id: b.id, name: b.name })))

      const calendarAppointments = await getCalendarAppointments()
      setAppointments(calendarAppointments)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Randevular yüklenirken hata oluştu")
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    const today = formatDateKey(new Date())
    const weekKeys = weekDates.map(d => formatDateKey(d))

    const todayAppts = appointments.filter(a => a.date === today)
    const weekAppts = appointments.filter(a => weekKeys.includes(a.date))

    return {
      today: todayAppts.filter(a => a.status === 'approved' || a.status === 'done').length,
      pending: weekAppts.filter(a => a.status === 'pending').length,
      approved: weekAppts.filter(a => a.status === 'approved').length,
      total: weekAppts.filter(a => a.status !== 'cancelled' && a.status !== 'rejected').length,
    }
  }, [appointments, weekDates])

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    setIsSheetOpen(true)
  }

  const handleApprove = async () => {
    if (!selectedAppointment) return

    setActionLoading(true)
    try {
      await approveAppointmentRequest({
        appointmentRequestId: selectedAppointment.id,
        approvedDurationMinutes: selectedDuration,
      })

      toast.success("Randevu onaylandı")
      setIsSheetOpen(false)
      setSelectedAppointment(null)
      await loadData()
    } catch (error) {
      console.error("Error approving appointment:", error)
      toast.error(error instanceof Error ? error.message : "Randevu onaylanırken hata oluştu")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelClick = () => {
    setIsCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedAppointment) return

    setActionLoading(true)
    try {
      await cancelAppointmentRequest({
        appointmentRequestId: selectedAppointment.id,
        reason: cancelReason.trim() || undefined,
      })

      toast.success("Randevu iptal edildi")
      setIsCancelDialogOpen(false)
      setCancelReason("")
      setIsSheetOpen(false)
      setSelectedAppointment(null)
      await loadData()
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast.error(error instanceof Error ? error.message : "Randevu iptal edilirken hata oluştu")
    } finally {
      setActionLoading(false)
    }
  }

  const getServiceTypeText = (serviceType: string | null, startTime: string, endTime: string): string => {
    if (serviceType === 'sac') return 'Saç'
    if (serviceType === 'sakal') return 'Sakal'
    if (serviceType === 'sac_sakal') return 'Saç ve Sakal'

    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    const duration = endMinutes - startMinutes

    if (duration === 30) return '30 dk'
    if (duration === 60) return '60 dk'
    return 'Belirtilmedi'
  }

  const getStatusBadge = (status: CalendarAppointment['status'], subscriptionId?: string | null) => {
    if (subscriptionId) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-normal">Abonman</Badge>
    }
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200 font-normal">Onaylandı</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-normal">Onay bekliyor</Badge>
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const isPastAppointment = (appointment: CalendarAppointment): boolean => {
    const now = getNowUTC()
    const today = now.toISOString().split('T')[0]
    const appointmentDate = appointment.date
    const isPastDate = appointmentDate < today
    const isToday = appointmentDate === today

    if (isPastDate) {
      return true
    }

    if (isToday) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const appointmentStartTime = appointment.startTime
      const appointmentStartMinutes = parseTimeToMinutes(normalizeTime(appointmentStartTime))
      return appointmentStartMinutes < currentMinutes
    }

    return false
  }

  const getCancelledCount = (
      appointment: CalendarAppointment,
      allAppointments: CalendarAppointment[]
  ): number => {
    const normalizedStartTime = normalizeTime(appointment.startTime)
    return allAppointments.filter(
        apt =>
            apt.date === appointment.date &&
            normalizeTime(apt.startTime) === normalizedStartTime &&
            (apt.status === 'cancelled' || apt.status === 'rejected')
    ).length
  }

  const filteredAppointments = useMemo(() => {
    if (!selectedBarberId) return appointments
    return appointments.filter(apt => apt.barberId === selectedBarberId)
  }, [appointments, selectedBarberId])

  const dayAppointments = useMemo(() => {
    if (isMobile) {
      const dateKey = formatDateKey(weekDates[selectedDay])
      const dayAppts = filteredAppointments.filter(apt => apt.date === dateKey)
      const groupedByTimeSlot = groupBySlot(dayAppts)
      const primaryAppointments: Array<{
        appointment: CalendarAppointment
        cancelledCount: number
      }> = []

      groupedByTimeSlot.forEach((appointmentsInSlot) => {
        const primary = getPrimaryAppointment(appointmentsInSlot)
        if (primary) {
          const cancelledCount = appointmentsInSlot.filter(a => a.status === 'cancelled' || a.status === 'rejected').length
          primaryAppointments.push({
            appointment: primary,
            cancelledCount,
          })
        }
      })

      return primaryAppointments.sort((a, b) => {
        const aStart = parseTimeToMinutes(normalizeTime(a.appointment.startTime))
        const bStart = parseTimeToMinutes(normalizeTime(b.appointment.startTime))
        return aStart - bStart
      })
    }
    return []
  }, [isMobile, weekDates, selectedDay, filteredAppointments])

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32 bg-slate-100" />
            <Skeleton className="h-32 bg-slate-100" />
            <Skeleton className="h-32 bg-slate-100" />
            <Skeleton className="h-32 bg-slate-100" />
          </div>
          <Skeleton className="h-96 bg-slate-100" />
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Takvim</h1>
          <p className="text-sm text-slate-600 mt-1">
            Haftalık randevu takvimi
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">
                Bugün
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{stats.today}</div>
              <p className="text-xs text-blue-700 mt-1">
                Bugünkü randevular
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">
                Bekleyen
              </CardTitle>
              <Hourglass className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900">{stats.pending}</div>
              <p className="text-xs text-amber-700 mt-1">
                Onay bekleyen
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-900">
                Onaylı
              </CardTitle>
              <CheckCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
              <p className="text-xs text-green-700 mt-1">
                Bu hafta onaylı
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">
                Toplam
              </CardTitle>
              <LayoutGrid className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-700 mt-1">
                Bu hafta toplam
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Barber Filter */}
              {barbers.length > 1 && (
                  <div className="w-full sm:w-64">
                    <BarberFilter
                        barbers={barbers}
                        selectedBarberId={selectedBarberId}
                        onSelect={setSelectedBarberId}
                    />
                  </div>
              )}

              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={goToPreviousWeek}
                    className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    onClick={goToToday}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                >
                  Bugün
                </Button>
                <Button
                    size="sm"
                    onClick={goToNextWeek}
                    className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Title */}
        <div className="flex items-center justify-center">
          <h2 className="text-lg font-semibold text-slate-900">{dateRange}</h2>
        </div>

        {/* Mobile View */}
        {isMobile ? (
            <div className="space-y-4">
              {/* Day Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weekDates.map((date, index) => {
                  const isToday = formatDateKey(date) === formatDateKey(new Date())
                  const dayAppts = getAppointmentsForDate(filteredAppointments, formatDateKey(date), selectedBarberId)
                  return (
                      <Button
                          key={index}
                          size="sm"
                          onClick={() => setSelectedDay(index)}
                          className={cn(
                              "flex-shrink-0 min-w-[70px]",
                              selectedDay === index
                                  ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                  : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100",
                              isToday && "ring-2 ring-blue-400"
                          )}
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-xs">{DAYS_OF_WEEK[index]}</div>
                          <div className="text-lg font-semibold">{date.getDate()}</div>
                          {dayAppts.length > 0 && (
                              <div className="text-xs mt-1">{dayAppts.length}</div>
                          )}
                        </div>
                      </Button>
                  )
                })}
              </div>

              {/* Day Appointments */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {dayAppointments.length === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                          <p className="text-slate-600 font-medium">Bu gün için randevu bulunamadı</p>
                        </div>
                    ) : (
                        dayAppointments.map(({ appointment, cancelledCount }) => {
                          const borderColor = getBorderColor(appointment.status, appointment.subscriptionId)
                          const bgColor = getBackgroundColor(appointment.status, appointment.subscriptionId)
                          const isDone = appointment.status === 'done'
                          return (
                              <div
                                  key={appointment.id}
                                  className={cn(
                                      "p-4 border-2 rounded-lg transition-all relative",
                                      borderColor,
                                      bgColor,
                                      isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'
                                  )}
                                  onClick={() => !isDone && handleAppointmentClick(appointment)}
                              >
                                {appointment.status !== 'cancelled' && appointment.status !== 'rejected' && cancelledCount > 0 && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                                      {Array.from({ length: Math.min(3, cancelledCount) }).map((_, i) => (
                                          <span key={i} className="w-2 h-2 bg-red-500 rounded-full" />
                                      ))}
                                      {cancelledCount > 3 && (
                                          <span className="text-[10px] text-red-600 font-semibold">+{cancelledCount - 3}</span>
                                      )}
                                    </div>
                                )}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-900">
                                {normalizeTime(appointment.startTime)} - {normalizeTime(appointment.endTime)}
                              </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-slate-600" />
                                      <span className="text-sm text-slate-700">{appointment.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-slate-600" />
                                      <span className="text-sm text-slate-600">{appointment.customerPhone}</span>
                                    </div>
                                  </div>
                                  <div>
                                    {getStatusBadge(appointment.status, appointment.subscriptionId)}
                                  </div>
                                </div>
                              </div>
                          )
                        })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
        ) : (
            /* Desktop Calendar View */
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {/* Week Header */}
                  <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
                    <div className="p-3 border-r border-slate-200"></div>
                    {weekDates.map((date, index) => {
                      const isToday = formatDateKey(date) === formatDateKey(new Date())
                      const dayAppts = getAppointmentsForDate(filteredAppointments, formatDateKey(date), selectedBarberId)
                      return (
                          <div
                              key={index}
                              className={cn(
                                  "p-3 text-center border-r border-slate-200",
                                  isToday && "bg-blue-50",
                                  index === 6 && "border-r-0"
                              )}
                          >
                            <div className="text-xs text-slate-600">{DAYS_OF_WEEK[index]}</div>
                            <div className={cn(
                                "text-lg font-semibold",
                                isToday ? "text-blue-600" : "text-slate-900"
                            )}>
                              {date.getDate()}
                            </div>
                            {dayAppts.length > 0 && (
                                <div className="text-xs text-slate-600 mt-1">{dayAppts.length} randevu</div>
                            )}
                          </div>
                      )
                    })}
                  </div>

                  {/* Time Grid */}
                  <div className="relative" style={{ height: `${TIME_SLOTS.length * 40}px` }}>
                    {/* Time Slots Background */}
                    {TIME_SLOTS.map((slotTime, slotIndex) => {
                      const isHourMark = slotTime.endsWith(':00')
                      return (
                          <div key={slotIndex} className="absolute grid grid-cols-8 border-b border-slate-200 w-full" style={{ top: `${slotIndex * 40}px`, height: '40px' }}>
                            <div className={cn(
                                "p-2 border-r border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-start justify-end",
                                !isHourMark && 'opacity-50'
                            )}>
                              {isHourMark ? slotTime : ''}
                            </div>
                            {weekDates.map((date, dayIndex) => (
                                <div
                                    key={dayIndex}
                                    className={cn(
                                        "border-r border-slate-200",
                                        dayIndex === 6 && "border-r-0"
                                    )}
                                />
                            ))}
                          </div>
                      )
                    })}

                    {/* Appointments */}
                    {weekDates.map((date, dayIndex) => {
                      const dateKey = formatDateKey(date)
                      const dayAppointments = getAppointmentsForDate(
                          filteredAppointments,
                          dateKey,
                          selectedBarberId
                      )

                      const groupedByTimeSlot = groupBySlot(dayAppointments)
                      const renderedAppointments: Array<{
                        appointment: CalendarAppointment
                        cancelledCount: number
                      }> = []

                      groupedByTimeSlot.forEach((appointmentsInSlot) => {
                        const cancelledCount = appointmentsInSlot.filter(
                            a => a.status === 'cancelled' || a.status === 'rejected'
                        ).length

                        const visible = appointmentsInSlot.filter(
                            a => a.status === 'approved' || a.status === 'pending' || a.status === 'done'
                        )

                        if (visible.length > 0) {
                          const primary = getPrimaryAppointment(visible)
                          if (primary) {
                            renderedAppointments.push({
                              appointment: primary,
                              cancelledCount,
                            })
                          }
                        }
                      })

                      return (
                          <div key={dayIndex} className="absolute" style={{ left: `${((dayIndex + 1) / 8) * 100}%`, width: `${100 / 8}%`, top: 0, bottom: 0 }}>
                            {renderedAppointments.map(({ appointment, cancelledCount }) => {
                              const { rowStart, rowEnd } = getSlotSpan(appointment.startTime, appointment.endTime)
                              const top = (rowStart - 1) * SLOT_HEIGHT
                              const height = (rowEnd - rowStart) * SLOT_HEIGHT
                              const borderColor = getBorderColor(appointment.status, appointment.subscriptionId)
                              const bgColor = getBackgroundColor(appointment.status, appointment.subscriptionId)
                              const isDone = appointment.status === 'done'

                              return (
                                  <TooltipProvider key={appointment.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "absolute left-1 right-1 p-2 rounded-md border-2 text-xs overflow-hidden transition-all",
                                                borderColor,
                                                bgColor,
                                                isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md hover:z-10'
                                            )}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            onClick={() => !isDone && handleAppointmentClick(appointment)}
                                        >
                                          {appointment.status !== 'cancelled' && appointment.status !== 'rejected' && cancelledCount > 0 && (
                                              <div className="absolute top-1 right-1 flex items-center gap-1 z-20">
                                                {Array.from({ length: Math.min(2, cancelledCount) }).map((_, i) => (
                                                    <span key={i} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                                ))}
                                              </div>
                                          )}
                                          <div className="font-semibold text-slate-900 truncate">
                                            {normalizeTime(appointment.startTime)}
                                          </div>
                                          <div className="text-slate-700 truncate mt-0.5">
                                            {appointment.customerName}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white border-slate-700">
                                        <div className="space-y-1 text-xs">
                                          <p className="font-semibold">{appointment.customerName}</p>
                                          <p>{normalizeTime(appointment.startTime)} - {normalizeTime(appointment.endTime)}</p>
                                          <p>{appointment.barberName}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                              )
                            })}
                          </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {/* Appointment Detail Sheet - LIGHT THEME */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="bg-white border-slate-200 overflow-y-auto">
            <SheetHeader className="border-b border-slate-200 pb-4">
              <SheetTitle className="text-slate-900">Randevu Detayları</SheetTitle>
              <SheetDescription className="text-slate-600">
                Randevu bilgilerini görüntüleyin ve işlem yapın
              </SheetDescription>
            </SheetHeader>
            {selectedAppointment && (
                <>
                  <div className="space-y-6 py-6">
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">Müşteri Bilgileri</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-600" />
                          <span className="text-slate-900">{selectedAppointment.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-600" />
                          <span className="text-slate-900">{selectedAppointment.customerPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Appointment Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">Randevu Bilgileri</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-600" />
                          <span className="text-slate-900">{formatDate(selectedAppointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-600" />
                          <span className="text-slate-900">
                        {`${normalizeTime(selectedAppointment.startTime)} - ${normalizeTime(selectedAppointment.endTime)}`}
                      </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">Hizmet:</span>
                          <span className="text-slate-900 font-medium">
                        {getServiceTypeText(selectedAppointment.serviceType, selectedAppointment.startTime, selectedAppointment.endTime)}
                      </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-600" />
                          <span className="text-slate-900">{selectedAppointment.barberName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">Durum:</span>
                          {getStatusBadge(selectedAppointment.status, selectedAppointment.subscriptionId)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {selectedAppointment.status === 'pending' && !isPastAppointment(selectedAppointment) && (
                        <div className="space-y-3 pt-4 border-t border-slate-200">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Süre
                            </label>
                            <Select
                                value={selectedDuration.toString()}
                                onValueChange={(value) => setSelectedDuration(Number(value) as 30 | 60)}
                            >
                              <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="30" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                                  30 dakika
                                </SelectItem>
                                <SelectItem value="60" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                                  60 dakika
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                                onClick={handleCancelClick}
                                disabled={actionLoading}
                                className="flex-1 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              İptal Et
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              {actionLoading ? (
                                  "Onaylanıyor..."
                              ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {selectedDuration === 60 ? 'Süreyi Güncelle' : 'Onayla'}
                                  </>
                              )}
                            </Button>
                          </div>
                        </div>
                    )}
                  </div>
                </>
            )}
          </SheetContent>
        </Sheet>

        {/* Cancel Dialog - LIGHT THEME */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Randevuyu İptal Et</DialogTitle>
              <DialogDescription className="text-slate-600">
                Randevuyu iptal etmek istediğinizden emin misiniz? İptal nedeni opsiyoneldir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  İptal Nedeni (Neden girilmezse gönderilecek neden: İşletme tarafından kapatılan saatler)
                </label>
                <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="İşletme tarafından kapatılan saatler"
                    rows={3}
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                  onClick={() => {
                    setIsCancelDialogOpen(false)
                    setCancelReason("")
                  }}
                  disabled={actionLoading}
                  className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                İptal
              </Button>
              <Button
                  onClick={handleCancelConfirm}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? "İptal ediliyor..." : "Onayla"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}