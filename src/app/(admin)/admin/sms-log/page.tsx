"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DateRangePicker } from "@/components/ui/date-picker"
import { getSmsLogs, getLastReminderJobRun } from "@/lib/actions/sms-log.actions"
import type { SmsLogItem } from "@/lib/actions/sms-log.actions"
import { toast } from "sonner"
import { AlertCircle, CheckCircle, Filter, X, Search, MessageSquare, Clock } from "lucide-react"
import { formatDateTimeLongTR, formatDateTimeUTC } from "@/lib/time/formatDate"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default function SmsLogPage() {
  const [logs, setLogs] = useState<SmsLogItem[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SmsLogItem[]>([])
  const [customerNameMap, setCustomerNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [lastReminderRun, setLastReminderRun] = useState<Date | null>(null)
  const [fromDate, setFromDate] = useState<Date>()
  const [toDate, setToDate] = useState<Date>()
  const [filters, setFilters] = useState({
    event: 'all' as string,
    status: 'all' as string,
    search: '',
  })

  useEffect(() => {
    loadLogs()
    loadLastReminderRun()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, filters, fromDate, toDate])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getSmsLogs(100)
      setLogs(data.logs)
      setCustomerNameMap(data.customerNameMap)
    } catch (error) {
      console.error("Error loading SMS logs:", error)
      toast.error("SMS logları yüklenirken hata oluştu")
      setLogs([])
      setCustomerNameMap({})
    } finally {
      setLoading(false)
    }
  }

  const loadLastReminderRun = async () => {
    try {
      const lastRun = await getLastReminderJobRun()
      setLastReminderRun(lastRun)
    } catch (error) {
      console.error("Error loading last reminder run:", error)
      setLastReminderRun(null)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    if (filters.event !== 'all') {
      filtered = filtered.filter(log => log.event === filters.event)
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(log => 
        filters.status === 'success' ? log.status === 'success' : log.status === 'error'
      )
    }

    if (fromDate) {
      filtered = filtered.filter(log => new Date(log.createdAt) >= fromDate)
    }
    if (toDate) {
      const endOfDay = new Date(toDate)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter(log => new Date(log.createdAt) <= endOfDay)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(log => 
        log.to.toLowerCase().includes(searchLower) ||
        log.message.toLowerCase().includes(searchLower)
      )
    }

    setFilteredLogs(filtered)
  }

  const clearFilters = () => {
    setFilters({
      event: 'all',
      status: 'all',
      search: '',
    })
    setFromDate(undefined)
    setToDate(undefined)
  }

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  const getEventLabel = (event: string): string => {
    const reminderEventRegex = /^(APPOINTMENT_REMINDER_HOUR_[12]|APPOINTMENT_REMINDER_CUSTOM_(\d+)H)_(.+)$/
    const match = event.match(reminderEventRegex)
    
    if (match) {
      const reminderType = match[1]
      const hoursUntil = match[2]
      const appointmentRequestId = match[3]
      const customerName = customerNameMap[appointmentRequestId]
      
      let baseLabel = ''
      if (reminderType === 'APPOINTMENT_REMINDER_HOUR_2') {
        baseLabel = 'Randevu Hatırlatma (2 Saat)'
      } else if (reminderType === 'APPOINTMENT_REMINDER_HOUR_1') {
        baseLabel = 'Randevu Hatırlatma (1 Saat)'
      } else if (reminderType?.startsWith('APPOINTMENT_REMINDER_CUSTOM_')) {
        baseLabel = `Randevu Hatırlatma (${hoursUntil} Saat)`
      } else {
        baseLabel = 'Randevu Hatırlatma'
      }
      
      if (customerName) {
        return `${baseLabel} – ${customerName}`
      }
      return baseLabel
    }

    const eventMap: Record<string, string> = {
      AppointmentCreated: 'Yeni Randevu Talebi',
      AppointmentApproved: 'Randevu Onaylandı',
      AppointmentCancelledPending: 'Randevu İptal Edildi',
      AppointmentCancelledApproved: 'Onaylı Randevu İptal Edildi',
      SubscriptionCreated: 'Abonelik Oluşturuldu',
      SubscriptionCancelled: 'Abonelik İptal Edildi',
      AdminAppointmentCreated: 'Yönetici Randevu Oluşturdu',
      WAITLIST_NOTIFICATION: 'Bekleme Listesi Bildirimi',
      CUSTOMER_CANCEL_ADMIN_NOTIFY: 'Müşteri İptali - Admin Bildirimi',
      CUSTOMER_CANCEL_SUCCESS: 'Müşteri İptali Başarılı',
      CUSTOMER_CANCEL_OTP: 'Müşteri İptali - OTP Kodu',
      VIEW_APPOINTMENTS_OTP: 'Randevuları Görüntüleme - OTP Kodu',
    }

    return eventMap[event] || event
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SMS Logları</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gönderilen SMS mesajlarının kayıtları
          </p>
        </div>
        {lastReminderRun && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Son çalıştırma:</span>
            <span>{formatDateTimeUTC(lastReminderRun)}</span>
          </div>
        )}
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-slate-900">Filtreler</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Event Türü</label>
              <Select 
                value={filters.event} 
                onValueChange={(value) => setFilters({ ...filters, event: value })}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Tümü
                  </SelectItem>
                  <SelectItem value="AppointmentCreated" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Yeni Randevu Talebi
                  </SelectItem>
                  <SelectItem value="AppointmentApproved" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Randevu Onaylandı
                  </SelectItem>
                  <SelectItem value="AppointmentCancelledPending" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Randevu İptal Edildi
                  </SelectItem>
                  <SelectItem value="AppointmentCancelledApproved" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Onaylı Randevu İptal Edildi
                  </SelectItem>
                  <SelectItem value="SubscriptionCreated" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Abonelik Oluşturuldu
                  </SelectItem>
                  <SelectItem value="AdminAppointmentCreated" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Yönetici Randevu
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Durum</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Tümü
                  </SelectItem>
                  <SelectItem value="success" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Başarılı
                  </SelectItem>
                  <SelectItem value="error" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                    Hata
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-slate-700">Tarih Aralığı</label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onFromSelect={setFromDate}
                onToSelect={setToDate}
                fromPlaceholder="Başlangıç"
                toPlaceholder="Bitiş"
                className="grid-cols-1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Telefon veya mesaj ara..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-600" />
              SMS Gönderim Geçmişi
            </CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {filteredLogs.length} kayıt
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-100" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-2">
                <MessageSquare className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-slate-600 font-medium">SMS kaydı bulunamadı</p>
              <p className="text-slate-500 text-sm mt-1">
                {logs.length === 0 
                  ? "Henüz hiç SMS gönderilmemiş" 
                  : "Filtrelerinizi değiştirerek tekrar deneyin"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-slate-700 font-semibold">Tarih</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Event</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Telefon</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Mesaj</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id}
                      className={cn(
                        "border-slate-100 hover:bg-slate-50 transition-colors",
                        log.isAdmin && "bg-blue-50/30"
                      )}
                    >
                      <TableCell className="text-sm text-slate-700">
                        {formatDateTimeLongTR(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="border-slate-200 text-slate-700 bg-white font-normal"
                        >
                          {log.eventLabel || getEventLabel(log.event)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900">{log.to}</span>
                          {log.isAdmin && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              ADMIN
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {log.message.length > 50 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-slate-700 hover:text-slate-900 underline decoration-dotted">
                                  {truncateMessage(log.message)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md bg-white border-slate-200 text-slate-900">
                                <p className="whitespace-pre-wrap text-sm">{log.message}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-slate-700">{log.message}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Başarılı
                          </Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 cursor-help">
                                    <AlertCircle className="h-3 w-3" />
                                    Hata
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              {log.error && (
                                <TooltipContent className="max-w-md bg-white border-slate-200 text-slate-900">
                                  <p className="whitespace-pre-wrap text-sm">{log.error}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
