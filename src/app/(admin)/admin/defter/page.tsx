"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DatePicker } from "@/components/ui/date-picker"
import { getActiveBarbers } from "@/lib/actions/barber.actions"
import {
  getLedgerCandidates,
  upsertLedgerForAppointment,
  deleteLedgerEntry,
  getLedgerSummary,
} from "@/lib/actions/ledger-v2.actions"
import type { UnpaidLedgerItem, PaidLedgerItem } from "@/lib/actions/ledger-v2.actions"
import { getSessionClient } from "@/lib/actions/auth-client.actions"
import { toast } from "sonner"
import { 
  Edit2, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  BookOpen,
  Zap
} from "lucide-react"
import { BarberFilter } from "@/components/admin/BarberFilter"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface Barber {
  id: string
  name: string
}

export default function DefterPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [unpaid, setUnpaid] = useState<UnpaidLedgerItem[]>([])
  const [paid, setPaid] = useState<PaidLedgerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({})
  const [summary, setSummary] = useState({ 
    totalRevenue: "0", 
    paidCount: 0, 
    unpaidCount: 0 
  })
  const [recentAmounts, setRecentAmounts] = useState<number[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PaidLedgerItem | null>(null)
  const [editFormData, setEditFormData] = useState({ amount: "", description: "" })
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<{ appointmentId: string; item: UnpaidLedgerItem } | null>(null)

  const [formData, setFormData] = useState<Record<string, { amount: string; description: string }>>({})

  const quickAmounts = [150, 200, 300, 350, 450, 500, 600, 800]

  useEffect(() => {
    const today = new Date()
    setSelectedDate(today)
    loadInitialData()
  }, [])

  const loadLedgerData = useCallback(async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ""
      const [result, summaryData] = await Promise.all([
        getLedgerCandidates({
          barberId: selectedBarberId || undefined,
          selectedDate: dateStr,
        }),
        getLedgerSummary({
          barberId: selectedBarberId || undefined,
          selectedDate: dateStr,
        }),
      ])
      setUnpaid(result.unpaid)
      setPaid(result.paid)
      setSummary(summaryData)

      const initialFormData: Record<string, { amount: string; description: string }> = {}
      result.unpaid.forEach((item) => {
        initialFormData[item.appointmentId] = { amount: "", description: "" }
      })
      setFormData(initialFormData)
    } catch (error) {
      console.error("Error loading ledger data:", error)
      toast.error("Veriler yüklenirken hata oluştu")
      setUnpaid([])
      setPaid([])
    } finally {
      setLoading(false)
    }
  }, [selectedBarberId, selectedDate])

  useEffect(() => {
    loadLedgerData()
  }, [loadLedgerData])

  const loadInitialData = async () => {
    try {
      const session = await getSessionClient()
      if (session) {
        setIsAdmin(session.role === "admin")
        if (session.role === "admin") {
          const barbersList = await getActiveBarbers()
          setBarbers(barbersList.map((b) => ({ id: b.id, name: b.name })))
        } else {
          setSelectedBarberId(session.userId)
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
    }
  }

  const handleAmountChange = (appointmentId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        amount: value,
      },
    }))
  }

  const handleDescriptionChange = (appointmentId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        description: value,
      },
    }))
  }

  const handleQuickAmount = (appointmentId: string, amount: number) => {
    setFormData((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId] || { amount: "", description: "" },
        amount: amount.toString(),
      },
    }))
  }

  const handleSave = async (appointmentId: string) => {
    const data = formData[appointmentId]
    if (!data || !data.amount) {
      toast.error("Lütfen ücret girin")
      return
    }

    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçerli bir ücret girin")
      return
    }

    if (savingStates[appointmentId]) {
      return
    }

    const item = unpaid.find((i) => i.appointmentId === appointmentId)
    if (!item) return

    setSavingStates((prev) => ({ ...prev, [appointmentId]: true }))

    const optimisticPaidItem: PaidLedgerItem = {
      ...item,
      ledger: {
        id: `temp-${appointmentId}`,
        amount: amount.toString(),
        description: data.description || null,
        createdAt: new Date(),
      },
    }

    setUnpaid((prev) => prev.filter((i) => i.appointmentId !== appointmentId))
    setPaid((prev) => [optimisticPaidItem, ...prev])
    setSummary((prev) => ({
      ...prev,
      paidCount: prev.paidCount + 1,
      unpaidCount: prev.unpaidCount - 1,
      totalRevenue: (parseFloat(prev.totalRevenue) + amount).toFixed(2),
    }))

    lastSavedRef.current = { appointmentId, item }

    try {
      const result = await upsertLedgerForAppointment({
        appointmentRequestId: appointmentId,
        amount,
        description: data.description || undefined,
      })

      if (result.success) {
        const newAmounts = [...recentAmounts.filter((a) => a !== amount), amount].slice(-5)
        setRecentAmounts(newAmounts)

        toast.success("Ücret kaydedildi", {
          action: {
            label: "Geri Al (5sn)",
            onClick: () => handleUndo(appointmentId),
          },
          duration: 5000,
        })

        undoTimeoutRef.current = setTimeout(() => {
          lastSavedRef.current = null
        }, 5000)

        await loadLedgerData()
      } else {
        setUnpaid((prev) => [...prev, item])
        setPaid((prev) => prev.filter((i) => i.appointmentId !== appointmentId))
        setSummary((prev) => ({
          ...prev,
          paidCount: prev.paidCount - 1,
          unpaidCount: prev.unpaidCount + 1,
          totalRevenue: (parseFloat(prev.totalRevenue) - amount).toFixed(2),
        }))
        toast.error(result.error || "Kayıt sırasında hata oluştu")
      }
    } catch (error) {
      setUnpaid((prev) => [...prev, item])
      setPaid((prev) => prev.filter((i) => i.appointmentId !== appointmentId))
      setSummary((prev) => ({
        ...prev,
        paidCount: prev.paidCount - 1,
        unpaidCount: prev.unpaidCount + 1,
        totalRevenue: (parseFloat(prev.totalRevenue) - amount).toFixed(2),
      }))
      console.error("Error saving ledger:", error)
      toast.error("Kayıt sırasında hata oluştu")
    } finally {
      setSavingStates((prev) => ({ ...prev, [appointmentId]: false }))
    }
  }

  const handleUndo = async (appointmentId: string) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = null
    }

    const saved = lastSavedRef.current
    if (!saved || saved.appointmentId !== appointmentId) return

    try {
      const result = await deleteLedgerEntry(appointmentId)
      if (result.success) {
        setUnpaid((prev) => [...prev, saved.item])
        setPaid((prev) => prev.filter((i) => i.appointmentId !== appointmentId))
        const amount = parseFloat(paid.find((p) => p.appointmentId === appointmentId)?.ledger.amount || "0")
        setSummary((prev) => ({
          ...prev,
          paidCount: prev.paidCount - 1,
          unpaidCount: prev.unpaidCount + 1,
          totalRevenue: (parseFloat(prev.totalRevenue) - amount).toFixed(2),
        }))
        toast.success("İşlem geri alındı")
        lastSavedRef.current = null
      } else {
        toast.error(result.error || "Geri alma başarısız")
      }
    } catch (error) {
      console.error("Error undoing:", error)
      toast.error("Geri alma sırasında hata oluştu")
    }
  }

  const handleEdit = (item: PaidLedgerItem) => {
    setEditingItem(item)
    setEditFormData({
      amount: item.ledger.amount,
      description: item.ledger.description || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    if (!editingItem) return

    const amount = parseFloat(editFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçerli bir ücret girin")
      return
    }

    const oldAmount = parseFloat(editingItem.ledger.amount)
    const amountDiff = amount - oldAmount

    setPaid((prev) =>
      prev.map((item) =>
        item.appointmentId === editingItem.appointmentId
          ? {
              ...item,
              ledger: {
                ...item.ledger,
                amount: amount.toString(),
                description: editFormData.description || null,
              },
            }
          : item
      )
    )
    setSummary((prev) => ({
      ...prev,
      totalRevenue: (parseFloat(prev.totalRevenue) + amountDiff).toFixed(2),
    }))

    try {
      const result = await upsertLedgerForAppointment({
        appointmentRequestId: editingItem.appointmentId,
        amount,
        description: editFormData.description || undefined,
      })

      if (result.success) {
        toast.success("Güncelleme başarılı")
        setEditDialogOpen(false)
        setEditingItem(null)
      } else {
        setPaid((prev) =>
          prev.map((item) =>
            item.appointmentId === editingItem.appointmentId ? editingItem : item
          )
        )
        setSummary((prev) => ({
          ...prev,
          totalRevenue: (parseFloat(prev.totalRevenue) - amountDiff).toFixed(2),
        }))
        toast.error(result.error || "Güncelleme başarısız")
      }
    } catch (error) {
      setPaid((prev) =>
        prev.map((item) =>
          item.appointmentId === editingItem.appointmentId ? editingItem : item
        )
      )
      setSummary((prev) => ({
        ...prev,
        totalRevenue: (parseFloat(prev.totalRevenue) - amountDiff).toFixed(2),
      }))
      console.error("Error updating ledger:", error)
      toast.error("Güncelleme sırasında hata oluştu")
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount))
  }

  const truncateText = (text: string | null, maxLength: number = 30) => {
    if (!text) return "-"
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Defter</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tamamlanmış randevuların ücret takibi
        </p>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {isAdmin && (
              <div className="space-y-2">
                <Label className="text-slate-700">Berber</Label>
                <BarberFilter
                  barbers={barbers}
                  selectedBarberId={selectedBarberId}
                  onBarberChange={setSelectedBarberId}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-slate-700">Tarih</Label>
              <DatePicker
                date={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Tarih seçin"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
                Toplam Gelir
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-xs text-green-700 mt-1">
                {summary.paidCount} kayıtlı randevu
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">
                Bekleyen Ücretler
              </CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900">
                {summary.unpaidCount}
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Ücret girilmesi gereken randevular
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">
                Kaydedilen
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {summary.paidCount}
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Ücreti girilmiş randevular
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-100" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : unpaid.length === 0 && paid.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium">Henüz tamamlanmış randevu bulunmuyor</p>
              <p className="text-slate-500 text-sm mt-1">
                Done statüsündeki randevular burada görünecek
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="unpaid" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
            <TabsTrigger 
              value="unpaid"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              Bekleyen ({unpaid.length})
            </TabsTrigger>
            <TabsTrigger 
              value="paid"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Kaydedilen ({paid.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid" className="mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Bekleyen Ücretler
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {unpaid.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600 font-medium">Bekleyen ücret bulunmuyor</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Tüm ücretler kaydedilmiş
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
                          <TableHead className="text-slate-700 font-semibold">Müşteri</TableHead>
                          {isAdmin && <TableHead className="text-slate-700 font-semibold">Berber</TableHead>}
                          <TableHead className="text-slate-700 font-semibold">Tarih</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Saat</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Ücret (₺)</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Not</TableHead>
                          <TableHead className="text-right text-slate-700 font-semibold">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaid.map((item) => {
                          const data = formData[item.appointmentId] || { amount: "", description: "" }
                          const isSaving = savingStates[item.appointmentId]
                          
                          return (
                            <TableRow 
                              key={item.appointmentId} 
                              className="border-slate-100 hover:bg-slate-50 transition-colors"
                            >
                              <TableCell className="font-medium text-slate-900">
                                {item.customerName}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-slate-700">
                                  {item.barberName}
                                </TableCell>
                              )}
                              <TableCell className="text-slate-700">
                                {format(new Date(item.date), "d MMM yyyy", { locale: tr })}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {item.startTime}
                                {item.endTime && ` - ${item.endTime}`}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={data.amount}
                                    onChange={(e) => handleAmountChange(item.appointmentId, e.target.value)}
                                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 h-9"
                                  />
                                  <div className="flex gap-1 flex-wrap">
                                    {quickAmounts.map((amount) => (
                                      <Button
                                        key={amount}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleQuickAmount(item.appointmentId, amount)}
                                        className="h-7 px-2 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                      >
                                        <Zap className="h-3 w-3 mr-1 text-amber-600" />
                                        {amount}₺
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  placeholder="Not (opsiyonel)"
                                  value={data.description}
                                  onChange={(e) => handleDescriptionChange(item.appointmentId, e.target.value)}
                                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 h-9 min-w-[150px]"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => handleSave(item.appointmentId)}
                                  disabled={isSaving || !data.amount}
                                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {isSaving ? "Kaydediliyor..." : "Kaydet"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Ücreti Girilenler
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paid.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600 font-medium">Ücreti girilen randevu bulunmuyor</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Ücret kaydedilen randevular burada görünecek
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
                          <TableHead className="text-slate-700 font-semibold">Müşteri</TableHead>
                          {isAdmin && <TableHead className="text-slate-700 font-semibold">Berber</TableHead>}
                          <TableHead className="text-slate-700 font-semibold">Saat</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Ücret</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Not</TableHead>
                          <TableHead className="text-right text-slate-700 font-semibold">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paid.map((item) => (
                          <TableRow 
                            key={item.appointmentId}
                            className="border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="font-medium text-slate-900">
                              {item.customerName}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-slate-700">
                                {item.barberName}
                              </TableCell>
                            )}
                            <TableCell className="text-slate-700">
                              {item.startTime}
                              {item.endTime && ` - ${item.endTime}`}
                            </TableCell>
                            <TableCell className="font-semibold text-green-700">
                              {formatCurrency(item.ledger.amount)}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help text-slate-700">
                                      {truncateText(item.ledger.description)}
                                    </span>
                                  </TooltipTrigger>
                                  {item.ledger.description && item.ledger.description.length > 30 && (
                                    <TooltipContent className="bg-white border-slate-200 text-slate-900">
                                      <p className="text-sm">{item.ledger.description}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Düzenle
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
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent 
          className="bg-white border-slate-200"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditDialogOpen(false)
            }
          }}
        >
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-slate-900">Ücret Düzenle</DialogTitle>
            <DialogDescription className="text-slate-600">
              {editingItem?.customerName} - {editingItem?.date && format(new Date(editingItem.date), "d MMMM yyyy", { locale: tr })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="text-slate-700">Ücret (₺) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={editFormData.amount}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-slate-700">Not (Opsiyonel)</Label>
              <Input
                id="edit-description"
                type="text"
                placeholder="Not girin"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              İptal
            </Button>
            <Button 
              onClick={handleEditSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
