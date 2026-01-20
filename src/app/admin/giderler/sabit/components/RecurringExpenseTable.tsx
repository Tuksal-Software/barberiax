"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { RecurringExpenseItem } from "@/lib/actions/recurring-expense.actions"
import { formatDateTimeTR } from "@/lib/time/formatDate"
import { toggleRecurringExpense } from "@/lib/actions/recurring-expense.actions"
import { toast } from "sonner"
import { RefreshCw, Calendar, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { tr } from "date-fns/locale/tr"

interface RecurringExpenseTableProps {
  expenses: RecurringExpenseItem[]
  onToggle: () => void
}

const categoryLabels: Record<string, string> = {
  rent: "Kira",
  electricity: "Elektrik",
  water: "Su",
  product: "Ürün",
  staff: "Personel",
  other: "Diğer",
}

const categoryColors: Record<string, string> = {
  rent: "bg-red-50 text-red-700 border-red-200",
  electricity: "bg-yellow-50 text-yellow-700 border-yellow-200",
  water: "bg-blue-50 text-blue-700 border-blue-200",
  product: "bg-green-50 text-green-700 border-green-200",
  staff: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
}

const repeatTypeLabels: Record<string, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
}

function getRepeatLabel(repeatType: string, repeatInterval: number): string {
  const typeLabel = repeatTypeLabels[repeatType] || repeatType
  if (repeatInterval === 1) {
    return typeLabel
  }
  return `Her ${repeatInterval} ${typeLabel.toLowerCase()}`
}

export function RecurringExpenseTable({ expenses, onToggle }: RecurringExpenseTableProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(parseFloat(amount))
  }

  const handleToggle = async (id: string, currentValue: boolean) => {
    const newValue = !currentValue
    const result = await toggleRecurringExpense(id, newValue)
    
    if (result.success) {
      toast.success(newValue ? "Sabit gider aktif edildi" : "Sabit gider pasif edildi")
      onToggle()
    } else {
      toast.error(result.error || "İşlem sırasında hata oluştu")
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-2">
          <RefreshCw className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-slate-600 font-medium">Henüz sabit gider tanımlanmamış</p>
        <p className="text-slate-500 text-sm mt-1">
          Düzenli olarak tekrarlanan giderlerinizi ekleyerek otomatik takip edebilirsiniz
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
            <TableHead className="text-slate-700 font-semibold">Başlık</TableHead>
            <TableHead className="text-slate-700 font-semibold">Tutar</TableHead>
            <TableHead className="text-slate-700 font-semibold">Kategori</TableHead>
            <TableHead className="text-slate-700 font-semibold">Tekrar</TableHead>
            <TableHead className="text-slate-700 font-semibold">Sonraki Çalışma</TableHead>
            <TableHead className="text-slate-700 font-semibold">Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow 
              key={expense.id}
              className={cn(
                "border-slate-100 hover:bg-slate-50 transition-colors",
                !expense.isActive && "opacity-60"
              )}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">{expense.title}</p>
                  {expense.endDate && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bitiş: {format(new Date(expense.endDate), "d MMM yyyy", { locale: tr })}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-semibold text-slate-900">
                {formatCurrency(expense.amount)}
              </TableCell>
              <TableCell>
                <Badge className={cn("font-normal", categoryColors[expense.category] || categoryColors.other)}>
                  {categoryLabels[expense.category] || expense.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm text-slate-700">
                    {getRepeatLabel(expense.repeatType, expense.repeatInterval)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 cursor-help">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm text-slate-700">
                          {format(new Date(expense.nextRunAt), "d MMM yyyy", { locale: tr })}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border-slate-200 text-slate-900">
                      <p className="text-sm">
                        {formatDateTimeTR(expense.nextRunAt)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={expense.isActive}
                    onCheckedChange={() => handleToggle(expense.id, expense.isActive)}
                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    expense.isActive ? "text-green-700" : "text-slate-500"
                  )}>
                    {expense.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
