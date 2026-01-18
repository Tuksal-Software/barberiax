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
import { Textarea } from "@/components/ui/textarea"
import { createExpense } from "@/lib/actions/expense.actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
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

export function AddExpenseDialog({
  open,
  onOpenChange,
  date,
  onSuccess,
}: AddExpenseDialogProps) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || !category) {
      toast.error("Lütfen tutar ve kategori seçin")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Geçerli bir tutar girin")
      return
    }

    setLoading(true)

    try {
      const result = await createExpense({
        date,
        amount: amountNum,
        category: category as any,
        description: description || undefined,
      })

      if (result.success) {
        toast.success("Gider eklendi")
        setAmount("")
        setCategory("")
        setDescription("")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || "Gider eklenirken hata oluştu")
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Gider eklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = format(new Date(date), "d MMMM yyyy", { locale: tr })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-slate-900">Yeni Gider Ekle</DialogTitle>
          <DialogDescription className="text-slate-600">
            {formattedDate} tarihi için gider ekleyin
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-[200] bg-white border-slate-200"
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
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700">
                Açıklama (Opsiyonel)
              </Label>
              <Textarea
                id="description"
                placeholder="Açıklama girin"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
              />
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
