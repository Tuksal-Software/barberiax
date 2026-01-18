"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Hourglass,
  CheckCheck,
  CircleCheck,
  Repeat,
} from "lucide-react"
import { getActiveBarbers } from "@/lib/actions/barber.actions"
import { getAllAppointmentRequests } from "@/lib/actions/appointment-query.actions"
import { approveAppointmentRequest, cancelAppointmentRequest, getCustomerByPhone } from "@/lib/actions/appointment.actions"
import { parseTimeToMinutes, getNowUTC } from "@/lib/time"
import { AppointmentRequestStatus } from "@prisma/client"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { BarberFilter } from "@/components/admin/BarberFilter"
import { cn } from "@/lib/utils"

interface Barber {
  id: string
  name: string
}

interface Appointment {
  id: string
  subscriptionId?: string | null
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  date: string
  requestedStartTime: string
  requestedEndTime: string | null
  serviceType: string | null
  status: AppointmentRequestStatus
  cancelledBy: string | null
  barberId: string
  barberName: string
  appointmentSlots?: Array<{
    startTime: string
    endTime: string
  }>
}

type StatusFilter = 'all' | AppointmentRequestStatus

export default function RandevularPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [quickApproveOpen, setQuickApproveOpen] = useState<string | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, selectedBarberId, selectedStatus])

  useEffect(() => {
    if (!selectedAppointment) {
      return
    }

    if (selectedAppointment.status === 'approved' && selectedAppointment.appointmentSlots && selectedAppointment.appointmentSlots.length > 0) {
      const slot = selectedAppointment.appointmentSlots[0]
      const startMinutes = parseTimeToMinutes(slot.startTime)
      const endMinutes = parseTimeToMinutes(slot.endTime)
      const duration = endMinutes - startMinutes

      if (duration === 30 || duration === 60) {
        setSelectedDuration(duration as 30 | 60)
        return
      }
    }

    if (selectedAppointment.status === 'pending' || selectedAppointment.status === 'rejected') {
      if (!selectedAppointment.requestedEndTime) {
        if (selectedAppointment.serviceType === 'sac_sakal') {
          setSelectedDuration(60)
        } else {
          setSelectedDuration(30)
        }
        return
      }

      const startMinutes = parseTimeToMinutes(selectedAppointment.requestedStartTime)
      const endMinutes = parseTimeToMinutes(selectedAppointment.requestedEndTime)
      const maxDuration = endMinutes - startMinutes

      if (maxDuration >= 60) {
        setSelectedDuration(60)
      } else {
        setSelectedDuration(30)
      }
    } else {
      if (selectedAppointment.requestedEndTime) {
        const startMinutes = parseTimeToMinutes(selectedAppointment.requestedStartTime)
        const endMinutes = parseTimeToMinutes(selectedAppointment.requestedEndTime)
        const duration = endMinutes - startMinutes
        if (duration === 30 || duration === 60) {
          setSelectedDuration(duration as 30 | 60)
        } else {
          setSelectedDuration(30)
        }
      } else {
        setSelectedDuration(30)
      }
    }
  }, [selectedAppointment])

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayAppts = appointments.filter(a => a.date === today)

    return {
      today: todayAppts.filter(a => a.status === 'approved' || a.status === 'done').length,
      pending: appointments.filter(a => a.status === 'pending').length,
      approved: appointments.filter(a => a.status === 'approved').length,
      done: appointments.filter(a => a.status === 'done').length,
    }
  }, [appointments])

  const loadData = async () => {
    setLoading(true)
    try {
      const barbersList = await getActiveBarbers()
      setBarbers(barbersList.map(b => ({ id: b.id, name: b.name })))

      const requests = await getAllAppointmentRequests()

      setAppointments(requests.map(r => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerEmail: r.customerEmail || undefined,
        date: r.date,
        requestedStartTime: r.requestedStartTime,
        requestedEndTime: r.requestedEndTime,
        serviceType: r.serviceType,
        status: r.status,
        cancelledBy: r.cancelledBy,
        barberId: r.barberId,
        barberName: r.barberName,
        appointmentSlots: r.appointmentSlots,
      })))
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Randevular yüklenirken hata oluştu")
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = [...appointments]

    if (selectedBarberId) {
      filtered = filtered.filter(apt => apt.barberId === selectedBarberId)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === selectedStatus)
    }

    // Sort: pending first, then by date and time
    filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1

      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.requestedStartTime.localeCompare(b.requestedStartTime)
    })

    setFilteredAppointments(filtered)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
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

  const handleQuickApproveWithDuration = async (appointment: Appointment, duration: 30 | 60) => {
    setQuickApproveOpen(null)
    setActionLoading(true)
    try {
      await approveAppointmentRequest({
        appointmentRequestId: appointment.id,
        approvedDurationMinutes: duration,
      })

      toast.success("Randevu onaylandı")
      await loadData()
    } catch (error) {
      console.error("Error approving appointment:", error)
      toast.error(error instanceof Error ? error.message : "Randevu onaylanırken hata oluştu")
    } finally {
      setActionLoading(false)
    }
  }

  const handleQuickCancel = async (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAppointment(appointment)
    setIsCancelDialogOpen(true)
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

  const getServiceTypeText = (serviceType: string | null): string => {
    if (serviceType === 'sac') return 'Saç'
    if (serviceType === 'sakal') return 'Sakal'
    if (serviceType === 'sac_sakal') return 'Saç ve Sakal'
    return 'Belirtilmedi'
  }

  const getStatusBadge = (status: AppointmentRequestStatus, subscriptionId?: string | null) => {
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

  const formatAppointmentTimeRange = (
      requestedStart: string,
      requestedEnd: string | null,
      slots?: Array<{ startTime: string; endTime: string }>
  ): string => {
    if (slots && slots.length > 0) {
      return `${slots[0].startTime} - ${slots[0].endTime}`
    }
    if (requestedEnd) {
      return `${requestedStart} - ${requestedEnd}`
    }
    return requestedStart
  }

  const isPastAppointment = (appointment: Appointment): boolean => {
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
      const appointmentStartTime = appointment.appointmentSlots && appointment.appointmentSlots.length > 0
          ? appointment.appointmentSlots[0].startTime
          : appointment.requestedStartTime
      const appointmentStartMinutes = parseTimeToMinutes(appointmentStartTime)
      return appointmentStartMinutes < currentMinutes
    }

    return false
  }

  const getBorderColor = (status: AppointmentRequestStatus, subscriptionId?: string | null, cancelledBy?: string | null): string => {
    if (subscriptionId) return 'border-purple-500'
    if (status === 'cancelled' && cancelledBy === 'customer') return 'border-orange-500'

    switch (status) {
      case 'approved': return 'border-green-500'
      case 'pending': return 'border-amber-500'
      case 'done': return 'border-emerald-500'
      case 'cancelled': return 'border-red-500'
      case 'rejected': return 'border-slate-400'
      default: return 'border-slate-300'
    }
  }

  const getBackgroundColor = (status: AppointmentRequestStatus, subscriptionId?: string | null, cancelledBy?: string | null): string => {
    if (subscriptionId) return 'bg-purple-50'
    if (status === 'cancelled' && cancelledBy === 'customer') return 'bg-orange-50'

    switch (status) {
      case 'approved': return 'bg-green-50'
      case 'pending': return 'bg-amber-50'
      case 'done': return 'bg-emerald-50'
      case 'cancelled': return 'bg-red-50'
      case 'rejected': return 'bg-slate-50'
      default: return 'bg-white'
    }
  }

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
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-40 bg-slate-100" />
            ))}
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Randevular</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tüm randevuları yönetin, onaylayın veya iptal edin
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
                Onaylandı
              </CardTitle>
              <CheckCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
              <p className="text-xs text-green-700 mt-1">
                Onaylanmış randevular
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">
                Tamamlanan
              </CardTitle>
              <CircleCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">{stats.done}</div>
              <p className="text-xs text-emerald-700 mt-1">
                Tamamlanmış randevular
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

              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                    size="sm"
                    onClick={() => setSelectedStatus('all')}
                    className={cn(
                        "transition-all",
                        selectedStatus === 'all'
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                >
                  Tümü
                </Button>
                <Button
                    size="sm"
                    onClick={() => setSelectedStatus('pending')}
                    className={cn(
                        "transition-all",
                        selectedStatus === 'pending'
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                >
                  Bekleyen
                </Button>
                <Button
                    size="sm"
                    onClick={() => setSelectedStatus('approved')}
                    className={cn(
                        "transition-all",
                        selectedStatus === 'approved'
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                >
                  Onaylanan
                </Button>
                <Button
                    size="sm"
                    onClick={() => setSelectedStatus('done')}
                    className={cn(
                        "transition-all",
                        selectedStatus === 'done'
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                >
                  Tamamlanan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div>
          {filteredAppointments.length === 0 ? (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600 font-medium">Randevu bulunamadı</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {selectedStatus !== 'all'
                          ? `${selectedStatus === 'pending' ? 'Bekleyen' : selectedStatus === 'approved' ? 'Onaylanmış' : selectedStatus === 'done' ? 'Tamamlanmış' : 'Bu durumda'} randevu bulunmuyor`
                          : 'Henüz hiç randevu yok'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
          ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment) => {
                  const borderColor = getBorderColor(appointment.status, appointment.subscriptionId, appointment.cancelledBy)
                  const bgColor = getBackgroundColor(appointment.status, appointment.subscriptionId, appointment.cancelledBy)
                  const isPast = isPastAppointment(appointment)
                  const isDone = appointment.status === 'done'
                  const isPending = appointment.status === 'pending'
                  const canQuickAction = isPending && !isPast

                  return (
                      <Card
                          key={appointment.id}
                          className={cn(
                              "border-2 shadow-sm transition-all cursor-pointer hover:shadow-md",
                              borderColor,
                              bgColor,
                              (isDone || isPast) && "opacity-60"
                          )}
                          onClick={() => handleAppointmentClick(appointment)}
                      >
                        <CardContent className="p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Left: Customer Info */}
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">
                                    {appointment.customerName}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Phone className="h-3.5 w-3.5 text-slate-600" />
                                    <span className="text-sm text-slate-600">{appointment.customerPhone}</span>
                                  </div>
                                </div>
                                {getStatusBadge(appointment.status, appointment.subscriptionId)}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">{formatDate(appointment.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">
                              {formatAppointmentTimeRange(
                                  appointment.requestedStartTime,
                                  appointment.requestedEndTime,
                                  appointment.appointmentSlots
                              )}
                            </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <span>{appointment.barberName}</span>
                                </div>
                              </div>

                              {appointment.subscriptionId && (
                                  <div className="flex items-center gap-2 text-sm text-purple-700">
                                    <Repeat className="h-4 w-4" />
                                    <span className="font-medium">Abonman Randevusu</span>
                                  </div>
                              )}

                              {appointment.status === 'cancelled' && appointment.cancelledBy === 'customer' && (
                                  <div className="text-sm text-orange-700 font-medium">
                                    ⚠️ Müşteri tarafından iptal edildi
                                  </div>
                              )}
                            </div>

                            {/* Right: Quick Actions */}
                            {canQuickAction && (
                                <div className="flex gap-2 lg:flex-col lg:min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                  <Popover open={quickApproveOpen === appointment.id} onOpenChange={(open) => setQuickApproveOpen(open ? appointment.id : null)}>
                                    <PopoverTrigger asChild>
                                      <Button
                                          size="sm"
                                          disabled={actionLoading}
                                          className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Onayla
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                      className="w-44 p-2 bg-white border-slate-200" 
                                      align="end"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-700 mb-2 px-2">Süre Seçin</p>
                                        <Button
                                            size="sm"
                                            onClick={() => handleQuickApproveWithDuration(appointment, 30)}
                                            disabled={actionLoading}
                                            className="w-full justify-start bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-green-500"
                                        >
                                          <Clock className="h-4 w-4 mr-2" />
                                          30 dakika
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleQuickApproveWithDuration(appointment, 60)}
                                            disabled={actionLoading}
                                            className="w-full justify-start bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-green-500"
                                        >
                                          <Clock className="h-4 w-4 mr-2" />
                                          60 dakika
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  
                                  <Button
                                      size="sm"
                                      onClick={(e) => handleQuickCancel(appointment, e)}
                                      disabled={actionLoading}
                                      className="flex-1 lg:flex-none bg-white border-2 border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    İptal
                                  </Button>
                                </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                  )
                })}
              </div>
          )}
        </div>

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
                        {formatAppointmentTimeRange(
                            selectedAppointment.requestedStartTime,
                            selectedAppointment.requestedEndTime,
                            selectedAppointment.appointmentSlots
                        )}
                      </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">Hizmet:</span>
                          <span className="text-slate-900 font-medium">
                        {getServiceTypeText(selectedAppointment.serviceType)}
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
                    {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'approved') && !isPastAppointment(selectedAppointment) && (
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
                                  "Kaydediliyor..."
                              ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {selectedAppointment.status === 'approved' ? 'Süreyi Güncelle' : selectedDuration === 60 ? 'Süreyi Güncelle' : 'Onayla'}
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
                Vazgeç
              </Button>
              <Button
                  onClick={handleCancelConfirm}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? "İptal ediliyor..." : "Evet, İptal Et"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}

