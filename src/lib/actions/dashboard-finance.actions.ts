'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/db-helpers'
import { Prisma } from '@prisma/client'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns'
import { getTenantFilter } from '@/lib/db-helpers'

export interface FinanceSummary {
  totalRevenue: number
  totalExpense: number
  netProfit: number
}

export interface FinanceChartData {
  date: string
  revenue: number
  expense: number
}

export async function getFinanceSummary(
  range: 'day' | 'week' | 'month' | 'all'
): Promise<FinanceSummary> {
  const session = await requireAuth()
  const tenantFilter = await getTenantFilter()
  
  const now = new Date()
  let dateStart: string | null = null
  let dateEnd: string | null = null

  if (range === 'day') {
    const today = format(now, 'yyyy-MM-dd')
    dateStart = today
    dateEnd = today
  } else if (range === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    dateStart = format(weekStart, 'yyyy-MM-dd')
    dateEnd = format(weekEnd, 'yyyy-MM-dd')
  } else if (range === 'month') {
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    dateStart = format(monthStart, 'yyyy-MM-dd')
    dateEnd = format(monthEnd, 'yyyy-MM-dd')
  }

  const ledgerWhere: Prisma.LedgerEntryWhereInput = {
    ...tenantFilter,
  }
  if (dateStart && dateEnd) {
    ledgerWhere.date = {
      gte: dateStart,
      lte: dateEnd,
    }
  }

  const expenseWhere: Prisma.ExpenseWhereInput = {
    ...tenantFilter,
  }
  if (dateStart && dateEnd) {
    expenseWhere.date = {
      gte: dateStart,
      lte: dateEnd,
    }
  }

  const [revenueResult, expenseResult] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: ledgerWhere,
      _sum: {
        amount: true,
      },
    }),
    prisma.expense.aggregate({
      where: expenseWhere,
      _sum: {
        amount: true,
      },
    }),
  ])

  const totalRevenue = Number(revenueResult._sum.amount || 0)
  const totalExpense = Number(expenseResult._sum.amount || 0)
  const netProfit = totalRevenue - totalExpense

  return {
    totalRevenue,
    totalExpense,
    netProfit,
  }
}

export async function getFinanceChartData(
  range: 'week' | 'month'
): Promise<FinanceChartData[]> {
  const session = await requireAuth()
  const tenantFilter = await getTenantFilter()
  
  const now = new Date()
  let intervals: Date[] = []
  let dateFormat = 'yyyy-MM-dd'

  if (range === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    intervals = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(now, { weekStartsOn: 1 }),
    })
    dateFormat = 'EEE'
  } else if (range === 'month') {
    const monthStart = startOfMonth(now)
    intervals = eachDayOfInterval({
      start: monthStart,
      end: endOfMonth(now),
    })
    dateFormat = 'd'
  }

  const chartData: FinanceChartData[] = []

  const datePromises = intervals.map(async (interval) => {
    const dateStr = format(interval, 'yyyy-MM-dd')
    const label = format(interval, dateFormat)

    const ledgerWhere: Prisma.LedgerEntryWhereInput = {
      date: dateStr,
      ...tenantFilter,
    }

    const expenseWhere: Prisma.ExpenseWhereInput = {
      date: dateStr,
      ...tenantFilter,
    }

    const [revenueResult, expenseResult] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: ledgerWhere,
        _sum: {
          amount: true,
        },
      }),
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: {
          amount: true,
        },
      }),
    ])

    return {
      date: label,
      revenue: Number(revenueResult._sum.amount || 0),
      expense: Number(expenseResult._sum.amount || 0),
    }
  })

  const results = await Promise.all(datePromises)
  chartData.push(...results)

  return chartData
}

