'use server'

import { prisma } from '@/lib/prisma'
import { AuditAction, Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/actions/auth.actions'
import { auditLog } from '@/lib/audit/audit.logger'
import { parseTimeToMinutes, overlaps } from '@/lib/time'
import { dispatchSms } from '@/lib/sms/sms.dispatcher'
import { SmsEvent } from '@/lib/sms/sms.events'
import { sendSms as sendSmsMessage } from '@/lib/sms/sms.service'
import { getAdminPhoneSetting } from '@/lib/settings/settings-helpers'
import { formatDateForSms } from '@/lib/time/formatDate'

export interface WorkingHour {
  id: string
  barberId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorking: boolean
}

export interface WorkingHourOverride {
  id: string
  barberId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  createdAt: Date
}

export interface CreateOverrideResult {
  success: boolean
  overrideId?: string
  cancelledCount?: number
  smsSentCount?: number
  error?: string
}

export async function getWorkingHours(barberId: string): Promise<WorkingHour[]> {
  await requireAdmin()

  const workingHours = await prisma.workingHour.findMany({
    where: { barberId },
    orderBy: { dayOfWeek: 'asc' },
  })

  return workingHours
}

export async function updateWorkingHours(
  barberId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isWorking: boolean
): Promise<void> {
  const session = await requireAdmin()

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Geçersiz gün')
  }

  if (isWorking) {
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    if (startMinutes >= endMinutes) {
      throw new Error('Başlangıç saati bitiş saatinden küçük olmalıdır')
    }
  }

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { name: true },
  })

  if (!barber) {
    throw new Error('Berber bulunamadı')
  }

  await prisma.workingHour.upsert({
    where: {
      barberId_dayOfWeek: {
        barberId,
        dayOfWeek,
      },
    },
    create: {
      barberId,
      dayOfWeek,
      startTime,
      endTime,
      isWorking,
    },
    update: {
      startTime,
      endTime,
      isWorking,
    },
  })

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.WORKING_HOUR_UPDATED,
      entityType: 'appointment',
      entityId: null,
      summary: 'Working hour updated',
      metadata: {
        barberId,
        barberName: barber.name,
        dayOfWeek,
        startTime,
        endTime,
        isWorking,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

export async function getOverrides(
  barberId: string,
  date?: string
): Promise<WorkingHourOverride[]> {
  await requireAdmin()

  const where: any = { barberId }
  if (date) {
    where.date = date
  }

  const overrides = await prisma.workingHourOverride.findMany({
    where,
    orderBy: { date: 'desc' },
  })

  return overrides.map(override => ({
    id: override.id,
    barberId: override.barberId,
    date: override.date,
    startTime: override.startTime,
    endTime: override.endTime,
    reason: override.reason,
    createdAt: override.createdAt,
  }))
}

export async function createOverride(
  barberId: string,
  date: string,
  startTime: string,
  endTime: string,
  reason?: string,
  sendSms?: boolean
): Promise<CreateOverrideResult> {
  const session = await requireAdmin()

  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes >= endMinutes) {
    return {
      success: false,
      error: 'Başlangıç saati bitiş saatinden küçük olmalıdır',
    }
  }

  const defaultReason = 'İşletme tarafından kapatılan saatler'
  const finalReason = reason && reason.trim() ? reason.trim() : defaultReason

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { name: true },
  })

  if (!barber) {
    return {
      success: false,
      error: 'Berber bulunamadı',
    }
  }

  const conflictingAppointments = await prisma.appointmentRequest.findMany({
    where: {
      barberId,
      date,
      status: {
        in: ['pending', 'approved'],
      },
    },
    include: {
      appointmentSlots: true,
    },
  })

  const affectedAppointments = conflictingAppointments.filter(apt => {
    if (apt.appointmentSlots.length > 0) {
      return apt.appointmentSlots.some(slot =>
        overlaps(startTime, endTime, slot.startTime, slot.endTime)
      )
    } else {
      const aptStart = parseTimeToMinutes(apt.requestedStartTime)
      const aptEnd = aptStart + 30
      const overrideStart = parseTimeToMinutes(startTime)
      const overrideEnd = parseTimeToMinutes(endTime)
      return aptStart < overrideEnd && overrideStart < aptEnd
    }
  })

  const override = await prisma.workingHourOverride.create({
    data: {
      barberId,
      date,
      startTime,
      endTime,
      reason: finalReason,
    },
  })

  let cancelledCount = 0
  let smsSentCount = 0

  if (affectedAppointments.length > 0) {
    const appointmentsToCancel: Array<{
      id: string
      previousStatus: string
      customerName: string
      customerPhone: string
      date: string
      appointmentStartTime: string
    }> = []

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const apt of affectedAppointments) {
        const previousStatus = apt.status
        const appointmentStartTime =
          apt.appointmentSlots.length > 0
            ? apt.appointmentSlots[0].startTime
            : apt.requestedStartTime

        if (apt.status === 'approved') {
          await tx.appointmentSlot.deleteMany({
            where: {
              appointmentRequestId: apt.id,
            },
          })
        }

        await tx.appointmentRequest.update({
          where: { id: apt.id },
          data: {
            status: 'cancelled',
            cancelledBy: 'admin' as any,
          },
        })

        cancelledCount++

        appointmentsToCancel.push({
          id: apt.id,
          previousStatus,
          customerName: apt.customerName,
          customerPhone: apt.customerPhone,
          date: apt.date,
          appointmentStartTime,
        })
      }
    })

    for (const apt of appointmentsToCancel) {
      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.APPOINTMENT_CANCELLED_BY_OVERRIDE,
          entityType: 'appointment',
          entityId: apt.id,
          summary: 'Appointment cancelled by override',
          metadata: {
            barberId,
            date,
            startTime,
            endTime,
            appointmentId: apt.id,
            previousStatus: apt.previousStatus,
            reason: finalReason,
          },
        })
      } catch (error) {
        console.error('Audit log error:', error)
      }

      if (sendSms) {
        try {
          await dispatchSms(SmsEvent.AppointmentCancelledPending, {
            customerName: apt.customerName,
            customerPhone: apt.customerPhone,
            date: apt.date,
            time: apt.appointmentStartTime,
            reason: finalReason,
          })
          smsSentCount++
        } catch (error) {
          console.error('SMS gönderim hatası:', error)
        }
      }
    }

    if (sendSms && cancelledCount !== smsSentCount) {
      console.error(`SMS gönderim uyumsuzluğu: ${cancelledCount} randevu iptal edildi, ${smsSentCount} SMS gönderildi`)
    }
  }

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.WORKING_HOUR_OVERRIDE_CREATED,
      entityType: 'appointment',
      entityId: override.id,
      summary: 'Working hour override created',
      metadata: {
        barberId,
        barberName: barber.name,
        date,
        startTime,
        endTime,
        reason: finalReason,
        cancelledCount,
        smsSentCount,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  if (sendSms && cancelledCount > 0) {
    try {
      const adminPhone = await getAdminPhoneSetting()
      if (adminPhone && adminPhone.trim()) {
        const adminMessage = `⚠️ ${formatDateForSms(date)} ${startTime}-${endTime} saatleri kapatıldı. ${cancelledCount} randevu iptal edildi.`
        try {
          await sendSmsMessage(adminPhone, adminMessage)
          await prisma.smsLog.create({
            data: {
              to: adminPhone,
              message: adminMessage,
              event: 'WORKING_HOUR_OVERRIDE_CANCEL',
              provider: 'vatansms',
              status: 'success',
              error: null,
            },
          })
        } catch (error) {
          console.error('Admin SMS gönderim hatası:', error)
        }
      }
    } catch (error) {
      console.error('Admin phone setting hatası:', error)
    }
  }

  return {
    success: true,
    overrideId: override.id,
    cancelledCount,
    smsSentCount,
  }
}

