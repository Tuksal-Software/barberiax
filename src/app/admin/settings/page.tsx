'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getSettings, updateSettings, type SettingsResponse } from '@/lib/actions/settings.actions'
import { Settings, MessageSquare, Scale, Info, Check, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

type SectionId = 'general' | 'sms' | 'rules'

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof Settings }> = [
  { id: 'general', label: 'Genel Ayarlar', icon: Settings },
  { id: 'sms', label: 'SMS & Bildirimler', icon: MessageSquare },
  { id: 'rules', label: 'Kurallar', icon: Scale },
]

function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200" />
        <Skeleton className="h-4 w-96 bg-slate-100" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-5 w-32 bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

function GeneralSection({ settings, setSettings }: { settings: SettingsResponse; setSettings: (s: SettingsResponse) => void }) {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Genel Ayarlar
        </h2>
        <p className="text-sm text-slate-600">
          İşletme bilgileri ve temel ayarlar
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
            İşletme Bilgileri
          </h3>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-sm font-medium text-slate-700">
                  İşletme Adı
                </Label>
                <Input
                  id="shopName"
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium text-slate-700">
                  Zaman Dilimi
                </Label>
                <div className="relative">
                  <Input
                    id="timezone"
                    value={settings.timezone}
                    disabled
                    className="border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Zaman dilimi şu anda değiştirilemez</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
            Özellikler
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex-1 pr-4">
                <Label className="text-sm font-medium text-slate-900 cursor-pointer">
                  Ürün Seçimi
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  Müşteri randevu alırken hizmet seçimi yapılmasını sağlar
                </p>
              </div>
              <Switch
                checked={settings.enableServiceSelection}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableServiceSelection: checked })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SmsSection({ settings, setSettings }: { settings: SettingsResponse; setSettings: (s: SettingsResponse) => void }) {
  const adminPhoneRegex = /^\+90\d{10}$/
  const isAdminPhoneValid = !settings.adminPhone || adminPhoneRegex.test(settings.adminPhone)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          SMS & Bildirimler
        </h2>
        <p className="text-sm text-slate-600">
          SMS gönderim ve bildirim ayarları
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
            SMS Ayarları
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex-1 pr-4">
                <Label className="text-sm font-medium text-slate-900">SMS Aktif</Label>
                <p className="text-sm text-slate-600 mt-1">
                  SMS gönderimlerini açıp kapatabilirsiniz
                </p>
              </div>
              <Switch
                checked={settings.smsEnabled}
                disabled={true}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, smsEnabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smsSender" className="text-sm font-medium text-slate-700">
                SMS Sender
              </Label>
              <Input
                id="smsSender"
                value={settings.smsSender}
                onChange={(e) => setSettings({ ...settings, smsSender: e.target.value })}
                disabled={true}
                className="border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
            Bildirimler
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminPhone" className="text-sm font-medium text-slate-700">
                Admin Telefonu
              </Label>
              <div className="relative">
                <Input
                  id="adminPhone"
                  value={settings.adminPhone || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim()
                    setSettings({ ...settings, adminPhone: value || null })
                  }}
                  placeholder="+905551234567"
                  className={cn(
                    "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1",
                    settings.adminPhone && !isAdminPhoneValid && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                {settings.adminPhone && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isAdminPhoneValid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-xs text-red-600">✕</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                <span>Admin bildirimleri için telefon numarası. +90 ile başlamalı veya boş bırakılabilir.</span>
              </p>
              {settings.adminPhone && !isAdminPhoneValid && (
                <p className="text-xs text-red-600 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Telefon numarası +90 ile başlamalı ve 10 haneli olmalıdır</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RulesSection({ settings, setSettings }: { settings: SettingsResponse; setSettings: (s: SettingsResponse) => void }) {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Kurallar</h2>
        <p className="text-sm text-slate-600">
          Randevu iptal kuralları ve hatırlatmalar
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
            İptal Kuralları
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approvedCancelMinHours" className="text-sm font-medium text-slate-700">
                Onaylı Randevu İptal Süresi
              </Label>
              <Input
                id="approvedCancelMinHours"
                type="number"
                min={1}
                max={48}
                value={settings.approvedCancelMinHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    approvedCancelMinHours: parseInt(e.target.value) || 2,
                  })
                }
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
              <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                <span>Müşteriler onaylı randevularını kaç saat öncesine kadar iptal edebilir.</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentCancelReminderHours" className="text-sm font-medium text-slate-700">
                İptal Hatırlatma Süresi
              </Label>
              <Input
                id="appointmentCancelReminderHours"
                type="number"
                min={1}
                max={24}
                value={settings.appointmentCancelReminderHours || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setSettings({
                    ...settings,
                    appointmentCancelReminderHours: value ? parseInt(value) : null,
                  })
                }}
                placeholder="Opsiyonel"
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
              />
              <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                <span>Randevudan kaç saat önce iptal hatırlatma SMS'i gönderilsin. Boş bırakılırsa hatırlatma gönderilmez.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('general')
  const [hasChanges, setHasChanges] = useState(false)
  const isMobile = useIsMobile()
  const initialSettingsRef = useRef<SettingsResponse | null>(null)

  const [settings, setSettings] = useState<SettingsResponse>({
    adminPhone: null,
    shopName: 'Berber',
    smsEnabled: true,
    smsSender: 'DEGISIMDJTL',
    approvedCancelMinHours: 2,
    timezone: 'Europe/Istanbul',
    enableServiceSelection: true,
    appointmentCancelReminderHours: null,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (initialSettingsRef.current) {
      const hasChanged = JSON.stringify(settings) !== JSON.stringify(initialSettingsRef.current)
      setHasChanges(hasChanged)
    }
  }, [settings])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await getSettings()
      setSettings(data)
      initialSettingsRef.current = JSON.parse(JSON.stringify(data))
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateSettings(settings)
      if (result.success) {
        toast.success('Ayarlar başarıyla kaydedildi')
        initialSettingsRef.current = JSON.parse(JSON.stringify(settings))
        setHasChanges(false)
      } else {
        toast.error(result.error || 'Ayarlar kaydedilirken hata oluştu')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Ayarlar kaydedilirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-8 w-32 bg-slate-200" />
                <Skeleton className="h-4 w-64 bg-slate-100" />
              </div>
              <Skeleton className="h-10 w-24 bg-slate-200" />
            </div>
          </div>
          <div className="flex min-h-[600px]">
            <aside className="w-64 border-r border-slate-200 p-4 hidden lg:block">
              <Skeleton className="h-64 w-full bg-slate-100" />
            </aside>
            <main className="flex-1 bg-slate-50/50 p-8">
              <LoadingSkeleton />
            </main>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
                <p className="text-sm text-slate-600">
                  Sistem genelinde kullanılan ayarları yönetin
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {isMobile ? (
              <aside className="w-full border-b border-slate-200 bg-white p-4 lg:hidden">
                <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionId)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="general" className="flex-1">Genel</TabsTrigger>
                    <TabsTrigger value="sms" className="flex-1">SMS</TabsTrigger>
                    <TabsTrigger value="rules" className="flex-1">Kurallar</TabsTrigger>
                  </TabsList>
                </Tabs>
              </aside>
            ) : (
              <aside className="w-64 border-r border-slate-200 bg-white p-4 hidden lg:block">
                <nav className="space-y-1">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon
                    const isActive = activeSection === section.id
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-blue-50 text-blue-700 shadow-sm"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive ? "text-blue-600" : "text-slate-500"
                        )} />
                        <span>{section.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </aside>
            )}

            <main className="flex-1 bg-slate-50/50 p-4 lg:p-8 overflow-y-auto">
              {activeSection === 'general' && <GeneralSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'sms' && <SmsSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'rules' && <RulesSection settings={settings} setSettings={setSettings} />}
            </main>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}
