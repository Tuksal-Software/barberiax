"use client"

import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { 
  Loader2, 
  Scissors, 
  CalendarPlus, 
  User, 
  Phone, 
  Clock,
  CheckCircle2,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimeRangePicker } from "@/components/app/TimeRangePicker"
import { HorizontalDatePicker } from "@/components/app/HorizontalDatePicker"
import { getActiveBarbers } from "@/lib/actions/barber.actions"
import { getCustomerTimeButtonsV2 } from "@/lib/actions/availability.actions"
import { createAdminAppointment, getCustomerByPhone } from "@/lib/actions/appointment.actions"
import { cn } from "@/lib/utils"
import type { BarberListItem } from "@/lib/actions/barber.actions"
import type { CustomerTimeButton } from "@/lib/actions/availability.actions"

const formSchema = z.object({
  customerName: z.string().min(2, "En az 2 karakter olmalı"),
  customerPhone: z.string().regex(/^\+90[5][0-9]{9}$/, "Geçerli bir telefon numarası girin"),
})

type FormData = z.infer<typeof formSchema>

export default function ManuelRandevuPage() {
  const [barbers, setBarbers] = useState<BarberListItem[]>([])
  const [loadingBarbers, setLoadingBarbers] = useState(true)
  const [selectedBarberId, setSelectedBarberId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedStart, setSelectedStart] = useState<string>("")
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30)
  const [timeButtons, setTimeButtons] = useState<CustomerTimeButton[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [phoneValue, setPhoneValue] = useState("")
  const [loadingCustomer, setLoadingCustomer] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const formData = watch()

  const normalizePhone = (value: string): string => {
    const digits = value.replace(/\D/g, "")
    
    if (digits.length === 0) return ""
    
    if (digits.startsWith("90") && digits.length >= 12) {
      return `+${digits.slice(0, 12)}`
    }
    
    if (digits.startsWith("0") && digits.length >= 11) {
      return `+90${digits.slice(1, 12)}`
    }
    
    if (digits.startsWith("5") && digits.length >= 10) {
      return `+90${digits.slice(0, 10)}`
    }
    
    if (digits.length > 0) {
      if (digits.startsWith("90")) {
        return `+${digits.slice(0, 12)}`
      }
      if (digits.startsWith("0")) {
        return `+90${digits.slice(1, 12)}`
      }
      return `+90${digits.slice(0, 10)}`
    }
    
    return value
  }

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setPhoneValue(rawValue)

    const normalized = normalizePhone(rawValue)
    setValue("customerPhone", normalized, { shouldValidate: true })

    if (/^\+90[5][0-9]{9}$/.test(normalized)) {
      setLoadingCustomer(true)
      try {
        const customer = await getCustomerByPhone(normalized)
        if (customer) {
          setValue("customerName", customer.customerName)
        }
      } catch (error) {
        console.error("Error fetching customer:", error)
      } finally {
        setLoadingCustomer(false)
      }
    }
  }

  useEffect(() => {
    async function loadBarbers() {
      try {
        const data = await getActiveBarbers()
        setBarbers(data)
      } catch (error) {
        toast.error("Berberler yüklenirken hata oluştu")
      } finally {
        setLoadingBarbers(false)
      }
    }
    loadBarbers()
  }, [])

  useEffect(() => {
    if (!selectedBarberId || !selectedDate) {
      setTimeButtons([])
      setSelectedStart("")
      return
    }

    async function fetchTimeButtons() {
      try {
        setLoadingSlots(true)
        const dateStr = format(selectedDate!, "yyyy-MM-dd")
        const buttons = await getCustomerTimeButtonsV2({
          barberId: selectedBarberId,
          date: dateStr,
          durationMinutes: selectedDuration || 30,
          enableServiceSelection: true,
        })
        setTimeButtons(buttons)
        setSelectedStart("")
      } catch (error) {
        toast.error("Müsait saatler yüklenirken hata oluştu")
        setTimeButtons([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchTimeButtons()
  }, [selectedBarberId, selectedDate, selectedDuration])

  const onSubmit = handleSubmit((data) => {
    if (!selectedBarberId || !selectedDate || !selectedStart || !selectedDuration) {
      toast.error("Lütfen tüm alanları doldurun")
      return
    }

    startTransition(async () => {
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd")
        await createAdminAppointment({
          barberId: selectedBarberId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          date: dateStr,
          requestedStartTime: selectedStart,
          durationMinutes: selectedDuration,
        })
        toast.success("Randevu başarıyla oluşturuldu!")
        reset()
        setPhoneValue("")
        setSelectedDate(new Date())
        setSelectedStart("")
        setSelectedDuration(30)
        setSelectedBarberId("")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Randevu oluşturulurken hata oluştu")
      }
    })
  })

  const canSubmit = 
    selectedBarberId &&
    selectedDate &&
    selectedStart &&
    selectedDuration &&
    formData.customerName &&
    formData.customerName.length >= 2 &&
    formData.customerPhone &&
    /^\+90[5][0-9]{9}$/.test(formData.customerPhone) &&
    !isPending

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <CalendarPlus className="h-8 w-8 text-blue-600" />
          Manuel Randevu
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Yeni randevu oluşturmak için formu doldurun
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 xl:grid-cols-[1fr,380px] lg:grid-cols-1">
          <div className="space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-blue-600" />
                  Berber
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBarbers ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full bg-slate-100" />
                    ))}
                  </div>
                ) : barbers.length === 0 ? (
                  <div className="text-center py-6">
                    <Scissors className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Aktif berber bulunamadı</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {barbers.map((barber) => (
                      <div
                        key={barber.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          selectedBarberId === barber.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                        onClick={() => setSelectedBarberId(barber.id)}
                      >
                        <Avatar className="h-10 w-10 border-2 border-white">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                            {barber.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {barber.name}
                          </p>
                        </div>
                        {selectedBarberId === barber.id && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Tarih & Süre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-700 text-sm mb-2 block">Tarih</Label>
                  <HorizontalDatePicker
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>

                <div>
                  <Label className="text-slate-700 text-sm mb-2 block">Süre</Label>
                  <Select 
                    value={selectedDuration.toString()} 
                    onValueChange={(value) => setSelectedDuration(value === "30" ? 30 : 60)}
                  >
                    <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem 
                        value="30"
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        30 dakika
                      </SelectItem>
                      <SelectItem 
                        value="60"
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        60 dakika
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Saat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBarberId || !selectedDate ? (
                  <div className="text-center py-6">
                    <Clock className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Önce berber ve tarih seçin</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                    <p className="text-sm text-slate-600">Yükleniyor...</p>
                  </div>
                ) : timeButtons.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Müsait saat yok</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <TimeRangePicker
                      selectedStart={selectedStart}
                      onStartSelect={setSelectedStart}
                      timeButtons={timeButtons}
                    />
                    {selectedStart && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-700">Seçilen saat</p>
                            <p className="text-lg font-bold text-blue-600">{selectedStart}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-slate-700 text-sm">
                    Telefon *
                  </Label>
                  <div className="relative">
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={phoneValue}
                      onChange={handlePhoneChange}
                      placeholder="5xxxxxxxxx"
                      maxLength={13}
                      className={cn(
                        "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
                        errors.customerPhone && "border-red-500"
                      )}
                    />
                    {loadingCustomer && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                  {errors.customerPhone && (
                    <p className="text-xs text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-slate-700 text-sm">
                    Ad Soyad *
                  </Label>
                  <Input
                    id="customerName"
                    {...register("customerName")}
                    placeholder="Müşteri adı"
                    className={cn(
                      "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
                      errors.customerName && "border-red-500"
                    )}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-red-600">{errors.customerName.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={!canSubmit}
              size="lg"
              className={cn(
                "w-full shadow-sm",
                canSubmit 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Randevu Oluştur
                </>
              )}
            </Button>

            {selectedBarberId && selectedDate && selectedStart && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Randevu Özeti</h4>
                  <div className="space-y-1.5 text-sm text-blue-800">
                    <p>
                      <span className="font-medium">Berber:</span>{" "}
                      {barbers.find(b => b.id === selectedBarberId)?.name}
                    </p>
                    <p>
                      <span className="font-medium">Tarih:</span>{" "}
                      {format(selectedDate, "d MMMM yyyy", { locale: tr })}
                    </p>
                    <p>
                      <span className="font-medium">Saat:</span> {selectedStart}
                    </p>
                    <p>
                      <span className="font-medium">Süre:</span> {selectedDuration} dakika
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
