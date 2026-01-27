"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { parseTimeToMinutes } from "@/lib/time"
import { getTenantFilter, getCurrentTenant, getTenantIdForCreate } from "@/lib/db-helpers"

export interface WaitlistRequest {
  id: string
  customerPhone: string
  customerName: string
  barberId: string
  preferredDate: string
  timeRangeType: string
  status: string
  createdAt: Date
  notifiedAt: Date | null
}

export async function getBarberWorkingHoursForDate(barberId: string, date: string) {
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    throw new Error("Geçersiz tarih formatı")
  }

  const tenantFilter = await getTenantFilter()
  const barber = await prisma.barber.findUnique({
    where: {
      id: barberId,
      ...tenantFilter,
    },
  })

  if (!barber) {
    throw new Error("Berber bulunamadı")
  }

  const dayOfWeek = dateObj.getDay()

  const workingHour = await prisma.workingHour.findUnique({
    where: {
      barberId_dayOfWeek: {
        barberId,
        dayOfWeek,
      },
    },
  })

  if (!workingHour || !workingHour.isWorking) {
    return null
  }

  const override = await prisma.workingHourOverride.findFirst({
    where: {
      barberId,
      date,
    },
  })

  if (override) {
    return {
      startTime: override.startTime,
      endTime: override.endTime,
    }
  }

  return {
    startTime: workingHour.startTime,
    endTime: workingHour.endTime,
  }
}

export async function getTimeRanges(barberId: string, date: string) {
  const workingHours = await getBarberWorkingHoursForDate(barberId, date)
  
  if (!workingHours) {
    throw new Error("Berber çalışma saatleri bulunamadı")
  }

  const startMinutes = parseTimeToMinutes(workingHours.startTime)
  const endMinutes = parseTimeToMinutes(workingHours.endTime)
  const middleMinutes = Math.floor((startMinutes + endMinutes) / 2)
  
  const middleTime = `${String(Math.floor(middleMinutes / 60)).padStart(2, '0')}:${String(middleMinutes % 60).padStart(2, '0')}`
  
  return {
    morning: {
      start: workingHours.startTime,
      end: middleTime,
      label: `Sabah/Öğle (${workingHours.startTime} - ${middleTime})`
    },
    evening: {
      start: middleTime,
      end: workingHours.endTime,
      label: `Akşam (${middleTime} - ${workingHours.endTime})`
    }
  }
}

export async function createWaitlistRequest(data: {
  customerPhone: string
  customerName: string
  barberId: string
  preferredDate: string
  timeRangeType: 'morning' | 'evening'
}) {
  const { customerPhone, customerName, barberId, preferredDate, timeRangeType } = data

  const tenantFilter = await getTenantFilter()
  const { tenantId } = await getCurrentTenant()

  const barber = await prisma.barber.findUnique({
    where: {
      id: barberId,
      ...tenantFilter,
    },
  })

  if (!barber) {
    throw new Error('Berber bulunamadı')
  }

  const normalizedPhone = customerPhone.startsWith('+90') 
    ? customerPhone 
    : `+90${customerPhone.replace(/\D/g, '')}`

  const existing = await prisma.appointmentWaitlist.findUnique({
    where: {
      customerPhone_barberId_preferredDate: {
        customerPhone: normalizedPhone,
        barberId,
        preferredDate,
      }
    }
  })

  if (existing) {
    throw new Error('Bu tarih için zaten bir bildirim talebiniz var')
  }

  await prisma.appointmentWaitlist.create({
    data: {
      customerPhone: normalizedPhone,
      customerName,
      barberId,
      preferredDate,
      timeRangeType,
      status: 'active',
      ...(tenantId ? { tenantId } : {}),
    }
  })

  revalidatePath('/')
  return { success: true }
}

export async function notifyWaitingCustomers(data: {
  barberId: string
  date: string
  cancelledTime: string
}) {
  const { barberId, date, cancelledTime } = data
  
  const tenantFilter = await getTenantFilter()
  const waitingRequests = await prisma.appointmentWaitlist.findMany({
    where: {
      barberId,
      preferredDate: date,
      status: 'active',
      ...tenantFilter,
    }
  })

  if (waitingRequests.length === 0) return

  const timeRanges = await getTimeRanges(barberId, date)
  
  const cancelledMinutes = parseTimeToMinutes(cancelledTime)

  for (const request of waitingRequests) {
    let shouldNotify = false

    if (request.timeRangeType === 'morning') {
      const startMinutes = parseTimeToMinutes(timeRanges.morning.start)
      const endMinutes = parseTimeToMinutes(timeRanges.morning.end)
      if (cancelledMinutes >= startMinutes && cancelledMinutes < endMinutes) {
        shouldNotify = true
      }
    } else if (request.timeRangeType === 'evening') {
      const startMinutes = parseTimeToMinutes(timeRanges.evening.start)
      const endMinutes = parseTimeToMinutes(timeRanges.evening.end)
      if (cancelledMinutes >= startMinutes && cancelledMinutes <= endMinutes) {
        shouldNotify = true
      }
    }

    if (shouldNotify) {
      const { sendSms } = await import('@/lib/sms/sms.service')
      const siteUrl = process.env.SITE_URL || 'https://www.themenshair.com'
      const message = `Merhaba ${request.customerName}, ${date} tarihinde ${cancelledTime} saati açıldı! Hemen randevu almak için: ${siteUrl}`
      const tenantId = await getTenantIdForCreate()
      
      try {
        await sendSms(request.customerPhone, message)
        
        await prisma.smsLog.create({
          data: {
            to: request.customerPhone,
            message,
            event: 'WAITLIST_NOTIFICATION',
            provider: 'vatansms',
            status: 'success',
            ...(tenantId ? { tenantId } : {}),
          }
        })
      } catch (error) {
        console.error('Waitlist SMS error:', error)
        
        await prisma.smsLog.create({
          data: {
            to: request.customerPhone,
            message,
            event: 'WAITLIST_NOTIFICATION',
            provider: 'vatansms',
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            ...(tenantId ? { tenantId } : {}),
          }
        })
      }

      await prisma.appointmentWaitlist.update({
        where: { 
          id: request.id,
          ...tenantFilter,
        },
        data: {
          status: 'notified',
          notifiedAt: new Date(),
        }
      })
    }
  }

  revalidatePath('/')
}

export async function getAllWaitlistRequests(): Promise<WaitlistRequest[]> {
  const tenantFilter = await getTenantFilter()
  const requests = await prisma.appointmentWaitlist.findMany({
    where: {
      ...tenantFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return requests
}
