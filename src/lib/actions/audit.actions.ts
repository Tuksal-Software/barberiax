'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/actions/auth.actions'

export interface AuditLogFilters {
  actorType?: 'customer' | 'admin' | 'system' | 'all'
  action?: string
  entityType?: 'appointment' | 'ledger' | 'expense' | 'sms' | 'auth' | 'ui' | 'other' | 'all'
  fromDate?: string
  toDate?: string
  search?: string
  limit?: number
  offset?: number
}

export interface AuditLogItem {
  id: string
  actorType: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string | null
  summary: string
  metadata: any
  createdAt: Date
}

export interface AuditLogStats {
  total: number
  byActorType: {
    customer: number
    admin: number
    system: number
  }
  byEntityType: {
    appointment: number
    ledger: number
    expense: number
    sms: number
    auth: number
    ui: number
    other: number
  }
}

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogItem[]> {
  await requireAdmin()

  const {
    actorType,
    action,
    entityType,
    fromDate,
    toDate,
    search,
    limit = 100,
    offset = 0,
  } = filters

  const where: any = {}

  if (actorType && actorType !== 'all') {
    where.actorType = actorType
  }

  if (action && action !== 'all') {
    where.action = action
  }

  if (entityType && entityType !== 'all') {
    where.entityType = entityType
  }

  if (fromDate || toDate) {
    where.createdAt = {}
    if (fromDate) {
      where.createdAt.gte = new Date(fromDate)
    }
    if (toDate) {
      const toDateEnd = new Date(toDate)
      toDateEnd.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDateEnd
    }
  }

  if (search) {
    where.OR = [
      { summary: { contains: search } },
      { metadata: { string_contains: search } },
    ]
  }

  const logs = await prisma.auditLog.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      actorType: true,
      actorId: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      metadata: true,
      createdAt: true,
    },
  })

  return logs
}

export async function getAuditLogStats(): Promise<AuditLogStats> {
  await requireAdmin()

  const [total, byActorType, byEntityType] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ['actorType'],
      _count: true,
    }),
    prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: true,
    }),
  ])

  const stats: AuditLogStats = {
    total,
    byActorType: {
      customer: 0,
      admin: 0,
      system: 0,
    },
    byEntityType: {
      appointment: 0,
      ledger: 0,
      expense: 0,
      sms: 0,
      auth: 0,
      ui: 0,
      other: 0,
    },
  }

  byActorType.forEach((item) => {
    if (item.actorType === 'customer') stats.byActorType.customer = item._count
    if (item.actorType === 'admin') stats.byActorType.admin = item._count
    if (item.actorType === 'system') stats.byActorType.system = item._count
  })

  byEntityType.forEach((item) => {
    const key = item.entityType as keyof typeof stats.byEntityType
    if (key in stats.byEntityType) {
      stats.byEntityType[key] = item._count
    }
  })

  return stats
}

export interface TodayAuditSummary {
  totalEvents: number
  appointmentActions: number
  ledgerActions: number
  expenseActions: number
  smsSent: number
  authActions: number
}

export async function getTodayAuditSummary(): Promise<TodayAuditSummary> {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const where = {
    createdAt: {
      gte: today,
      lt: tomorrow,
    },
  }

  const [
    totalEvents,
    appointmentActions,
    ledgerActions,
    expenseActions,
    smsSent,
    authActions,
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        ...where,
        entityType: 'appointment',
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        entityType: 'ledger',
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        entityType: 'expense',
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        action: 'SMS_SENT',
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        entityType: 'auth',
      },
    }),
  ])

  return {
    totalEvents,
    appointmentActions,
    ledgerActions,
    expenseActions,
    smsSent,
    authActions,
  }
}

export interface RecentAuditActivity {
  id: string
  actorType: string
  action: string
  summary: string
  createdAt: Date
}

export async function getRecentAuditActivities(limit: number = 10): Promise<RecentAuditActivity[]> {
  await requireAdmin()

  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      actorType: true,
      action: true,
      summary: true,
      createdAt: true,
    },
  })

  return logs
}

