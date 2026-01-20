"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePicker } from "@/components/ui/date-picker"
import { Plus, DollarSign, Calendar, Receipt } from "lucide-react"
import {
  getExpensesByDate,
  getExpenseDayTotal,
} from "@/lib/actions/expense.actions"
import { AddExpenseDialog } from "./components/AddExpenseDialog"
import { ExpenseTable } from "./components/ExpenseTable"
import type { ExpenseItem } from "@/lib/actions/expense.actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export default function GiderlerPage() {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [dayTotal, setDayTotal] = useState<string>("0")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadExpenseData()
  }, [selectedDate])

  const loadExpenseData = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
      const [expensesData, totalData] = await Promise.all([
        getExpensesByDate(dateStr),
        getExpenseDayTotal(dateStr),
      ])
      setExpenses(expensesData)
      setDayTotal(totalData)
    } catch (error) {
      console.error("Error loading expense data:", error)
      toast.error("Veriler yüklenirken hata oluştu")
      setExpenses([])
      setDayTotal("0")
    } finally {
      setLoading(false)
    }
  }

  const handleExpenseAdded = () => {
    loadExpenseData()
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Giderler</h1>
          <p className="text-sm text-slate-600 mt-1">
            Günlük gider takibi ve yönetimi
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Gider Ekle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Tarih Filtresi
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <DatePicker
              date={selectedDate}
              onSelect={setSelectedDate}
              placeholder="Tüm tarihler"
              className="w-full"
            />
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(undefined)}
                className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                Filtreyi Temizle
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              {selectedDate ? "Günlük Toplam" : "Tüm Giderler Toplamı"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32 bg-slate-100" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(dayTotal)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {selectedDate 
                    ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                    : `${expenses.length} toplam gider`
                  }
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-600" />
              Gider Listesi
            </CardTitle>
            <div className="text-sm text-slate-600">
              {loading ? "Yükleniyor..." : `${expenses.length} gider`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-100" />
              ))}
            </div>
          ) : (
            <ExpenseTable expenses={expenses} />
          )}
        </CardContent>
      </Card>

      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        onSuccess={handleExpenseAdded}
      />
    </div>
  )
}
