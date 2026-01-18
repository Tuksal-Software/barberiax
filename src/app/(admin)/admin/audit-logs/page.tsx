"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getAuditLogs } from "@/lib/actions/audit.actions"
import type { AuditLogItem } from "@/lib/actions/audit.actions"
import { formatDistanceToNow, format } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { formatDateTimeLongTR } from "@/lib/time/formatDate"
import { User, Shield, Server, ChevronDown, Filter, Search, X } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [fromDate, setFromDate] = useState<Date>()
  const [toDate, setToDate] = useState<Date>()
  const [filters, setFilters] = useState({
    actorType: 'all' as string,
    action: 'all' as string,
    entityType: 'all' as string,
    search: '',
  })

  useEffect(() => {
    loadLogs()
  }, [filters, fromDate, toDate])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getAuditLogs({
        actorType: filters.actorType !== 'all' ? filters.actorType as 'customer' | 'admin' | 'system' : undefined,
        action: filters.action !== 'all' ? filters.action : undefined,
        entityType: filters.entityType !== 'all' ? filters.entityType as 'appointment' | 'ledger' | 'expense' | 'sms' | 'auth' | 'ui' | 'other' : undefined,
        fromDate: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
        toDate: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
        search: filters.search || undefined,
        limit: 100,
      })
      setLogs(data)
    } catch (error) {
      console.error("Error loading audit logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      actorType: 'all',
      action: 'all',
      entityType: 'all',
      search: '',
    })
    setFromDate(undefined)
    setToDate(undefined)
  }

  const getActionLabel = (action: string): string => {
    const actionMap: Record<string, string> = {
      UI_PHONE_ENTERED: 'Telefon Numarası Girildi',
      UI_NAME_ENTERED: 'İsim Girildi',
      UI_CANCEL_ATTEMPT: 'İptal Denemesi',
      UI_FORM_ABANDONED: 'Form Terk Edildi',
      UI_SETTINGS_SAVED: 'Ayar Kaydedildi',
      APPOINTMENT_CREATE_ATTEMPT: 'Randevu Oluşturma Denemesi',
      APPOINTMENT_CREATED: 'Randevu Oluşturuldu',
      APPOINTMENT_APPROVED: 'Randevu Onaylandı',
      APPOINTMENT_CANCELLED: 'Randevu İptal Edildi',
      APPOINTMENT_CANCEL_ATTEMPT: 'Randevu İptal Denemesi',
      APPOINTMENT_CANCEL_BLOCKED_PAST: 'Geçmiş Randevu İptali Engellendi',
      APPOINTMENT_CANCEL_DENIED: 'Randevu İptali Reddedildi',
      CUSTOMER_CANCEL_PHONE_ENTERED: 'Müşteri İptal Telefon Girildi',
      CUSTOMER_CANCEL_OTP_SENT: 'Müşteri İptal OTP Gönderildi',
      CUSTOMER_CANCEL_CONFIRMED: 'Müşteri İptali Onaylandı',
      CUSTOMER_CANCEL_FAILED: 'Müşteri İptali Başarısız',
      SETTINGS_CREATED: 'Ayar Oluşturuldu',
      SETTINGS_UPDATED: 'Ayarlar Güncellendi',
      LEDGER_CREATED: 'Defter Kaydı Oluşturuldu',
      LEDGER_UPDATED: 'Defter Kaydı Güncellendi',
      LEDGER_DELETED: 'Defter Kaydı Silindi',
      EXPENSE_CREATED: 'Gider Oluşturuldu',
      EXPENSE_UPDATED: 'Gider Güncellendi',
      EXPENSE_DELETED: 'Gider Silindi',
      SMS_SENT: 'SMS Gönderildi',
      SMS_FAILED: 'SMS Başarısız',
      WORKING_HOUR_UPDATED: 'Çalışma Saati Güncellendi',
      WORKING_HOUR_OVERRIDE_CREATED: 'Çalışma Saati İstisnası Oluşturuldu',
      WORKING_HOUR_OVERRIDE_DELETED: 'Çalışma Saati İstisnası Silindi',
      WORKING_HOUR_OVERRIDE_APPLIED: 'Çalışma Saati İstisnası Uygulandı',
      APPOINTMENT_CANCELLED_BY_OVERRIDE: 'Randevu İstisna Nedeniyle İptal Edildi',
      SUBSCRIPTION_CREATED: 'Abonelik Oluşturuldu',
      SUBSCRIPTION_UPDATED: 'Abonelik Güncellendi',
      SUBSCRIPTION_CANCELLED: 'Abonelik İptal Edildi',
      SUBSCRIPTION_APPOINTMENTS_GENERATED: 'Abonelik Randevuları Oluşturuldu',
      SUBSCRIPTION_APPOINTMENT_CANCELLED: 'Abonelik Randevusu İptal Edildi',
      SUBSCRIPTION_CANCEL_BLOCKED: 'Abonelik İptali Engellendi',
      ADMIN_APPOINTMENT_CREATED: 'Yönetici Randevu Oluşturdu',
      AUTH_LOGIN: 'Yönetici Giriş Yaptı',
      AUTH_LOGOUT: 'Yönetici Çıkış Yaptı',
    }
    return actionMap[action] || action
  }

  const getEntityLabel = (entityType: string): string => {
    const entityMap: Record<string, string> = {
      appointment: 'Randevu',
      ledger: 'Defter',
      expense: 'Gider',
      sms: 'SMS',
      auth: 'Kimlik Doğrulama',
      ui: 'Arayüz',
      settings: 'Ayarlar',
      other: 'Diğer',
    }
    return entityMap[entityType] || entityType
  }


  const formatRelativeDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr })
  }

  const getActorBadge = (actorType: string) => {
    switch (actorType) {
      case 'admin':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Yönetici
          </Badge>
        )
      case 'customer':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
            <User className="h-3 w-3" />
            Müşteri
          </Badge>
        )
      case 'system':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1">
            <Server className="h-3 w-3" />
            Sistem
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-slate-200 text-slate-700">
            {actorType}
          </Badge>
        )
    }
  }

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED')) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
          Oluşturuldu
        </Badge>
      )
    }
    if (action.includes('UPDATED') || action.includes('APPROVED')) {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Güncellendi
        </Badge>
      )
    }
    if (action.includes('DELETED') || action.includes('CANCELLED')) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
          İptal/Silindi
        </Badge>
      )
    }
    if (action.includes('SMS_SENT')) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
          SMS Gönderildi
        </Badge>
      )
    }
    if (action.includes('SMS_FAILED')) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
          SMS Başarısız
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-700 text-xs">
        İşlem
      </Badge>
    )
  }

  const formatMetadata = (metadata: any): React.ReactElement[] => {
    if (!metadata) return []
    try {
      const items: React.ReactElement[] = []
      const processValue = (key: string, value: any): string => {
        if (value === null) return '-'
        if (value === undefined) return '-'
        if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      }
      const processObject = (obj: any, prefix = '') => {
        Object.keys(obj).forEach((key) => {
          const value = obj[key]
          const fullKey = prefix ? `${prefix}.${key}` : key
          if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
            processObject(value, fullKey)
          } else {
            items.push(
              <div key={fullKey} className="flex gap-2">
                <span className="font-medium text-slate-900">{fullKey}:</span>
                <span className="text-slate-600">{processValue(fullKey, value)}</span>
              </div>
            )
          }
        })
      }
      processObject(metadata)
      return items
    } catch {
      return [<div key="error" className="text-slate-600">{String(metadata)}</div>]
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sistem Logları</h1>
          <p className="text-sm text-slate-600 mt-1">
            Sistemdeki tüm işlemleri görüntüleyin ve filtreleyin
          </p>
        </div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Kullanıcı Tipi</label>
              <Select 
                value={filters.actorType} 
                onValueChange={(value) => setFilters({ ...filters, actorType: value })}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Tümü</SelectItem>
                  <SelectItem value="admin" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Yönetici</SelectItem>
                  <SelectItem value="customer" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Müşteri</SelectItem>
                  <SelectItem value="system" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Sistem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">İşlem Türü</label>
              <Select 
                value={filters.action} 
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                  <SelectItem value="all" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Tümü</SelectItem>
                  <SelectItem value="APPOINTMENT_CREATED" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Randevu Oluşturuldu</SelectItem>
                  <SelectItem value="APPOINTMENT_APPROVED" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Randevu Onaylandı</SelectItem>
                  <SelectItem value="APPOINTMENT_CANCELLED" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Randevu İptal Edildi</SelectItem>
                  <SelectItem value="SMS_SENT" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">SMS Gönderildi</SelectItem>
                  <SelectItem value="SMS_FAILED" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">SMS Başarısız</SelectItem>
                  <SelectItem value="AUTH_LOGIN" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Yönetici Giriş Yaptı</SelectItem>
                  <SelectItem value="AUTH_LOGOUT" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Yönetici Çıkış Yaptı</SelectItem>
                  <SelectItem value="SETTINGS_UPDATED" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Ayarlar Güncellendi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Etkilenen Alan</label>
              <Select 
                value={filters.entityType} 
                onValueChange={(value) => setFilters({ ...filters, entityType: value })}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Tümü</SelectItem>
                  <SelectItem value="appointment" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Randevu</SelectItem>
                  <SelectItem value="ledger" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Defter</SelectItem>
                  <SelectItem value="expense" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Gider</SelectItem>
                  <SelectItem value="sms" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">SMS</SelectItem>
                  <SelectItem value="auth" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Kimlik Doğrulama</SelectItem>
                  <SelectItem value="ui" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Arayüz</SelectItem>
                  <SelectItem value="settings" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Ayarlar</SelectItem>
                  <SelectItem value="other" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Tarih Aralığı</label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onFromSelect={setFromDate}
                onToSelect={setToDate}
                fromPlaceholder="Başlangıç tarihi"
                toPlaceholder="Bitiş tarihi"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Özet veya detaylarda ara..."
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
            <CardTitle className="text-slate-900">Denetim Kayıtları</CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {logs.length} kayıt
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
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-2">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-slate-600 font-medium">Denetim kaydı bulunamadı</p>
              <p className="text-slate-500 text-sm mt-1">
                Filtrelerinizi değiştirerek tekrar deneyin
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-slate-700 font-semibold">Zaman</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Kullanıcı</TableHead>
                    <TableHead className="text-slate-700 font-semibold">İşlem</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Alan</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Açıklama</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Detay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow className={cn(
                        "border-slate-100 hover:bg-slate-50 transition-colors",
                        log.actorType === 'admin' && "bg-blue-50/30"
                      )}>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-700 font-medium">
                              {formatRelativeDate(log.createdAt)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDateTimeLongTR(log.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getActorBadge(log.actorType)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="border-slate-200 text-slate-700 bg-white"
                          >
                            {getEntityLabel(log.entityType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <span className="text-sm text-slate-700">
                            {getActionLabel(log.action)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSet = new Set(expandedLogs)
                              if (expandedLogs.has(log.id)) {
                                newSet.delete(log.id)
                              } else {
                                newSet.add(log.id)
                              }
                              setExpandedLogs(newSet)
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                          >
                            {expandedLogs.has(log.id) ? 'Gizle' : 'Göster'}
                            <ChevronDown 
                              className={cn(
                                "ml-1 h-4 w-4 transition-transform",
                                expandedLogs.has(log.id) && "rotate-180"
                              )} 
                            />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedLogs.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-slate-50 border-slate-100">
                            <div className="p-4 space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium text-slate-700">Kullanıcı ID:</span>
                                  <span className="ml-2 text-slate-600">
                                    {log.actorId || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">Alan ID:</span>
                                  <span className="ml-2 text-slate-600">
                                    {log.entityId || '-'}
                                  </span>
                                </div>
                              </div>
                              {log.metadata && (
                                <div className="pt-3 border-t border-slate-200">
                                  <span className="font-medium text-slate-700 block mb-2">
                                    Detaylar:
                                  </span>
                                  <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs font-mono">
                                    {formatMetadata(log.metadata)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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

