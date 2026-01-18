"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { HelpCircle } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { createRecurringExpense } from "@/lib/actions/recurring-expense.actions"
import { toast } from "sonner"
import { format } from "date-fns"

interface AddRecurringExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const categoryLabels: Record<string, string> = {
  rent: "Kira",
  electricity: "Elektrik",
  water: "Su",
  product: "Ürün",
  staff: "Personel",
  other: "Diğer",
}

const repeatTypeLabels: Record<string, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
}

export function AddRecurringExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddRecurringExpenseDialogProps) {
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>("")
  const [repeatType, setRepeatType] = useState<string>("")
  const [repeatInterval, setRepeatInterval] = useState("1")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !amount || !category || !repeatType || !startDate) {
      toast.error("Lütfen tüm zorunlu alanları doldurun")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Geçerli bir tutar girin")
      return
    }

    const intervalNum = parseInt(repeatInterval)
    if (isNaN(intervalNum) || intervalNum <= 0) {
      toast.error("Tekrar aralığı 1'den büyük olmalıdır")
      return
    }

    setLoading(true)

    try {
      const result = await createRecurringExpense({
        title,
        amount: amountNum,
        category: category as any,
        repeatType: repeatType as any,
        repeatInterval: intervalNum,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      })

      if (result.success) {
        toast.success("Sabit gider eklendi")
        setTitle("")
        setAmount("")
        setCategory("")
        setRepeatType("")
        setRepeatInterval("1")
        setStartDate(undefined)
        setEndDate(undefined)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || "Sabit gider eklenirken hata oluştu")
      }
    } catch (error) {
      console.error("Error creating recurring expense:", error)
      toast.error("Sabit gider eklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible max-w-2xl bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-slate-900">Sabit Gider Ekle</DialogTitle>
          <DialogDescription className="text-slate-600">
            Belirli aralıklarla otomatik olarak eklenen gider tanımlayın
          </DialogDescription>
        </DialogHeader>
        <form id="recurring-expense-form" onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700">Başlık *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Örn: Kira"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-700">Tutar (₺) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-700">Kategori *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger 
                  id="category"
                  className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500"
                >
                  <SelectValue placeholder="Kategori seçin" className="text-slate-500" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-[100] bg-white border-slate-200"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem 
                      key={value} 
                      value={value}
                      className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="repeatType" className="text-slate-700">Tekrar Türü *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-[200] bg-white border-slate-200 text-slate-900" side="top">
                      <p className="text-sm">
                        Giderin hangi sıklıkta ekleneceğini belirtir (Günlük, Haftalık, Aylık).
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={repeatType} onValueChange={setRepeatType} required>
                  <SelectTrigger 
                    id="repeatType"
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500"
                  >
                    <SelectValue placeholder="Tekrar türü seçin" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={4}
                    className="z-[100] bg-white border-slate-200"
                  >
                    {Object.entries(repeatTypeLabels).map(([value, label]) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="repeatInterval" className="text-slate-700">Tekrar Aralığı *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-[200] bg-white border-slate-200 text-slate-900" side="top">
                      <div className="space-y-2">
                        <p className="text-sm">
                          Tekrar türünün kaç aralıkta bir ekleneceğini belirtir.
                        </p>
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-slate-900">Örnekler:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            <li>Tekrar Türü: Aylık, Tekrar Aralığı: 1 → Her ay</li>
                            <li>Tekrar Türü: Aylık, Tekrar Aralığı: 3 → 3 ayda bir</li>
                            <li>Tekrar Türü: Haftalık, Tekrar Aralığı: 2 → 2 haftada bir</li>
                          </ul>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  id="repeatInterval"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(e.target.value)}
                  required
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 min-h-[20px]">
                  <Label htmlFor="startDate" className="text-slate-700">
                    Başlangıç Tarihi *
                  </Label>
                </div>
                <DatePicker
                  date={startDate}
                  onSelect={setStartDate}
                  placeholder="Tarih seçin"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 min-h-[20px]">
                  <Label htmlFor="endDate" className="text-slate-700">
                    Bitiş Tarihi (Opsiyonel)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-[200] bg-white border-slate-200 text-slate-900" side="top">
                      <p className="text-sm">
                        Bu tarihten sonra gider otomatik olarak eklenmez. Boş bırakılırsa süresiz devam eder.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <DatePicker
                  date={endDate}
                  onSelect={setEndDate}
                  placeholder="Bitiş tarihi (opsiyonel)"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              İptal
            </Button>
            <Button 
              form="recurring-expense-form" 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