export async function sendSmsForOverride(
  overrideId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()

  const override = await prisma.workingHourOverride.findUnique({
    where: { id: overrideId },
    include: {
      barber: {
        select: { name: true },
      },
    },
  })

  if (!override) {
    return {
      success: false,
      error: 'Override bulunamadı',
    }
  }

  const finalReason = override.reason || 'İşletme tarafından kapatılan saatler'

  const conflictingAppointments = await prisma.appointmentRequest.findMany({
    where: {
      barberId: override.barberId,
      date: override.date,
      status: 'cancelled',
      cancelledBy: 'admin',
    },
    include: {
      appointmentSlots: true,
    },
  })

  const affectedAppointments = conflictingAppointments.filter(apt => {
    const appointmentStartTime =
      apt.appointmentSlots.length > 0 && apt.appointmentSlots[0]
        ? apt.appointmentSlots[0].startTime
        : apt.requestedStartTime

    if (apt.appointmentSlots.length > 0 && apt.appointmentSlots[0]) {
      return overlaps(
        override.startTime,
        override.endTime,
        apt.appointmentSlots[0].startTime,
        apt.appointmentSlots[0].endTime
      )
    } else {
      const aptStart = parseTimeToMinutes(apt.requestedStartTime)
      const aptEnd = aptStart + 30
      const overrideStart = parseTimeToMinutes(override.startTime)
      const overrideEnd = parseTimeToMinutes(override.endTime)
      return aptStart < overrideEnd && overrideStart < aptEnd
    }
  })

  let smsSentCount = 0
  for (const apt of affectedAppointments) {
    try {
      const appointmentStartTime =
        apt.appointmentSlots.length > 0 && apt.appointmentSlots[0]
          ? apt.appointmentSlots[0].startTime
          : apt.requestedStartTime

      await dispatchSms(SmsEvent.AppointmentCancelledPending, {
        customerName: apt.customerName,
        customerPhone: apt.customerPhone,
        date: apt.date,
        time: appointmentStartTime,
        reason: finalReason,
      })
      smsSentCount++
    } catch (error) {
      console.error('SMS gönderim hatası:', error)
    }
  }

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.SMS_SENT,
      entityType: 'sms',
      entityId: overrideId,
      summary: 'SMS sent for override',
      metadata: {
        overrideId,
        smsSentCount,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  return {
    success: true,
  }
}

export async function deleteOverride(overrideId: string): Promise<void> {
  const session = await requireAdmin()

  const override = await prisma.workingHourOverride.findUnique({
    where: { id: overrideId },
    include: {
      barber: {
        select: { name: true },
      },
    },
  })

  if (!override) {
    throw new Error('Override bulunamadı')
  }

  await prisma.workingHourOverride.delete({
    where: { id: overrideId },
  })

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.WORKING_HOUR_OVERRIDE_DELETED,
      entityType: 'appointment',
      entityId: overrideId,
      summary: 'Working hour override deleted',
      metadata: {
        barberId: override.barberId,
        barberName: override.barber.name,
        date: override.date,
        startTime: override.startTime,
        endTime: override.endTime,
        reason: override.reason,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
