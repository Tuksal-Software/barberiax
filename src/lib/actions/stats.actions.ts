'use server'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, addDays } from 'date-fns'
import { tr } from 'date-fns/locale/tr'
import { requireAuth } from '@/lib/db-helpers'
import { getTenantFilter } from '@/lib/db-helpers'

export interface DashboardStats {
  pending: number
  approvedToday: number
  approvedTotal: number
  activeBarbers: number
  subscriptionCustomers: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth()
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const tenantFilter = await getTenantFilter()

  const baseWhere = session.role === 'barber' ? { barberId: session.userId } : {}

  const todayDateStr = format(today, 'yyyy-MM-dd')

  const [pending, approvedToday, approvedTotal, activeBarbers, subscriptionCustomers] = await Promise.all([
    prisma.appointmentRequest.count({
      where: {
        ...baseWhere,
        status: 'pending',
        subscriptionId: null,
        ...tenantFilter,
      },
    }),
    prisma.appointmentRequest.count({
      where: {
        ...baseWhere,
        status: 'approved',
        date: todayDateStr,
        subscriptionId: null,
        ...tenantFilter,
      },
    }),
    prisma.appointmentRequest.count({
      where: {
        ...baseWhere,
        status: 'approved',
        subscriptionId: null,
        ...tenantFilter,
      },
    }),
    prisma.barber.count({
      where: {
        isActive: true,
        role: 'barber',
        ...tenantFilter,
      },
    }),
    prisma.appointmentRequest.findMany({
      where: {
        ...baseWhere,
        subscriptionId: { not: null },
        status: {
          in: ['pending', 'approved'],
        },
        ...tenantFilter,
      },
      select: {
        customerPhone: true,
      },
      distinct: ['customerPhone'],
    }).then(result => result.length),
  ])

  return {
    pending,
    approvedToday,
    approvedTotal,
    activeBarbers,
    subscriptionCustomers,
  }
}

export interface WeeklyAppointmentData {
  day: string
  dayLabel: string
  count: number
}

export async function getWeeklyAppointments(): Promise<WeeklyAppointmentData[]> {
  const session = await requireAuth()
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const tenantFilter = await getTenantFilter()

  const baseWhere = session.role === 'barber' ? { barberId: session.userId } : {}

  const appointments = await prisma.appointmentRequest.findMany({
    where: {
      ...baseWhere,
      date: {
        gte: format(weekStart, 'yyyy-MM-dd'),
        lte: format(weekEnd, 'yyyy-MM-dd'),
      },
      subscriptionId: null,
      ...tenantFilter,
    },
    select: {
      date: true,
    },
  })

  const dayCounts: Record<string, number> = {}
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dayStr = format(day, 'yyyy-MM-dd')
    dayCounts[dayStr] = 0
  }

  appointments.forEach((apt) => {
    if (dayCounts[apt.date] !== undefined) {
      dayCounts[apt.date]++
    }
  })

  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i)
    const dayStr = format(day, 'yyyy-MM-dd')
    return {
      day: dayStr,
      dayLabel: format(day, 'EEE', { locale: tr }),
      count: dayCounts[dayStr] || 0,
    }
  })
}

export interface AppointmentStatusStats {
  approved: number
  cancelled: number
}

export async function getAppointmentStatusStats(): Promise<AppointmentStatusStats> {
  const session = await requireAuth()
  const tenantFilter = await getTenantFilter()
  const baseWhere = session.role === 'barber' ? { barberId: session.userId } : {}

  const [approved, cancelled] = await Promise.all([
    prisma.appointmentRequest.count({
      where: {
        ...baseWhere,
        status: 'approved',
        subscriptionId: null,
        ...tenantFilter,
      },
    }),
    prisma.appointmentRequest.count({
      where: {
        ...baseWhere,
        status: 'cancelled',
        subscriptionId: null,
        ...tenantFilter,
      },
    }),
  ])

  return {
    approved,
    cancelled,
  }
}

