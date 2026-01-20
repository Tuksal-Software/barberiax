"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, TrendingUp, Calendar, DollarSign } from "lucide-react"
import { getRecurringExpenses } from "@/lib/actions/recurring-expense.actions"
import type { RecurringExpenseItem } from "@/lib/actions/recurring-expense.actions"
import { AddRecurringExpenseDialog } from "./components/AddRecurringExpenseDialog"
import { RecurringExpenseTable } from "./components/RecurringExpenseTable"
import { toast } from "sonner"

export const dynamic = 'force-dynamic'

export default function SabitGiderlerPage() {
  const [expenses, setExpenses] = useState<RecurringExpenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await getRecurringExpenses()
      setExpenses(data)
    } catch (error) {
      console.error("Error loading recurring expenses:", error)
      toast.error("Veriler yüklenirken hata oluştu")
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const handleExpenseAdded = () => {
    loadExpenses()
  }

  const activeExpenses = expenses.filter(e => e.isActive)
  const totalActiveCount = activeExpenses.length
  
  const estimatedMonthlyTotal = activeExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount)
    let monthlyAmount = 0
    
    if (expense.repeatType === 'daily') {
      monthlyAmount = (amount / expense.repeatInterval) * 30
    } else if (expense.repeatType === 'weekly') {
      monthlyAmount = (amount / expense.repeatInterval) * 4.33
    } else if (expense.repeatType === 'monthly') {
      monthlyAmount = amount / expense.repeatInterval
    }
    
    return sum + monthlyAmount
  }, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sabit Giderler</h1>
          <p className="text-sm text-slate-600 mt-1">
            Belirli aralıklarla otomatik olarak eklenen giderleri yönetin
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Sabit Gider Ekle
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 bg-slate-100" />
          <Skeleton className="h-32 bg-slate-100" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Aktif Sabit Giderler
              </CardTitle>
              <Calendar className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{totalActiveCount}</div>
              <p className="text-xs text-slate-600 mt-1">
                {expenses.length - totalActiveCount} pasif gider
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Tahmini Aylık Toplam
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(estimatedMonthlyTotal)}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Aktif giderlerin aylık tahmini toplamı
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">Tüm Sabit Giderler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-100" />
              ))}
            </div>
          ) : (
            <RecurringExpenseTable
              expenses={expenses}
              onToggle={loadExpenses}
            />
          )}
        </CardContent>
      </Card>

      <AddRecurringExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleExpenseAdded}
      />
    </div>
  )
}
