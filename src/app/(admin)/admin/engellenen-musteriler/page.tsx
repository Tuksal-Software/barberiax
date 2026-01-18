"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ShieldBan, Plus, Unlock, Calendar as CalendarIcon, Phone, User, AlertCircle, Info } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getAllBannedCustomers,
  banCustomer,
  unbanCustomer,
  type BannedCustomerWithStats,
} from "@/lib/actions/banned-customer.actions"
import { getCustomerByPhone } from "@/lib/actions/appointment.actions"

export default function EngellenenmusterilerPage() {
  const [customers, setCustomers] = useState<BannedCustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<BannedCustomerWithStats | null>(null)
  const [isUnbanDialogOpen, setIsUnbanDialogOpen] = useState(false)
  
  const [phoneValue, setPhoneValue] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [reason, setReason] = useState("")
  const [banType, setBanType] = useState<"permanent" | "temporary">("permanent")
  const [bannedUntil, setBannedUntil] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const data = await getAllBannedCustomers()
      setCustomers(data)
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const normalizePhone = (value: string): string => {
    const digits = value.replace(/\D/g, "")
    
    if (digits.length === 0) return ""
    
    if (digits.startsWith("90")) {
      const phone = digits.slice(0, 12)
      if (phone.length > 2) {
        return `+${phone.slice(0, 2)} ${phone.slice(2, 5)}${phone.length > 5 ? ' ' + phone.slice(5, 8) : ''}${phone.length > 8 ? ' ' + phone.slice(8) : ''}`
      }
      return `+${phone}`
    }
    
    if (digits.startsWith("0")) {
      const phone = digits.slice(1, 11)
      if (phone.length > 0) {
        return `+90 ${phone.slice(0, 3)}${phone.length > 3 ? ' ' + phone.slice(3, 6) : ''}${phone.length > 6 ? ' ' + phone.slice(6) : ''}`
      }
      return "+90 "
    }
    
    if (digits.startsWith("5")) {
      const phone = digits.slice(0, 10)
      if (phone.length > 0) {
        return `+90 ${phone.slice(0, 3)}${phone.length > 3 ? ' ' + phone.slice(3, 6) : ''}${phone.length > 6 ? ' ' + phone.slice(6) : ''}`
      }
      return "+90 "
    }
    
    return `+90 ${digits.slice(0, 10)}`
  }

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    
    const formatted = normalizePhone(rawValue)
    setPhoneValue(formatted)

    const digitsOnly = rawValue.replace(/\D/g, "")
    let normalized = ""
    
    if (digitsOnly.startsWith("90") && digitsOnly.length >= 12) {
      normalized = `+${digitsOnly.slice(0, 12)}`
    } else if (digitsOnly.startsWith("0") && digitsOnly.length >= 11) {
      normalized = `+90${digitsOnly.slice(1, 11)}`
    } else if (digitsOnly.startsWith("5") && digitsOnly.length >= 10) {
      normalized = `+90${digitsOnly.slice(0, 10)}`
    } else if (digitsOnly.length > 0) {
      normalized = `+90${digitsOnly.slice(0, 10)}`
    }
    
    setCustomerPhone(normalized)

    if (/^\+90[5][0-9]{9}$/.test(normalized)) {
      try {
        const customer = await getCustomerByPhone(normalized)
        if (customer?.customerName && !customerName) {
          setCustomerName(customer.customerName)
          toast.success("Müşteri bilgisi bulundu")
        }
      } catch (error) {
      }
    }
  }

  async function handleBanCustomer() {
    if (!customerPhone || !customerName) {
      toast.error("Telefon ve isim zorunludur")
      return
    }

    if (!customerPhone.match(/^\+90[5][0-9]{9}$/)) {
      toast.error("Geçerli bir telefon numarası girin")
      return
    }

    if (banType === "temporary" && !bannedUntil) {
      toast.error("Geçici ban için bitiş tarihi seçin")
      return
    }

    setIsSubmitting(true)
    try {
      await banCustomer({
        customerPhone,
        customerName,
        reason: reason || undefined,
        banType,
        bannedUntil: banType === "temporary" ? bannedUntil : undefined,
      })
      
      toast.success("Müşteri engellendi")
      setIsDialogOpen(false)
      resetForm()
      loadCustomers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUnban() {
    if (!selectedCustomer) return
    
    setIsSubmitting(true)
    try {
      await unbanCustomer(selectedCustomer.id)
      toast.success("Engel kaldırıldı")
      setIsUnbanDialogOpen(false)
      setSelectedCustomer(null)
      loadCustomers()
    } catch (error) {
      toast.error("Hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setPhoneValue("")
    setCustomerPhone("")
    setCustomerName("")
    setReason("")
    setBanType("permanent")
    setBannedUntil(undefined)
  }

  function openBanDialog() {
    resetForm()
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Engellenen Müşteriler</h1>
        <p className="text-sm text-slate-600 mt-1">
          Randevu alamayacak müşterileri yönetin
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-sm">
          <CardHeader className="relative pb-2">
            <p className="text-sm font-medium text-red-700">Toplam Engellenen</p>
            <p className="text-3xl font-bold tabular-nums text-red-900">
              {customers.length}
            </p>
            <div className="absolute right-4 top-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldBan className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-sm">
          <CardHeader className="relative pb-2">
            <p className="text-sm font-medium text-orange-700">Kalıcı Ban</p>
            <p className="text-3xl font-bold tabular-nums text-orange-900">
              {customers.filter(c => c.banType === 'permanent').length}
            </p>
            <div className="absolute right-4 top-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
          <CardHeader className="relative pb-2">
            <p className="text-sm font-medium text-amber-700">Geçici Ban</p>
            <p className="text-3xl font-bold tabular-nums text-amber-900">
              {customers.filter(c => c.banType === 'temporary').length}
            </p>
            <div className="absolute right-4 top-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Engellenen Müşteriler Listesi
            </CardTitle>
            <Button onClick={openBanDialog} className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Müşteri Engelle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-slate-500">Yükleniyor...</p>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldBan className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Henüz engellenmiş müşteri yok</p>
              <p className="text-sm text-slate-400 mt-1">İlk müşteriyi engellemek için yukarıdaki butona tıklayın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Müşteri</TableHead>
                    <TableHead className="font-semibold text-slate-700">Telefon</TableHead>
                    <TableHead className="font-semibold text-slate-700">Ban Türü</TableHead>
                    <TableHead className="font-semibold text-slate-700">Ban Tarihi</TableHead>
                    <TableHead className="font-semibold text-slate-700">Bitiş Tarihi</TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        İptal Sayısı
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-slate-700">
                              <p className="text-sm">Müşterinin daha önce iptal ettiği randevu sayısı</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">Sebep</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {customer.customerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {customer.customerPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "font-normal",
                            customer.banType === "permanent" 
                              ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                              : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                          )}
                        >
                          {customer.banType === "permanent" ? "Kalıcı" : "Geçici"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(customer.bannedAt), "dd MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {customer.bannedUntil 
                          ? format(new Date(customer.bannedUntil), "dd MMM yyyy", { locale: tr })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-help">
                                <Badge variant="outline" className="font-mono bg-slate-50 text-slate-700 border-slate-200">
                                  {customer.cancelledAppointmentsCount || 0}
                                </Badge>
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-slate-700 max-w-xs">
                              <p className="text-sm">
                                {customer.cancelledAppointmentsCount === 0 
                                  ? "Bu müşteri daha önce hiç randevu iptal etmedi"
                                  : customer.cancelledAppointmentsCount === 1
                                  ? "Bu müşteri daha önce 1 randevuyu iptal etti"
                                  : `Bu müşteri daha önce ${customer.cancelledAppointmentsCount} randevuyu iptal etti`
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-slate-600">
                        {customer.reason || <span className="text-slate-400">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setIsUnbanDialogOpen(true)
                          }}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Engeli Kaldır
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Müşteri Engelle</DialogTitle>
            <DialogDescription className="text-slate-600">
              Bu müşteri artık randevu alamayacak
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700">Telefon Numarası *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+90 555 123 4567"
                value={phoneValue}
                onChange={handlePhoneChange}
                maxLength={16}
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
              />
              {customerPhone && !customerPhone.match(/^\+90[5][0-9]{9}$/) && (
                <p className="text-xs text-red-600">Geçerli bir telefon numarası girin (+90 5XX XXX XXXX)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">Müşteri Adı *</Label>
              <Input
                id="name"
                placeholder="Ad Soyad"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banType" className="text-slate-700">Ban Türü *</Label>
              <Select value={banType} onValueChange={(v: "permanent" | "temporary") => setBanType(v)}>
                <SelectTrigger className="border-slate-300 bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="permanent" className="text-slate-900">Kalıcı</SelectItem>
                  <SelectItem value="temporary" className="text-slate-900">Geçici</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banType === "temporary" && (
              <div className="space-y-2">
                <Label className="text-slate-700">Bitiş Tarihi *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-slate-300 bg-white text-slate-900",
                        !bannedUntil && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                      {bannedUntil ? format(bannedUntil, "dd MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 bg-white border-slate-200 shadow-lg text-slate-900 z-[200]" 
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={bannedUntil}
                      onSelect={setBannedUntil}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={tr}
                      className="rounded-md"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-slate-700">Sebep (Opsiyonel)</Label>
              <Textarea
                id="reason"
                placeholder="Engelleme sebebini yazın..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)} 
              disabled={isSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              İptal
            </Button>
            <Button 
              onClick={handleBanCustomer} 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Engelleniyor..." : "Engelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnbanDialogOpen} onOpenChange={setIsUnbanDialogOpen}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Engeli Kaldır</DialogTitle>
            <DialogDescription className="text-slate-600">
              Bu müşterinin engelini kaldırmak istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="py-4 space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Müşteri:</span> {selectedCustomer.customerName}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Telefon:</span> {selectedCustomer.customerPhone}
              </p>
              {selectedCustomer.reason && (
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Sebep:</span> {selectedCustomer.reason}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsUnbanDialogOpen(false)} 
              disabled={isSubmitting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              İptal
            </Button>
            <Button 
              onClick={handleUnban} 
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Kaldırılıyor..." : "Engeli Kaldır"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
