'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/actions/auth.actions'
import { Prisma } from '@prisma/client'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'
import { addDays, addWeeks, addMonths, parseISO } from 'date-fns'

export interface CreateRecurringExpenseInput {
  title: string
  amount: number
  category: 'rent' | 'electricity' | 'water' | 'product' | 'staff' | 'other'
  repeatType: 'daily' | 'weekly' | 'monthly'
  repeatInterval: number
  startDate: string
  endDate?: string | null
}

export interface CreateRecurringExpenseResult {
  success: boolean
  error?: string
  id?: string
}

function calculateNextRunAt(
  startDate: Date,
  repeatType: 'daily' | 'weekly' | 'monthly',
  repeatInterval: number
): Date {
  if (repeatType === 'daily') {
    return addDays(startDate, repeatInterval)
  } else if (repeatType === 'weekly') {
    return addWeeks(startDate, repeatInterval)
  } else {
    return addMonths(startDate, repeatInterval)
  }
}

export async function createRecurringExpense(
  input: CreateRecurringExpenseInput
): Promise<CreateRecurringExpenseResult> {
  try {
    const session = await requireAuth()
    const { title, amount, category, repeatType, repeatInterval, startDate, endDate } = input

    if (amount <= 0) {
      return {
        success: false,
        error: 'Tutar 0\'dan büyük olmalıdır',
      }
    }

    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return {
        success: false,
        error: 'Başlangıç tarihi formatı YYYY-MM-DD olmalıdır',
      }
    }

    if (repeatInterval <= 0) {
      return {
        success: false,
        error: 'Tekrar aralığı 1\'den büyük olmalıdır',
      }
    }

    const startDateObj = parseISO(startDate)
    const endDateObj = endDate ? parseISO(endDate) : null

    if (endDateObj && endDateObj < startDateObj) {
      return {
        success: false,
        error: 'Bitiş tarihi başlangıç tarihinden önce olamaz',
      }
    }

    const nextRunAt = calculateNextRunAt(startDateObj, repeatType, repeatInterval)

    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        title,
        amount: new Prisma.Decimal(amount),
        category,
        repeatType,
        repeatInterval,
        startDate,
        nextRunAt,
        endDate: endDate || null,
        isActive: true,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.RECURRING_EXPENSE_CREATED,
        entityType: 'expense',
        entityId: recurringExpense.id,
        summary: `Recurring expense created: ${title}`,
        metadata: {
          title,
          amount,
          category,
          repeatType,
          repeatInterval,
          startDate,
          endDate: endDate || null,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return {
      success: true,
      id: recurringExpense.id,
    }
  } catch (error) {
    console.error('Recurring expense create error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export interface RecurringExpenseItem {
  id: string
  title: string
  amount: string
  category: string
  repeatType: string
  repeatInterval: number
  startDate: string
  nextRunAt: Date
  endDate: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getRecurringExpenses(): Promise<RecurringExpenseItem[]> {
  await requireAuth()

  const recurringExpenses = await prisma.recurringExpense.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })

  return recurringExpenses.map((item) => ({
    id: item.id,
    title: item.title,
    amount: item.amount.toString(),
    category: item.category,
    repeatType: item.repeatType,
    repeatInterval: item.repeatInterval,
    startDate: item.startDate,
    nextRunAt: item.nextRunAt,
    endDate: item.endDate,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))
}

export async function toggleRecurringExpense(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()

    await prisma.recurringExpense.update({
      where: { id },
      data: { isActive },
    })

    if (!isActive) {
      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.RECURRING_EXPENSE_DISABLED,
          entityType: 'expense',
          entityId: id,
          summary: 'Recurring expense disabled',
          metadata: {
            id,
          },
        })
      } catch (error) {
        console.error('Audit log error:', error)
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Toggle recurring expense error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}
