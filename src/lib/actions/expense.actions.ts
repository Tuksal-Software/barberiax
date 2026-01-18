'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/actions/auth.actions'
import { Prisma } from '@prisma/client'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'

export interface CreateExpenseInput {
  date: string
  amount: number
  category: 'rent' | 'electricity' | 'water' | 'product' | 'staff' | 'other'
  description?: string
}

export interface CreateExpenseResult {
  success: boolean
  error?: string
  id?: string
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<CreateExpenseResult> {
  try {
    await requireAuth()
    const { date, amount, category, description } = input

    if (amount <= 0) {
      return {
        success: false,
        error: 'Tutar 0\'dan büyük olmalıdır',
      }
    }

    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return {
        success: false,
        error: 'Tarih formatı YYYY-MM-DD olmalıdır',
      }
    }

    if (!prisma || !prisma.expense) {
      return {
        success: false,
        error: 'Veritabanı bağlantısı kurulamadı. Lütfen sayfayı yenileyin.',
      }
    }

    const session = await requireAuth()

    const expense = await prisma.expense.create({
      data: {
        date,
        amount: new Prisma.Decimal(amount),
        category,
        description: description || null,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.EXPENSE_CREATED,
        entityType: 'expense',
        entityId: expense.id,
        summary: 'Expense created',
        metadata: {
          amount,
          category,
          description: description || null,
          date,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return {
      success: true,
      id: expense.id,
    }
  } catch (error) {
    console.error('Expense create error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export interface ExpenseItem {
  id: string
  date: string
  amount: string
  category: string
  description: string | null
  createdAt: Date
}

export async function getExpensesByDate(
  date: string | null
): Promise<ExpenseItem[]> {
  await requireAuth()

  const where = date && date.trim() !== '' ? { date } : {}

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return expenses.map((expense) => ({
    id: expense.id,
    date: expense.date,
    amount: expense.amount.toString(),
    category: expense.category,
    description: expense.description,
    createdAt: expense.createdAt,
  }))
}

export async function getExpenseDayTotal(
  date: string | null
): Promise<string> {
  await requireAuth()

  const where = date && date.trim() !== '' ? { date } : {}

  const result = await prisma.expense.aggregate({
    where,
    _sum: {
      amount: true,
    },
  })

  const total = result._sum.amount || new Prisma.Decimal(0)
  return total.toString()
}

export async function getExpenseMonthTotal(
  month: string
): Promise<string> {
  await requireAuth()

  if (!month.match(/^\d{4}-\d{2}$/)) {
    return '0'
  }

  const result = await prisma.expense.aggregate({
    where: {
      date: {
        startsWith: month,
      },
    },
    _sum: {
      amount: true,
    },
  })

  const total = result._sum.amount || new Prisma.Decimal(0)
  return total.toString()
}

export async function getTodayExpenseTotal(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  return getExpenseDayTotal(today)
}

export async function getMonthExpenseTotal(): Promise<string> {
  const today = new Date()
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return getExpenseMonthTotal(month)
}
