"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { 
  Calendar,
  Clock,
  User,
  Phone,
  Repeat,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Layers
} from "lucide-react"
import { getActiveBarbers } from "@/lib/actions/barber.actions"
import { getSubscriptions, createSubscription, cancelSubscription } from "@/lib/actions/subscription.actions"
import { getCustomerByPhone } from "@/lib/actions/appointment.actions"
import { SubscriptionRecurrenceType } from "@prisma/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { minutesToTime, parseTimeToMinutes } from "@/lib/time"
import { BarberFilter } from "@/components/admin/BarberFilter"
import { cn } from "@/lib/utils"

interface Barber {
  id: string
  name: string
}

interface Subscription {
  id: string
  barberId: string
  customerName: string
  customerPhone: string
  recurrenceType: SubscriptionRecurrenceType
  dayOfWeek: number
  weekOfMonth: number | null
  startTime: string
  durationMinutes: number
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: Date
  barber: {
    id: string
    name: string
  }
  appointmentRequests: Array<{
    id: string
    date: string
    status: string
  }>
}

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const RECURRENCE_TYPES = [
  { value: 'weekly', label: 'Haftalık' },
  { value: 'biweekly', label: '2 Haftada Bir' },
  { value: 'monthly', label: 'Aylık' },
]

function generateTimeSlots(): Array<{ time: string; disabled: boolean }> {
  const slots: Array<{ time: string; disabled: boolean }> = []
  for (let hour = 10; hour < 23; hour++) {
    slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, disabled: false })
    slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, disabled: false })
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function normalizePhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  
  if (digits.startsWith('90') && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`
  }
  
  if (digits.startsWith('0') && digits.length >= 11) {
    return `+90${digits.slice(1, 12)}`
  }
  
  if (digits.startsWith('5') && digits.length >= 10) {
    return `+90${digits.slice(0, 10)}`
  }
  
  if (digits.length > 0) {
    if (digits.startsWith('90')) {
      return `+${digits.slice(0, 12)}`
    }
    if (digits.startsWith('0')) {
      return `+90${digits.slice(1, 12)}`
    }
    if (digits.startsWith('5')) {
      return `+90${digits.slice(0, 10)}`
    }
    return `+90${digits.slice(0, 10)}`
  }
  
  return ''
}

function getRecurrenceDescription(
  recurrenceType: SubscriptionRecurrenceType,
  dayOfWeek: number,
  weekOfMonth: number | null,
  startTime?: string,
  durationMinutes?: number,
  startDate?: string,
  endDate?: string | null
): string {
  const dayName = DAY_NAMES[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
  
  let description = ''
  
  if (recurrenceType === 'weekly') {
    description = `Her hafta ${dayName}`
  } else if (recurrenceType === 'biweekly') {
    description = `2 haftada bir ${dayName}`
  } else {
    const weekText = weekOfMonth === 1 ? '1.' : weekOfMonth === 2 ? '2.' : weekOfMonth === 3 ? '3.' : weekOfMonth === 4 ? '4.' : '5.'
    description = `Her ayın ${weekText} ${dayName} günü`
  }
  
  if (startTime && durationMinutes) {
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = startMinutes + durationMinutes
    const endTime = minutesToTime(endMinutes)
    description += ` ${startTime} – ${endTime}`
  } else if (startTime) {
    description += ` ${startTime}`
  }
  
  if (startDate || endDate) {
    const dateParts: string[] = []
    if (startDate) {
      const start = format(new Date(startDate), 'dd.MM.yyyy', { locale: tr })
      dateParts.push(`Başlangıç: ${start}`)
    }
    if (endDate) {
      const end = format(new Date(endDate), 'dd.MM.yyyy', { locale: tr })
      dateParts.push(`Bitiş: ${end}`)
    }
    if (dateParts.length > 0) {
      description += `\n${dateParts.join(', ')}`
    }
  }
  
  return description
}

export default function AbonmanlarPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    barberId: '',
    customerName: '',
    customerPhone: '',
    recurrenceType: 'weekly' as SubscriptionRecurrenceType,
    dayOfWeek: 1,
    weekOfMonth: null as number | null,
    startTime: '',
    durationMinutes: 30,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (barbers.length === 1 && !formData.barberId) {
      setFormData(prev => ({ ...prev, barberId: barbers[0].id }))
    }
  }, [barbers, formData.barberId])

  useEffect(() => {
    const normalized = normalizePhone(formData.customerPhone)
    if (normalized !== formData.customerPhone) {
      setFormData(prev => ({ ...prev, customerPhone: normalized }))
      return
    }
    
    if (normalized && normalized.match(/^\+90[5][0-9]{9}$/)) {
      const timer = setTimeout(async () => {
        try {
          const customer = await getCustomerByPhone(normalized)
          if (customer && !formData.customerName) {
            setFormData(prev => ({ ...prev, customerName: customer.customerName }))
          }
        } catch (error) {
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [formData.customerPhone, formData.customerName])

  async function loadData() {
    try {
      setLoading(true)
      const [barbersData, subscriptionsData] = await Promise.all([
        getActiveBarbers(),
        getSubscriptions(),
      ])
      setBarbers(barbersData)
      setSubscriptions(subscriptionsData as any)
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubscriptions = useMemo(() => {
    let filtered = subscriptions

    if (selectedBarberId) {
      filtered = filtered.filter(sub => sub.barberId === selectedBarberId)
    }

    if (filterActive === 'all') return filtered
    return filtered.filter(sub => 
      filterActive === 'active' ? sub.isActive : !sub.isActive
    )
  }, [subscriptions, filterActive, selectedBarberId])

  const stats = useMemo(() => {
    const total = subscriptions.length
    const active = subscriptions.filter(s => s.isActive).length
    const inactive = total - active
    return { total, active, inactive }
  }, [subscriptions])

  function handleCreate() {
    setFormData({
      barberId: '',
      customerName: '',
      customerPhone: '',
      recurrenceType: 'weekly',
      dayOfWeek: 1,
      weekOfMonth: null,
      startTime: '',
      durationMinutes: 30,
      startDate: undefined,
      endDate: undefined,
    })
    setIsCreateDialogOpen(true)
  }

  const isFormValid = useMemo(() => {
    const finalBarberId = formData.barberId || (barbers.length === 1 ? barbers[0].id : '')
    return !!(
      finalBarberId &&
      formData.customerName &&
      formData.customerPhone &&
      formData.startTime &&
      formData.durationMinutes &&
      formData.startDate &&
      (formData.recurrenceType !== 'monthly' || formData.weekOfMonth)
    )
  }, [formData, barbers])

  async function handleSubmit() {
    const finalBarberId = formData.barberId || (barbers.length === 1 ? barbers[0].id : '')
    
    if (!finalBarberId || !formData.customerName || !formData.customerPhone || 
        !formData.startTime || !formData.durationMinutes || !formData.startDate) {
      toast.error('Tüm zorunlu alanları doldurun')
      return
    }

    if (formData.recurrenceType === 'monthly' && !formData.weekOfMonth) {
      toast.error('Aylık abonman için hafta numarası seçin')
      return
    }

    const normalizedPhone = normalizePhone(formData.customerPhone)
    if (!normalizedPhone.match(/^\+90[5][0-9]{9}$/)) {
      toast.error('Geçerli bir telefon numarası girin')
      return
    }

    try {
      await createSubscription({
        barberId: finalBarberId,
        customerName: formData.customerName,
        customerPhone: normalizedPhone,
        recurrenceType: formData.recurrenceType,
        dayOfWeek: formData.dayOfWeek,
        weekOfMonth: formData.recurrenceType === 'monthly' ? formData.weekOfMonth : null,
        startTime: formData.startTime,
        durationMinutes: formData.durationMinutes,
        startDate: format(formData.startDate, 'yyyy-MM-dd'),
        endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : null,
      })
      toast.success('Abonman oluşturuldu')
      setIsCreateDialogOpen(false)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Abonman oluşturulurken hata oluştu')
    }
  }

  async function handleCancel() {
    if (!selectedSubscription) return
    
    try {
      await cancelSubscription(selectedSubscription.id)
      toast.success('Abonman iptal edildi')
      setIsCancelDialogOpen(false)
      setSelectedSubscription(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Abonman iptal edilirken hata oluştu')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 bg-slate-100" />
          <Skeleton className="h-32 bg-slate-100" />
          <Skeleton className="h-32 bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Abonmanlar</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tekrarlayan randevu abonmanlarını yönetin
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Yeni Abonman
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Toplam Abonman
            </CardTitle>
            <Layers className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.active} aktif, {stats.inactive} pasif
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Aktif Abonmanlar
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.active}</div>
            <p className="text-xs text-green-700 mt-1">
              Devam eden abonmanlar
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Pasif Abonmanlar
            </CardTitle>
            <XCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.inactive}</div>
            <p className="text-xs text-slate-600 mt-1">
              İptal edilen abonmanlar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {barbers.length > 1 && (
              <div className="w-full sm:w-64">
                <BarberFilter
                  barbers={barbers}
                  selectedBarberId={selectedBarberId}
                  onBarberChange={setSelectedBarberId}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterActive('all')}
                className={cn(
                  "transition-all",
                  filterActive === 'all' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                Tümü
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterActive('active')}
                className={cn(
                  "transition-all",
                  filterActive === 'active' 
                    ? 'bg-green-600 text-white hover:bg-green-700 border-green-600' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                Aktif
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterActive('inactive')}
                className={cn(
                  "transition-all",
                  filterActive === 'inactive' 
                    ? 'bg-slate-600 text-white hover:bg-slate-700 border-slate-600' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                Pasif
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        {filteredSubscriptions.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Repeat className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600 font-medium">Abonman bulunamadı</p>
                <p className="text-slate-500 text-sm mt-1">
                  {filterActive === 'all' 
                    ? 'Henüz hiç abonman oluşturulmamış'
                    : filterActive === 'active'
                    ? 'Aktif abonman bulunmuyor'
                    : 'Pasif abonman bulunmuyor'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubscriptions.map((subscription) => {
              const dayName = DAY_NAMES[subscription.dayOfWeek === 0 ? 6 : subscription.dayOfWeek - 1]
              let recurrenceText = ''
              if (subscription.recurrenceType === 'weekly') {
                recurrenceText = `Her hafta ${dayName}`
              } else if (subscription.recurrenceType === 'biweekly') {
                recurrenceText = `2 haftada bir ${dayName}`
              } else {
                const weekText = subscription.weekOfMonth === 1 ? '1.' : subscription.weekOfMonth === 2 ? '2.' : subscription.weekOfMonth === 3 ? '3.' : subscription.weekOfMonth === 4 ? '4.' : '5.'
                recurrenceText = `Her ayın ${weekText} ${dayName}`
              }

              const startMinutes = parseTimeToMinutes(subscription.startTime)
              const endMinutes = startMinutes + subscription.durationMinutes
              const endTime = minutesToTime(endMinutes)

              return (
                <Card 
                  key={subscription.id}
                  className={cn(
                    "bg-white border-2 shadow-sm transition-all hover:shadow-md",
                    subscription.isActive 
                      ? "border-green-200 hover:border-green-300" 
                      : "border-slate-200 opacity-60"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {subscription.customerName}
                          </h3>
                          <Badge 
                            className={cn(
                              "mt-1 font-normal",
                              subscription.isActive 
                                ? "bg-green-100 text-green-700 border-green-200" 
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            )}
                          >
                            {subscription.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                        {subscription.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubscription(subscription)
                              setIsCancelDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Repeat className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{recurrenceText}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>{subscription.startTime} – {endTime}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">
                            {format(new Date(subscription.startDate), 'dd MMM yyyy', { locale: tr })}
                            {subscription.endDate && ` - ${format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: tr })}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="h-4 w-4" />
                          <span className="text-xs">{subscription.barber.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span className="text-xs">{subscription.customerPhone}</span>
                        </div>
                      </div>

                      {subscription.appointmentRequests.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-900">
                              {subscription.appointmentRequests.length}
                            </span>
                            {' '}aktif randevu
                          </p>
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-slate-900">Yeni Abonman</DialogTitle>
            <DialogDescription className="text-slate-600">
              Tekrarlayan randevu abonmanı oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {barbers.length > 1 && (
              <div className="space-y-2">
                <Label className="text-slate-700">Berber *</Label>
                <Select 
                  value={formData.barberId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, barberId: v }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    <SelectValue placeholder="Berber seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {barbers.map((b) => (
                      <SelectItem 
                        key={b.id} 
                        value={b.id}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Telefon *</Label>
                <Input
                  type="tel"
                  placeholder="5xxxxxxxxx"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Ad Soyad *</Label>
                <Input
                  placeholder="Müşteri adı"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-slate-700">Tekrar Türü *</Label>
                <Select 
                  value={formData.recurrenceType} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recurrenceType: v as SubscriptionRecurrenceType }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {RECURRENCE_TYPES.map((t) => (
                      <SelectItem 
                        key={t.value} 
                        value={t.value}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Gün *</Label>
                <Select 
                  value={formData.dayOfWeek.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {DAY_NAMES.map((day, idx) => (
                      <SelectItem 
                        key={idx} 
                        value={(idx + 1).toString()}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrenceType === 'monthly' && (
                <div className="space-y-2">
                  <Label className="text-slate-700">Hafta *</Label>
                  <Select 
                    value={formData.weekOfMonth?.toString() || ''} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, weekOfMonth: parseInt(v) }))}
                  >
                    <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                      <SelectValue placeholder="Hafta seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {[1, 2, 3, 4, 5].map((week) => (
                        <SelectItem 
                          key={week} 
                          value={week.toString()}
                          className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                        >
                          {week}. Hafta
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Saat *</Label>
                <Select 
                  value={formData.startTime} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, startTime: v }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    <SelectValue placeholder="Saat seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem 
                        key={slot.time} 
                        value={slot.time}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {slot.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Süre *</Label>
                <Select 
                  value={formData.durationMinutes.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(v) }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="30" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">30 dakika</SelectItem>
                    <SelectItem value="60" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">60 dakika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Başlangıç Tarihi *</Label>
                <DatePicker
                  date={formData.startDate}
                  onSelect={(d) => setFormData(prev => ({ ...prev, startDate: d }))}
                  placeholder="Tarih seçin"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Bitiş Tarihi (Opsiyonel)</Label>
                <DatePicker
                  date={formData.endDate}
                  onSelect={(d) => setFormData(prev => ({ ...prev, endDate: d }))}
                  placeholder="Bitiş tarihi"
                  className="w-full"
                />
              </div>
            </div>

            {isFormValid && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Önizleme</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-line">
                    {getRecurrenceDescription(
                      formData.recurrenceType,
                      formData.dayOfWeek,
                      formData.weekOfMonth,
                      formData.startTime,
                      formData.durationMinutes,
                      formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : undefined,
                      formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : undefined
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid}
              className={cn(
                isFormValid 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Abonmanı İptal Et</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Bu abonmanı iptal etmek istediğinizden emin misiniz? Gelecekteki tüm randevular iptal edilecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Evet, İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
