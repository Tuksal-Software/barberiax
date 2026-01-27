'use server'

import { prisma } from '@/lib/prisma'
import { AuditAction, Prisma } from '@prisma/client'
import { parseTimeToMinutes, minutesToTime, overlaps, getNowUTC } from '@/lib/time'
import { createAppointmentDateTimeTR } from '@/lib/time/appointmentDateTime'
import { sendSms } from '@/lib/sms/sms.service'
import { requireAuth } from '@/lib/db-helpers'
import { dispatchSms, sendSmsForEvent } from '@/lib/sms/sms.dispatcher'
import { SmsEvent } from '@/lib/sms/sms.events'
import type { AppointmentApprovedPayload } from '@/lib/sms/sms.templates'
import { auditLog } from '@/lib/audit/audit.logger'
import { isCustomerBanned } from './banned-customer.actions'
import { getTenantFilter, getCurrentTenant } from '@/lib/db-helpers'

export interface CreateAppointmentRequestInput {
  barberId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  requestedStartTime: string
  requestedEndTime?: string
  serviceType?: string
  durationMinutes?: number
}

export interface ApproveAppointmentRequestInput {
  appointmentRequestId: string
  approvedDurationMinutes: 30 | 60
}

export interface CancelAppointmentRequestInput {
  appointmentRequestId: string
  reason?: string
}

export interface CreateAdminAppointmentInput {
  barberId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  requestedStartTime: string
  durationMinutes: 30 | 60
}

export async function getCustomerByPhone(phone: string): Promise<{ customerName: string } | null> {
  if (!phone || !phone.startsWith('+90')) {
    return null
  }

  const tenantFilter = await getTenantFilter()
  const appointment = await prisma.appointmentRequest.findFirst({
    where: {
      customerPhone: phone,
      ...tenantFilter,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      customerName: true,
    },
  })

  return appointment ? { customerName: appointment.customerName } : null
}

