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
import type { ExpenseItem } from "@/lib/actions/expense.actions"
import { formatDateTimeLongTR } from "@/lib/time/formatDate"
import { Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpenseTableProps {
  expenses: ExpenseItem[]
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

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(parseFloat(amount))
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-2">
          <Receipt className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-slate-600 font-medium">Gider bulunamadı</p>
        <p className="text-slate-500 text-sm mt-1">
          Bu tarih için kayıtlı gider bulunmuyor
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
            <TableHead className="text-slate-700 font-semibold">Kategori</TableHead>
            <TableHead className="text-slate-700 font-semibold">Tutar</TableHead>
            <TableHead className="text-slate-700 font-semibold">Açıklama</TableHead>
            <TableHead className="text-slate-700 font-semibold">Oluşturulma</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow 
              key={expense.id} 
              className="border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <TableCell>
                <Badge className={cn("font-normal", categoryColors[expense.category] || categoryColors.other)}>
                  {categoryLabels[expense.category] || expense.category}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold text-slate-900">
                {formatCurrency(expense.amount)}
              </TableCell>
              <TableCell className="max-w-xs">
                <span className="text-slate-700">
                  {expense.description || "-"}
                </span>
              </TableCell>
              <TableCell className="text-slate-600 text-sm">
                {formatDateTimeLongTR(expense.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
