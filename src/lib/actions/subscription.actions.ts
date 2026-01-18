'use server'

import { prisma } from '@/lib/prisma'
import { AuditAction, Prisma, SubscriptionRecurrenceType } from '@prisma/client'
import { parseTimeToMinutes, minutesToTime, overlaps } from '@/lib/time'
import { createAppointmentDateTimeTR } from '@/lib/time/appointmentDateTime'
import { getNowUTC } from '@/lib/time'
import { requireAdmin } from '@/lib/actions/auth.actions'
import { dispatchSms } from '@/lib/sms/sms.dispatcher'
import { SmsEvent } from '@/lib/sms/sms.events'
import { auditLog } from '@/lib/audit/audit.logger'
import { addDays, addWeeks, startOfMonth, getDay, format, isAfter, isBefore, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale/tr'

export interface CreateSubscriptionInput {
  barberId: string
  customerName: string
  customerPhone: string
  recurrenceType: SubscriptionRecurrenceType
  dayOfWeek: number
  weekOfMonth?: number | null
  startTime: string
  durationMinutes: number
  startDate: string
  endDate?: string | null
}

export interface UpdateSubscriptionInput {
  subscriptionId: string
  customerName?: string
  customerPhone?: string
  recurrenceType?: SubscriptionRecurrenceType
  dayOfWeek?: number
  weekOfMonth?: number | null
  startTime?: string
  durationMinutes?: number
  startDate?: string
  endDate?: string | null
  isActive?: boolean
}

function getNextDateForDayOfWeek(
  startDate: Date,
  dayOfWeek: number,
  weekOfMonth?: number | null
): Date {
  const targetDay = dayOfWeek === 0 ? 7 : dayOfWeek
  const currentDay = getDay(startDate) === 0 ? 7 : getDay(startDate)
  
  let daysToAdd = targetDay - currentDay
  if (daysToAdd < 0) {
    daysToAdd += 7
  }
  if (daysToAdd === 0 && weekOfMonth) {
    const monthStart = startOfMonth(startDate)
    const firstDayOfWeek = getDay(monthStart) === 0 ? 7 : getDay(monthStart)
    const firstTargetDay = (targetDay - firstDayOfWeek + 7) % 7
    const currentWeekOfMonth = Math.floor((startDate.getDate() - 1 + firstTargetDay) / 7) + 1
    
    if (currentWeekOfMonth !== weekOfMonth) {
      daysToAdd = 7
    }
  }
  
  return addDays(startDate, daysToAdd)
}

function getNextAppointmentDates(
  subscription: {
    recurrenceType: SubscriptionRecurrenceType
    dayOfWeek: number
    weekOfMonth?: number | null
    startDate: string
    endDate?: string | null
  },
  fromDate: Date,
  maxDates: number = 100
): string[] {
  const dates: string[] = []
  const endDate = subscription.endDate ? parseISO(subscription.endDate) : null
  let currentDate = new Date(fromDate)
  
  if (isBefore(currentDate, parseISO(subscription.startDate))) {
    currentDate = parseISO(subscription.startDate)
  }
  
  let iterationCount = 0
  const maxIterations = maxDates * 10
  
  while (dates.length < maxDates && iterationCount < maxIterations) {
    iterationCount++
    
    if (endDate && isAfter(currentDate, endDate)) {
      break
    }
    
    let nextDate: Date
    
    if (subscription.recurrenceType === 'weekly') {
      nextDate = getNextDateForDayOfWeek(currentDate, subscription.dayOfWeek)
      if (format(nextDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')) {
        nextDate = addWeeks(nextDate, 1)
      }
    } else if (subscription.recurrenceType === 'biweekly') {
      nextDate = getNextDateForDayOfWeek(currentDate, subscription.dayOfWeek)
      if (format(nextDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')) {
        nextDate = addWeeks(nextDate, 2)
      } else {
        const weekAfter = addWeeks(nextDate, 1)
        const weekAfterDay = getDay(weekAfter) === 0 ? 7 : getDay(weekAfter)
        const targetDay = subscription.dayOfWeek === 0 ? 7 : subscription.dayOfWeek
        if (weekAfterDay === targetDay) {
          nextDate = weekAfter
        } else {
          nextDate = addWeeks(nextDate, 2)
        }
      }
    } else {
      const monthStart = startOfMonth(currentDate)
      const firstDayOfWeek = getDay(monthStart) === 0 ? 7 : getDay(monthStart)
      const targetDay = subscription.dayOfWeek === 0 ? 7 : subscription.dayOfWeek
      const firstTargetDay = (targetDay - firstDayOfWeek + 7) % 7
      const weekOfMonth = subscription.weekOfMonth || 1
      const targetDate = firstTargetDay + (weekOfMonth - 1) * 7
      
      if (targetDate > 0 && targetDate <= 31) {
        nextDate = new Date(monthStart)
        nextDate.setDate(targetDate)
        
        if (isBefore(nextDate, currentDate) || format(nextDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')) {
          nextDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
          const nextFirstDayOfWeek = getDay(nextDate) === 0 ? 7 : getDay(nextDate)
          const nextFirstTargetDay = (targetDay - nextFirstDayOfWeek + 7) % 7
          const nextTargetDate = nextFirstTargetDay + (weekOfMonth - 1) * 7
          if (nextTargetDate > 0 && nextTargetDate <= 31) {
            nextDate.setDate(nextTargetDate)
          } else {
            currentDate = addDays(monthStart, 32)
            continue
          }
        }
      } else {
        currentDate = addDays(monthStart, 32)
        continue
      }
    }
    
    const dateStr = format(nextDate, 'yyyy-MM-dd')
    if (!dates.includes(dateStr)) {
      dates.push(dateStr)
    }
    
    currentDate = addDays(nextDate, 1)
  }
  
  return dates
}

async function checkSlotAvailability(
  tx: Prisma.TransactionClient,
  barberId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const [existingSlots, overrides] = await Promise.all([
    tx.appointmentSlot.findMany({
      where: {
        barberId,
        date,
        status: 'blocked',
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
    tx.workingHourOverride.findMany({
      where: {
        barberId,
        date,
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
  ])
  
  for (const slot of existingSlots) {
    if (overlaps(startTime, endTime, slot.startTime, slot.endTime)) {
      return false
    }
  }
  
  for (const override of overrides) {
    if (overlaps(startTime, endTime, override.startTime, override.endTime)) {
      return false
    }
  }
  
  return true
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<string> {
  const session = await requireAdmin()
  
  let {
    barberId,
    customerName,
    customerPhone,
    recurrenceType,
    dayOfWeek,
    weekOfMonth,
    startTime,
    durationMinutes,
    startDate,
    endDate,
  } = input
  
  if (!barberId) {
    const activeBarbers = await prisma.barber.findMany({
      where: {
        isActive: true,
        role: 'barber',
      },
      select: {
        id: true,
      },
    })
    
    if (activeBarbers.length === 0) {
      throw new Error('Aktif berber bulunamadı')
    }
    
    if (activeBarbers.length === 1) {
      barberId = activeBarbers[0].id
    } else {
      throw new Error('Berber seçimi gereklidir')
    }
  }
  
  if (!customerName || !customerPhone || !recurrenceType || dayOfWeek === undefined || !startTime || !durationMinutes || !startDate) {
    throw new Error('Tüm zorunlu alanlar doldurulmalıdır')
  }
  
  if (dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('Gün 1-7 arasında olmalıdır (Pazartesi-Pazar)')
  }
  
  if (recurrenceType === 'monthly' && (!weekOfMonth || weekOfMonth < 1 || weekOfMonth > 5)) {
    throw new Error('Aylık abonman için hafta numarası 1-5 arasında olmalıdır')
  }
  
  if (recurrenceType !== 'monthly' && weekOfMonth !== null && weekOfMonth !== undefined) {
    throw new Error('Hafta numarası sadece aylık abonmanlar için kullanılabilir')
  }
  
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { isActive: true },
  })
  
  if (!barber) {
    throw new Error('Berber bulunamadı')
  }
  
  if (!barber.isActive) {
    throw new Error('Berber aktif değil')
  }
  
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = startMinutes + durationMinutes
  const endTime = minutesToTime(endMinutes)
  
  const nowTR = getNowUTC()
  const startDateObj = parseISO(startDate)
  const endDateObj = endDate ? parseISO(endDate) : null
  
  if (isBefore(startDateObj, nowTR)) {
    throw new Error('Başlangıç tarihi geçmişte olamaz')
  }
  
  if (endDateObj && isBefore(endDateObj, startDateObj)) {
    throw new Error('Bitiş tarihi başlangıç tarihinden önce olamaz')
  }
  
  let subscriptionId: string
  
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const subscription = await tx.subscription.create({
      data: {
        barberId,
        customerName,
        customerPhone,
        recurrenceType,
        dayOfWeek,
        weekOfMonth: recurrenceType === 'monthly' ? weekOfMonth : null,
        startTime,
        durationMinutes,
        startDate,
        endDate: endDate || null,
        isActive: true,
      },
    })
    
    subscriptionId = subscription.id
    
    const appointmentDates = getNextAppointmentDates(
      {
        recurrenceType,
        dayOfWeek,
        weekOfMonth: recurrenceType === 'monthly' ? weekOfMonth : null,
        startDate,
        endDate: endDate || null,
      },
      startDateObj,
      100
    )
    
    const nowTRStr = format(nowTR, 'yyyy-MM-dd')
    const futureDates = appointmentDates.filter(date => date >= nowTRStr)
    
    for (const date of futureDates) {
      const isAvailable = await checkSlotAvailability(tx, barberId, date, startTime, endTime)
      
      if (!isAvailable) {
        throw new Error(`${date} tarihinde ${startTime} saatinde çakışma var. Abonman oluşturulamadı.`)
      }
      
      const appointmentRequest = await tx.appointmentRequest.create({
        data: {
          barberId,
          customerName,
          customerPhone,
          date,
          requestedStartTime: startTime,
          requestedEndTime: endTime,
          status: 'approved',
          subscriptionId: subscription.id,
        },
      })
      
      await tx.appointmentSlot.create({
        data: {
          barberId,
          appointmentRequestId: appointmentRequest.id,
          date,
          startTime,
          endTime,
          status: 'blocked',
        },
      })
    }
  })
  
  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.SUBSCRIPTION_CREATED,
      entityType: 'appointment',
      entityId: subscriptionId!,
      summary: 'Subscription created',
      metadata: {
        barberId,
        customerName,
        customerPhone,
        recurrenceType,
        dayOfWeek,
        weekOfMonth,
        startTime,
        durationMinutes,
        startDate,
        endDate,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
  
  try {
    await dispatchSms(SmsEvent.SubscriptionCreated, {
      customerName,
      customerPhone,
      recurrenceType,
      dayOfWeek,
      weekOfMonth,
      startTime,
      startDate,
    })
  } catch (error) {
    console.error('SMS error:', error)
  }
  
  return subscriptionId!
}

export async function updateSubscription(
  input: UpdateSubscriptionInput
): Promise<void> {
  const session = await requireAdmin()
  
  const { subscriptionId, ...updateData } = input
  
  if (!subscriptionId) {
    throw new Error('Abonman ID gereklidir')
  }
  
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })
  
  if (!subscription) {
    throw new Error('Abonman bulunamadı')
  }
  
  if (updateData.dayOfWeek !== undefined && (updateData.dayOfWeek < 1 || updateData.dayOfWeek > 7)) {
    throw new Error('Gün 1-7 arasında olmalıdır (Pazartesi-Pazar)')
  }
  
  if (updateData.recurrenceType === 'monthly' && updateData.weekOfMonth !== undefined && (updateData.weekOfMonth === null || updateData.weekOfMonth < 1 || updateData.weekOfMonth > 5)) {
    throw new Error('Aylık abonman için hafta numarası 1-5 arasında olmalıdır')
  }
  
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
  })
  
  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityType: 'appointment',
      entityId: subscriptionId,
      summary: 'Subscription updated',
      metadata: updateData,
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const session = await requireAdmin()
  
  if (!subscriptionId) {
    throw new Error('Abonman ID gereklidir')
  }
  
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      appointmentRequests: {
        where: {
          status: {
            in: ['pending', 'approved'],
          },
        },
        include: {
          appointmentSlots: true,
        },
      },
    },
  })
  
  if (!subscription) {
    throw new Error('Abonman bulunamadı')
  }
  
  const nowTR = getNowUTC()
  
  const futureAppointmentIds: string[] = []
  
  for (const appointment of subscription.appointmentRequests) {
    const appointmentDateTime = createAppointmentDateTimeTR(
      appointment.date,
      appointment.appointmentSlots.length > 0
        ? appointment.appointmentSlots[0].startTime
        : appointment.requestedStartTime
    )
    
    if (appointmentDateTime.getTime() > nowTR.getTime()) {
      futureAppointmentIds.push(appointment.id)
    }
  }
  
  await prisma.$transaction([
    ...(futureAppointmentIds.length > 0 ? [
      prisma.appointmentSlot.deleteMany({
        where: {
          appointmentRequestId: {
            in: futureAppointmentIds,
          },
        },
      }),
      prisma.appointmentRequest.updateMany({
        where: {
          id: {
            in: futureAppointmentIds,
          },
        },
        data: {
          status: 'cancelled',
          cancelledBy: 'admin' as any,
        },
      }),
    ] : []),
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: false,
      },
    }),
  ])
  
  try {
    await dispatchSms(SmsEvent.SubscriptionCancelled, {
      customerName: subscription.customerName,
      customerPhone: subscription.customerPhone,
    })
  } catch (error) {
    console.error('SMS error:', error)
  }
  
  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      entityType: 'appointment',
      entityId: subscriptionId,
      summary: 'Subscription cancelled',
      metadata: {
        customerName: subscription.customerName,
        customerPhone: subscription.customerPhone,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

export async function generateSubscriptionAppointments(
  subscriptionId: string
): Promise<number> {
  const session = await requireAdmin()
  
  if (!subscriptionId) {
    throw new Error('Abonman ID gereklidir')
  }
  
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })
  
  if (!subscription) {
    throw new Error('Abonman bulunamadı')
  }
  
  if (!subscription.isActive) {
    throw new Error('Pasif abonman için randevu oluşturulamaz')
  }
  
  const nowTR = getNowUTC()
  const nowTRStr = format(nowTR, 'yyyy-MM-dd')
  
  const existingAppointments = await prisma.appointmentRequest.findMany({
    where: {
      subscriptionId,
      status: {
        in: ['pending', 'approved'],
      },
      date: {
        gte: nowTRStr,
      },
    },
    select: {
      date: true,
    },
  })
  
  const existingDates = new Set(existingAppointments.map(apt => apt.date))
  
  const startDateObj = parseISO(subscription.startDate)
  const endDateObj = subscription.endDate ? parseISO(subscription.endDate) : null
  const fromDate = isAfter(startDateObj, nowTR) ? startDateObj : nowTR
  
  const appointmentDates = getNextAppointmentDates(
    {
      recurrenceType: subscription.recurrenceType,
      dayOfWeek: subscription.dayOfWeek,
      weekOfMonth: subscription.weekOfMonth,
      startDate: subscription.startDate,
      endDate: subscription.endDate || null,
    },
    fromDate,
    50
  )
  
  const newDates = appointmentDates.filter(date => !existingDates.has(date))
  
  if (newDates.length === 0) {
    return 0
  }
  
  const startMinutes = parseTimeToMinutes(subscription.startTime)
  const endMinutes = startMinutes + subscription.durationMinutes
  const endTime = minutesToTime(endMinutes)
  
  let createdCount = 0
  
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const date of newDates) {
      const isAvailable = await checkSlotAvailability(
        tx,
        subscription.barberId,
        date,
        subscription.startTime,
        endTime
      )
      
      if (!isAvailable) {
        continue
      }
      
      const appointmentRequest = await tx.appointmentRequest.create({
        data: {
          barberId: subscription.barberId,
          customerName: subscription.customerName,
          customerPhone: subscription.customerPhone,
          date,
          requestedStartTime: subscription.startTime,
          requestedEndTime: endTime,
          status: 'approved',
          subscriptionId: subscription.id,
        },
      })
      
      await tx.appointmentSlot.create({
        data: {
          barberId: subscription.barberId,
          appointmentRequestId: appointmentRequest.id,
          date,
          startTime: subscription.startTime,
          endTime,
          status: 'blocked',
        },
      })
      
      createdCount++
    }
  })
  
  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.SUBSCRIPTION_APPOINTMENTS_GENERATED,
      entityType: 'appointment',
      entityId: subscriptionId,
      summary: 'Subscription appointments generated',
      metadata: {
        count: createdCount,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
  
  return createdCount
}

export async function getSubscriptions(barberId?: string) {
  const session = await requireAdmin()
  
  return await prisma.subscription.findMany({
    where: barberId ? { barberId } : {},
    include: {
      barber: {
        select: {
          id: true,
          name: true,
        },
      },
      appointmentRequests: {
        where: {
          status: {
            in: ['pending', 'approved'],
          },
        },
        select: {
          id: true,
          date: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getSubscriptionById(subscriptionId: string) {
  const session = await requireAdmin()
  
  return await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      barber: {
        select: {
          id: true,
          name: true,
        },
      },
      appointmentRequests: {
        include: {
          appointmentSlots: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  })
}