export async function createAppointmentRequest(
  input: CreateAppointmentRequestInput
): Promise<string | { error: string }> {
  const {
    barberId,
    customerName,
    customerPhone,
    customerEmail,
    date,
    requestedStartTime,
    requestedEndTime,
    serviceType,
    durationMinutes,
  } = input

  const isBanned = await isCustomerBanned(customerPhone)
  if (isBanned) {
    return { 
      error: 'Hesabınız engellenmiş durumda. Randevu alamazsınız. Lütfen berberle iletişime geçin.' 
    }
  }

  try {
    await auditLog({
      actorType: 'customer',
      actorId: customerPhone,
      action: AuditAction.APPOINTMENT_CREATE_ATTEMPT,
      entityType: 'appointment',
      entityId: null,
      summary: 'Appointment creation attempted',
      metadata: {
        barberId,
        customerName,
        customerPhone,
        date,
        requestedStartTime,
        requestedEndTime,
        serviceType,
        durationMinutes,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  if (!barberId || !customerName || !customerPhone || !date || !requestedStartTime) {
    return { error: 'Tüm zorunlu alanlar doldurulmalıdır' }
  }

  const tenantFilter = await getTenantFilter()
  const barber = await prisma.barber.findUnique({
    where: { 
      id: barberId,
      ...tenantFilter,
    },
    select: { isActive: true, name: true },
  })

  if (!barber) {
    return { error: 'Berber bulunamadı' }
  }

  if (!barber.isActive) {
    return { error: 'Berber aktif değil' }
  }

  let calculatedEndTime: string | null = null
  if (durationMinutes && requestedStartTime) {
    const startMinutes = parseTimeToMinutes(requestedStartTime)
    const endMinutes = startMinutes + durationMinutes
    calculatedEndTime = minutesToTime(endMinutes)
  }

  const finalEndTime = requestedEndTime || calculatedEndTime

  const activeAppointments = await prisma.appointmentRequest.findMany({
    where: {
      customerPhone,
      status: {
        in: ['pending', 'approved'],
      },
      ...tenantFilter,
    },
    select: {
      date: true,
      requestedStartTime: true,
    },
  })

  const nowTR = getNowUTC()
  const futureAppointment = activeAppointments.find((appointment: { date: string; requestedStartTime: string }) => {
    const appointmentDateTime = createAppointmentDateTimeTR(appointment.date, appointment.requestedStartTime)
    return appointmentDateTime.getTime() > nowTR.getTime()
  })

  if (futureAppointment) {
    try {
      await auditLog({
        actorType: 'customer',
        actorId: customerPhone,
        action: AuditAction.APPOINTMENT_CANCEL_DENIED,
        entityType: 'appointment',
        entityId: null,
        summary: 'Appointment creation denied - active appointment exists',
        metadata: {
          reason: 'active_appointment_exists',
          existingAppointment: {
            date: futureAppointment.date,
            requestedStartTime: futureAppointment.requestedStartTime,
          },
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }
    return { error: 'Aktif bir randevunuz bulunduğu için yeni randevu alamazsınız.' }
  }

  const { tenantId } = await getCurrentTenant()
  const appointmentRequest = await prisma.appointmentRequest.create({
    data: {
      barberId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      date,
      requestedStartTime,
      requestedEndTime: finalEndTime,
      ...(serviceType ? { serviceType } : {}),
      status: 'pending',
      tenantId,
    },
  })

  try {
    await auditLog({
      actorType: 'customer',
      action: AuditAction.APPOINTMENT_CREATED,
      entityType: 'appointment',
      entityId: appointmentRequest.id,
      summary: 'Appointment request created',
      metadata: {
        barberId,
        date,
        requestedStartTime,
        requestedEndTime: finalEndTime,
        customerName,
        customerPhone,
        serviceType,
        durationMinutes,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  await dispatchSms(SmsEvent.AppointmentCreated, {
    customerName,
    customerPhone,
    barberId,
    barberName: barber.name,
    date,
    requestedStartTime,
    requestedEndTime: finalEndTime || '',
    serviceType: serviceType || null,
  })

  return appointmentRequest.id
}

export async function approveAppointmentRequest(
  input: ApproveAppointmentRequestInput
): Promise<string | { error: string }> {
  const session = await requireAuth()

  const { appointmentRequestId, approvedDurationMinutes } = input

  if (!appointmentRequestId || !approvedDurationMinutes) {
    return { error: 'Randevu talebi ID ve onaylanan süre gereklidir' }
  }

  if (![30, 60].includes(approvedDurationMinutes)) {
    return { error: 'Geçersiz süre. 30 veya 60 dakika olmalıdır' }
  }

  let smsPayload: AppointmentApprovedPayload | null = null

  const tenantFilter = await getTenantFilter()
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const appointmentRequest = await tx.appointmentRequest.findUnique({
      where: { 
        id: appointmentRequestId,
        ...tenantFilter,
      },
    })

    if (!appointmentRequest) {
      throw new Error('Randevu talebi bulunamadı')
    }

    if (appointmentRequest.status === 'cancelled') {
      throw new Error('İptal edilmiş randevu talepleri onaylanamaz')
    }

    if (appointmentRequest.status === 'approved') {
      await tx.appointmentSlot.deleteMany({
        where: {
          appointmentRequestId: appointmentRequest.id,
        },
      })
    }

    const startMinutes = parseTimeToMinutes(appointmentRequest.requestedStartTime)
    const endMinutes = startMinutes + approvedDurationMinutes
    const approvedStartTime = appointmentRequest.requestedStartTime
    const approvedEndTime = minutesToTime(endMinutes)

    const [existingBlockedSlots, overrides] = await Promise.all([
      tx.appointmentSlot.findMany({
        where: {
          barberId: appointmentRequest.barberId,
          date: appointmentRequest.date,
          status: 'blocked',
          ...tenantFilter,
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
      tx.workingHourOverride.findMany({
        where: {
          barberId: appointmentRequest.barberId,
          date: appointmentRequest.date,
          ...tenantFilter,
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
    ])

    for (const slot of existingBlockedSlots) {
      if (overlaps(approvedStartTime, approvedEndTime, slot.startTime, slot.endTime)) {
        throw new Error('Seçilen zaman aralığı zaten dolu')
      }
    }

    for (const override of overrides) {
      if (overlaps(approvedStartTime, approvedEndTime, override.startTime, override.endTime)) {
        throw new Error('Seçilen zaman aralığı kapatılmış saatler içeriyor')
      }
    }

    const { tenantId } = await getCurrentTenant()
    await tx.appointmentSlot.create({
      data: {
        barberId: appointmentRequest.barberId,
        appointmentRequestId: appointmentRequest.id,
        date: appointmentRequest.date,
        startTime: approvedStartTime,
        endTime: approvedEndTime,
        status: 'blocked',
        tenantId,
      },
    })

    await tx.appointmentRequest.update({
      where: { id: appointmentRequestId },
      data: { status: 'approved' },
    })

    smsPayload = {
      customerName: appointmentRequest.customerName,
      customerPhone: appointmentRequest.customerPhone,
      date: appointmentRequest.date,
      startTime: approvedStartTime,
      endTime: approvedEndTime,
      serviceType: appointmentRequest.serviceType || null,
    }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Randevu onaylama sırasında bir hata oluştu'
    return { error: errorMessage }
  }

  if (smsPayload) {
    await dispatchSms(SmsEvent.AppointmentApproved, smsPayload)
  }

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.APPOINTMENT_APPROVED,
      entityType: 'appointment',
      entityId: appointmentRequestId,
      summary: 'Appointment approved',
      metadata: smsPayload ? {
        approvedStartTime: (smsPayload as { startTime: string; endTime: string }).startTime,
        approvedEndTime: (smsPayload as { startTime: string; endTime: string }).endTime,
      } : null,
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  return appointmentRequestId
}

export async function cancelAppointmentRequest(
  input: CancelAppointmentRequestInput
): Promise<void> {
  const session = await requireAuth()

  const { appointmentRequestId, reason } = input

  if (!appointmentRequestId) {
    throw new Error('Randevu talebi ID gereklidir')
  }

  let smsPayload: {
    customerName: string
    customerPhone: string
    date: string
    time: string
    reason?: string | null
  } | null = null

  const tenantFilter = await getTenantFilter()
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const appointmentRequest = await tx.appointmentRequest.findUnique({
      where: { 
        id: appointmentRequestId,
        ...tenantFilter,
      },
      include: {
        appointmentSlots: true,
      },
    })

    if (!appointmentRequest) {
      throw new Error('Randevu talebi bulunamadı')
    }

    if (appointmentRequest.status === 'cancelled') {
      return
    }

    const appointmentStartTime = appointmentRequest.status === 'approved' && appointmentRequest.appointmentSlots.length > 0
      ? appointmentRequest.appointmentSlots[0].startTime
      : appointmentRequest.requestedStartTime
    const appointmentDateTime = createAppointmentDateTimeTR(appointmentRequest.date, appointmentStartTime)
    const nowTR = getNowUTC()

    if (appointmentDateTime.getTime() <= nowTR.getTime()) {
      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.APPOINTMENT_CANCEL_DENIED,
          entityType: 'appointment',
          entityId: appointmentRequestId,
          summary: 'Appointment cancel denied - past appointment',
          metadata: {
            reason: 'past_appointment',
            date: appointmentRequest.date,
            time: appointmentStartTime,
            appointmentDateTime: appointmentDateTime.toISOString(),
            now: nowTR.toISOString(),
          },
        })
      } catch (error) {
        console.error('Audit log error:', error)
      }
      throw new Error('Geçmiş randevular iptal edilemez')
    }

    const wasPending = appointmentRequest.status === 'pending'

    if (appointmentRequest.status === 'approved') {
      await tx.appointmentSlot.deleteMany({
        where: {
          appointmentRequestId: appointmentRequest.id,
        },
      })
    }

    await tx.appointmentRequest.update({
      where: { id: appointmentRequestId },
      data: {
        status: 'cancelled',
        cancelledBy: 'admin' as any,
      },
    })

    smsPayload = {
      customerName: appointmentRequest.customerName,
      customerPhone: appointmentRequest.customerPhone,
      date: appointmentRequest.date,
      time: appointmentRequest.requestedStartTime,
      reason: reason || null,
    }
  })

  if (smsPayload) {
    await dispatchSms(SmsEvent.AppointmentCancelledPending, smsPayload)
  }

  try {
    const appointmentRequest = await prisma.appointmentRequest.findUnique({
        where: { 
          id: appointmentRequestId,
          ...tenantFilter,
        },
        select: { 
          status: true,
          barberId: true,
          date: true,
          requestedStartTime: true,
        },
      })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.APPOINTMENT_CANCELLED,
        entityType: 'appointment',
        entityId: appointmentRequestId,
        summary: 'Appointment cancelled',
        metadata: {
          previousStatus: appointmentRequest?.status,
          reason: reason || null,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    if (appointmentRequest) {
      const fullAppointment = await prisma.appointmentRequest.findUnique({
        where: { 
          id: appointmentRequestId,
          ...tenantFilter,
        },
        select: {
          cancelledBy: true,
          customerName: true,
          customerPhone: true,
          date: true,
          requestedStartTime: true,
        },
      })

      if (fullAppointment?.cancelledBy === 'customer') {
        const { formatDateTimeForSms } = await import('@/lib/time/formatDate')
        const { sendSms } = await import('@/lib/sms/sms.service')
        const { getAdminPhoneSetting } = await import('@/lib/settings/settings-helpers')
        
        const customerMessage = `Randevunuz başarıyla iptal edilmiştir. ${formatDateTimeForSms(fullAppointment.date, fullAppointment.requestedStartTime)}`

        try {
          await sendSms(fullAppointment.customerPhone, customerMessage)
          const { tenantId } = await getCurrentTenant()
          try {
            await prisma.smsLog.create({
              data: {
                to: fullAppointment.customerPhone,
                message: customerMessage,
                event: 'CUSTOMER_CANCEL_SUCCESS',
                provider: 'vatansms',
                status: 'success',
                error: null,
                tenantId,
              },
            })
          } catch (error) {
            console.error('SMS log error:', error)
          }
        } catch (smsError) {
          const { tenantId } = await getCurrentTenant()
          try {
            await prisma.smsLog.create({
              data: {
                to: fullAppointment.customerPhone,
                message: customerMessage,
                event: 'CUSTOMER_CANCEL_SUCCESS',
                provider: 'vatansms',
                status: 'error',
                error: smsError instanceof Error ? smsError.message : String(smsError),
                tenantId,
              },
            })
          } catch (error) {
            console.error('SMS log error:', error)
          }
        }

        const adminPhone = await getAdminPhoneSetting()
        if (adminPhone && adminPhone.trim()) {
          const adminMessage = `📌 Müşteri tarafından iptal edildi:\n${fullAppointment.customerName} – ${formatDateTimeForSms(fullAppointment.date, fullAppointment.requestedStartTime)}`
          
          try {
            await sendSms(adminPhone, adminMessage)
            const { tenantId } = await getCurrentTenant()
            try {
              await prisma.smsLog.create({
                data: {
                  to: adminPhone,
                  message: adminMessage,
                  event: 'CUSTOMER_CANCEL_ADMIN_NOTIFY',
                  provider: 'vatansms',
                  status: 'success',
                  error: null,
                  tenantId,
                },
              })
            } catch (error) {
              console.error('SMS log error:', error)
            }
          } catch (smsError) {
            const { tenantId } = await getCurrentTenant()
            try {
              await prisma.smsLog.create({
                data: {
                  to: adminPhone,
                  message: adminMessage,
                  event: 'CUSTOMER_CANCEL_ADMIN_NOTIFY',
                  provider: 'vatansms',
                  status: 'error',
                  error: smsError instanceof Error ? smsError.message : String(smsError),
                  tenantId,
                },
              })
            } catch (error) {
              console.error('SMS log error:', error)
            }
          }
        }
      }

      try {
        const { notifyWaitingCustomers } = await import('./appointment-waitlist.actions')
        await notifyWaitingCustomers({
          barberId: appointmentRequest.barberId,
          date: appointmentRequest.date,
          cancelledTime: appointmentRequest.requestedStartTime,
        })
      } catch (error) {
        console.error('Waitlist notification error:', error)
      }
    }
  } catch {
  }
}

export async function createAdminAppointment(
  input: CreateAdminAppointmentInput
): Promise<string> {
  const session = await requireAuth()

  const {
    barberId,
    customerName,
    customerPhone,
    customerEmail,
    date,
    requestedStartTime,
    durationMinutes,
  } = input

  const isBanned = await isCustomerBanned(customerPhone)
  if (isBanned) {
    throw new Error('Bu müşteri engellenmiş durumda. Randevu oluşturulamaz.')
  }

  if (!barberId || !customerName || !customerPhone || !date || !requestedStartTime || !durationMinutes) {
    throw new Error('Tüm zorunlu alanlar doldurulmalıdır')
  }

  if (![30, 60].includes(durationMinutes)) {
    throw new Error('Geçersiz süre. 30 veya 60 dakika olmalıdır')
  }

  const tenantFilter = await getTenantFilter()
  const barber = await prisma.barber.findUnique({
    where: { 
      id: barberId,
      ...tenantFilter,
    },
    select: { isActive: true },
  })

  if (!barber) {
    throw new Error('Berber bulunamadı')
  }

  if (!barber.isActive) {
    throw new Error('Berber aktif değil')
  }

  const startMinutes = parseTimeToMinutes(requestedStartTime)
  const endMinutes = startMinutes + durationMinutes
  const approvedEndTime = minutesToTime(endMinutes)

  const appointmentRequest = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const [existingBlockedSlots, overrides] = await Promise.all([
      tx.appointmentSlot.findMany({
        where: {
          barberId,
          date,
          status: 'blocked',
          ...tenantFilter,
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
          ...tenantFilter,
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
    ])

    for (const slot of existingBlockedSlots) {
      if (overlaps(requestedStartTime, approvedEndTime, slot.startTime, slot.endTime)) {
        throw new Error('Seçilen zaman aralığı zaten dolu')
      }
    }

    for (const override of overrides) {
      if (overlaps(requestedStartTime, approvedEndTime, override.startTime, override.endTime)) {
        throw new Error('Seçilen zaman aralığı kapatılmış saatler içeriyor')
      }
    }

    const { tenantId } = await getCurrentTenant()
    const appointmentRequest = await tx.appointmentRequest.create({
      data: {
        barberId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        date,
        requestedStartTime,
        requestedEndTime: approvedEndTime,
        status: 'approved',
        tenantId,
      },
    })

    await tx.appointmentSlot.create({
      data: {
        barberId,
        appointmentRequestId: appointmentRequest.id,
        date,
        startTime: requestedStartTime,
        endTime: approvedEndTime,
        status: 'blocked',
        tenantId,
      },
    })

    return appointmentRequest
  })

  try {
    await auditLog({
      actorType: 'admin',
      actorId: session.userId,
      action: AuditAction.ADMIN_APPOINTMENT_CREATED,
      entityType: 'appointment',
      entityId: appointmentRequest.id,
      summary: 'Admin appointment created',
      metadata: {
        barberId,
        customerName,
        customerPhone,
        date,
        requestedStartTime,
        approvedEndTime,
        source: 'ADMIN_MANUAL',
        createdBy: 'admin',
        approvedBy: 'admin',
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }

  console.log('[createAdminAppointment] Transaction completed, sending SMS...')
  console.log('[createAdminAppointment] SMS params:', {
    customerName,
    customerPhone,
    date,
    startTime: requestedStartTime,
    endTime: approvedEndTime,
  })

  await sendSmsForEvent({
    event: SmsEvent.AdminAppointmentCreated,
    to: customerPhone,
    payload: {
      customerName,
      date,
      startTime: requestedStartTime,
      endTime: approvedEndTime,
    },
  })

  console.log('[createAdminAppointment] SMS send completed')

  return appointmentRequest.id
}

