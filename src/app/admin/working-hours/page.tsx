'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getActiveBarbers } from '@/lib/actions/barber.actions'
import {
  getWorkingHours,
  updateWorkingHours,
  getOverrides,
  createOverride,
  deleteOverride,
  type WorkingHour,
  type WorkingHourOverride,
} from '@/lib/actions/working-hours.actions'
import {
  Trash2,
  Clock,
  Ban,
  CheckCircle2,
  AlertCircle,
  CalendarX,
  Zap
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { BarberFilter } from '@/components/admin/BarberFilter'
import { cn } from '@/lib/utils'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 0, label: 'Pazar' },
]

function generateTimeOptions(): string[] {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(timeStr)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

interface WorkingHourDayItemProps {
  day: string
  dayOfWeek: number
  isWorking: boolean
  startTime: string
  endTime: string
  onUpdate: (dayOfWeek: number, startTime: string, endTime: string, isWorking: boolean) => void
  saving: boolean
}

function WorkingHourDayItem({
                              day,
                              dayOfWeek,
                              isWorking,
                              startTime,
                              endTime,
                              onUpdate,
                              saving,
                            }: WorkingHourDayItemProps) {
  const [localIsWorking, setLocalIsWorking] = useState(isWorking)
  const [localStartTime, setLocalStartTime] = useState(startTime)
  const [localEndTime, setLocalEndTime] = useState(endTime)

  useEffect(() => {
    setLocalStartTime(startTime)
    setLocalEndTime(endTime)
    setLocalIsWorking(isWorking)
  }, [startTime, endTime, isWorking])

  return (
      <Card className={cn(
          "transition-all",
          localIsWorking
              ? "bg-white border-green-200 shadow-sm"
              : "bg-slate-50 border-slate-200 opacity-75"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-[120px]">
              <Switch
                  checked={localIsWorking}
                  onCheckedChange={(checked) => {
                    setLocalIsWorking(checked)
                    onUpdate(dayOfWeek, localStartTime, localEndTime, checked)
                  }}
                  disabled={saving}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-200"
              />
              <div>
                <p className="font-semibold text-slate-900">{day}</p>
                <p className="text-xs text-slate-600">
                  {localIsWorking ? 'Açık' : 'Kapalı'}
                </p>
              </div>
            </div>

            {localIsWorking && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 min-w-[60px]">Başlangıç</Label>
                    <Select
                        value={localStartTime}
                        onValueChange={(value) => {
                          setLocalStartTime(value)
                          onUpdate(dayOfWeek, value, localEndTime, localIsWorking)
                        }}
                        disabled={saving}
                    >
                      <SelectTrigger className="w-[100px] border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                        {TIME_OPTIONS.map(time => (
                            <SelectItem
                                key={time}
                                value={time}
                                className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                            >
                              {time}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-slate-400">→</span>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 min-w-[60px]">Bitiş</Label>
                    <Select
                        value={localEndTime}
                        onValueChange={(value) => {
                          setLocalEndTime(value)
                          onUpdate(dayOfWeek, localStartTime, value, localIsWorking)
                        }}
                        disabled={saving}
                    >
                      <SelectTrigger className="w-[100px] border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                        {TIME_OPTIONS.map(time => (
                            <SelectItem
                                key={time}
                                value={time}
                                className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                            >
                              {time}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
  )
}

export default function WorkingHoursPage() {
  const [barbers, setBarbers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [workingHours, setWorkingHours] = useState<Map<number, WorkingHour>>(new Map())
  const [overrides, setOverrides] = useState<WorkingHourOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [overrideDate, setOverrideDate] = useState<Date>()
  const [overrideStartTime, setOverrideStartTime] = useState('09:00')
  const [overrideEndTime, setOverrideEndTime] = useState('17:00')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [sendSms, setSendSms] = useState(true)

  useEffect(() => {
    loadBarbers()
  }, [])

  useEffect(() => {
    if (selectedBarberId) {
      loadData()
    }
  }, [selectedBarberId])

  const stats = useMemo(() => {
    const openDays = Array.from(workingHours.values()).filter(h => h.isWorking).length
    const totalOverrides = overrides.length
    const upcomingOverrides = overrides.filter(o => new Date(o.date) >= new Date()).length
    return { openDays, totalOverrides, upcomingOverrides }
  }, [workingHours, overrides])

  const loadBarbers = async () => {
    try {
      const barbersList = await getActiveBarbers()
      setBarbers(barbersList.map(b => ({ id: b.id, name: b.name })))
      setLoading(false)
    } catch (error) {
      console.error('Error loading barbers:', error)
      toast.error('Berberler yüklenirken hata oluştu')
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (!selectedBarberId) return

    setLoading(true)
    try {
      const [hours, overrideList] = await Promise.all([
        getWorkingHours(selectedBarberId),
        getOverrides(selectedBarberId),
      ])

      const hoursMap = new Map<number, WorkingHour>()
      for (const hour of hours) {
        hoursMap.set(hour.dayOfWeek, hour)
      }

      setWorkingHours(hoursMap)
      setOverrides(overrideList)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWorkingHour = async (
      dayOfWeek: number,
      startTime: string,
      endTime: string,
      isWorking: boolean
  ) => {
    if (!selectedBarberId) return

    setSaving(true)
    try {
      await updateWorkingHours(selectedBarberId, dayOfWeek, startTime, endTime, isWorking)
      toast.success('Çalışma saatleri güncellendi')
      await loadData()
    } catch (error: any) {
      console.error('Error updating working hours:', error)
      toast.error(error.message || 'Çalışma saatleri güncellenirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateOverride = async () => {
    if (!selectedBarberId || !overrideDate) {
      toast.error('Tarih seçilmelidir')
      return
    }

    if (!overrideStartTime || !overrideEndTime) {
      toast.error('Başlangıç ve bitiş saatleri seçilmelidir')
      return
    }

    setOverrideSaving(true)
    try {
      const dateStr = format(overrideDate, 'yyyy-MM-dd')
      const result = await createOverride(
          selectedBarberId,
          dateStr,
          overrideStartTime,
          overrideEndTime,
          overrideReason || undefined,
          sendSms
      )

      if (!result.success) {
        toast.error(result.error || 'Saat kapatılamadı')
        setOverrideSaving(false)
        return
      }

      if (result.cancelledCount && result.cancelledCount > 0) {
        const smsMessage = result.smsSentCount && result.smsSentCount > 0
            ? `${result.cancelledCount} randevu iptal edildi ve müşterilere SMS gönderildi.`
            : `${result.cancelledCount} randevu iptal edildi.`
        toast.success(smsMessage)
      } else {
        toast.success('Saatler kapatıldı')
      }

      setOverrideDate(undefined)
      setOverrideStartTime('09:00')
      setOverrideEndTime('17:00')
      setOverrideReason('')
      await loadData()
    } catch (error: any) {
      console.error('Error creating override:', error)
      toast.error(error.message || 'Override oluşturulurken hata oluştu')
    } finally {
      setOverrideSaving(false)
    }
  }

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await deleteOverride(overrideId)
      toast.success('Kapatma silindi')
      await loadData()
    } catch (error: any) {
      console.error('Error deleting override:', error)
      toast.error(error.message || 'Kapatma silinirken hata oluştu')
    }
  }

  const getWorkingHour = (dayOfWeek: number): WorkingHour | null => {
    return workingHours.get(dayOfWeek) || null
  }

  const isFormValid = overrideDate && overrideStartTime && overrideEndTime

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-slate-100" />
          <Skeleton className="h-32 bg-slate-100" />
        </div>
    )
  }

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Çalışma Saatleri</h1>
          <p className="text-sm text-slate-600 mt-1">
            Haftalık program ve özel gün/saat yönetimi
          </p>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Berber Seçimi</CardTitle>
            <CardDescription className="text-slate-600">
              Çalışma saatlerini yönetmek istediğiniz berberi seçin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarberFilter
                barbers={barbers}
                selectedBarberId={selectedBarberId}
                onSelect={setSelectedBarberId}
            />
          </CardContent>
        </Card>

        {selectedBarberId && (
            <>
              {loading ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32 bg-slate-100" />
                    <Skeleton className="h-32 bg-slate-100" />
                    <Skeleton className="h-32 bg-slate-100" />
                  </div>
              ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">
                          Açık Günler
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-900">{stats.openDays}</div>
                        <p className="text-xs text-green-700 mt-1">
                          / 7 gün
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">
                          Kapalı Saatler
                        </CardTitle>
                        <Ban className="h-4 w-4 text-red-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-900">{stats.totalOverrides}</div>
                        <p className="text-xs text-red-700 mt-1">
                          Toplam kapatma
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">
                          Yaklaşan
                        </CardTitle>
                        <CalendarX className="h-4 w-4 text-amber-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-900">{stats.upcomingOverrides}</div>
                        <p className="text-xs text-amber-700 mt-1">
                          Gelecek kapatmalar
                        </p>
                      </CardContent>
                    </Card>
                  </div>
              )}

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Haftalık Çalışma Saatleri
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Her gün için çalışma saatlerini ayarlayın
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 bg-slate-100" />
                        ))}
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {DAYS_OF_WEEK.map(day => {
                          const workingHour = getWorkingHour(day.value)
                          const isWorking = workingHour?.isWorking ? true : false
                          const startTime = workingHour?.startTime ?? '09:00'
                          const endTime = workingHour?.endTime ?? '17:00'

                          return (
                              <WorkingHourDayItem
                                  key={day.value}
                                  day={day.label}
                                  dayOfWeek={day.value}
                                  isWorking={isWorking}
                                  startTime={startTime}
                                  endTime={endTime}
                                  onUpdate={handleUpdateWorkingHour}
                                  saving={saving}
                              />
                          )
                        })}
                      </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <CalendarX className="h-5 w-5 text-red-600" />
                    Özel Gün / Saat Kapatma
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Belirli tarih ve saatleri kapatın, müşterilerinize otomatik bildirim gönderin
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Tarih *</Label>
                    <div className="flex gap-2">
                      <DatePicker
                          date={overrideDate}
                          onSelect={setOverrideDate}
                          placeholder="Tarih seçin"
                          className="flex-1"
                      />
                      <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOverrideDate(new Date())}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <Zap className="h-3.5 w-3.5 mr-1" />
                        Bugün
                      </Button>
                      <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOverrideDate(addDays(new Date(), 1))}
                          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        Yarın
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Başlangıç Saati *</Label>
                      <Select value={overrideStartTime} onValueChange={setOverrideStartTime}>
                        <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                          {TIME_OPTIONS.map(time => (
                              <SelectItem
                                  key={time}
                                  value={time}
                                  className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                              >
                                {time}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700">Bitiş Saati *</Label>
                      <Select value={overrideEndTime} onValueChange={setOverrideEndTime}>
                        <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                          {TIME_OPTIONS.map(time => (
                              <SelectItem
                                  key={time}
                                  value={time}
                                  className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                              >
                                {time}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Neden (Opsiyonel)</Label>
                    <Textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="İşletme tarafından kapatılan saatler"
                        rows={3}
                        className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                    />
                    <p className="text-xs text-slate-600">
                      Neden girilmezse müşteriye "İşletme tarafından kapatılan saatler" mesajı gönderilecektir
                    </p>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Checkbox
                        id="send-sms-checkbox"
                        checked={sendSms}
                        onCheckedChange={(checked) => setSendSms(checked as boolean)}
                        className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="send-sms-checkbox" className="cursor-pointer font-medium text-blue-900">
                        Müşterilere SMS gönder
                      </Label>
                      <p className="text-xs text-blue-700 mt-1">
                        Etkilenen randevulardaki müşterilere otomatik iptal bildirimi gönderilir
                      </p>
                    </div>
                  </div>

                  {isFormValid && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-amber-900 mb-1">Önizleme</h4>
                              <p className="text-sm text-amber-800">
                          <span className="font-medium">
                            {format(overrideDate, 'd MMMM yyyy', { locale: tr })}
                          </span>
                                {' '}tarihinde{' '}
                                <span className="font-medium">{overrideStartTime} - {overrideEndTime}</span>
                                {' '}saatleri kapatılacak.
                              </p>
                              {overrideReason && (
                                  <p className="text-xs text-amber-700 mt-1">
                                    Neden: {overrideReason}
                                  </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  )}

                  <Button
                      onClick={handleCreateOverride}
                      disabled={overrideSaving || !isFormValid}
                      className={cn(
                          "w-full",
                          isFormValid
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      )}
                  >
                    {overrideSaving ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Kapatılıyor...
                        </>
                    ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Bu Saatleri Kapat
                        </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-slate-900">Kapatılan Saatler</CardTitle>
                  <CardDescription className="text-slate-600">
                    Daha önce kapatılan saatlerin listesi
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 bg-slate-100" />
                        ))}
                      </div>
                  ) : overrides.length === 0 ? (
                      <div className="text-center py-12">
                        <CalendarX className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 font-medium">Henüz kapatılan saat yok</p>
                        <p className="text-slate-500 text-sm mt-1">
                          Özel günlerde saatleri kapatabilirsiniz
                        </p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {overrides.map(override => {
                          const overrideDate = new Date(override.date)
                          const isPast = overrideDate < new Date()

                          return (
                              <Card
                                  key={override.id}
                                  className={cn(
                                      "border-2 transition-all",
                                      isPast
                                          ? "border-slate-200 bg-slate-50 opacity-60"
                                          : "border-red-200 bg-red-50"
                                  )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge className={cn(
                                            "font-normal",
                                            isPast
                                                ? "bg-slate-200 text-slate-700 border-slate-300"
                                                : "bg-red-100 text-red-700 border-red-200"
                                        )}>
                                          {format(overrideDate, 'd MMMM yyyy', { locale: tr })}
                                        </Badge>
                                        {isPast && (
                                            <Badge className="bg-slate-200 text-slate-600 border-slate-300 text-xs">
                                              Geçmiş
                                            </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-slate-700">
                                        <Clock className="h-4 w-4" />
                                        <span className="font-medium">
                                  {override.startTime} - {override.endTime}
                                </span>
                                      </div>
                                      {override.reason && (
                                          <p className="text-sm text-slate-600 mt-2">
                                            {override.reason}
                                          </p>
                                      )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteOverride(override.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                          )
                        })}
                      </div>
                  )}
                </CardContent>
              </Card>
            </>
        )}
      </div>
  )
}