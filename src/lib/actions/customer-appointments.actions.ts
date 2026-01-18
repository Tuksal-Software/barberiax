"use server"

import { prisma } from "@/lib/prisma"
import { getNowUTC } from "@/lib/time"
import { createAppointmentDateTimeTR } from "@/lib/time/appointmentDateTime"

export interface CustomerAppointment {
  id: string
  barberId: string
  barberName: string
  barberImage: string | null
  customerName: string
  customerPhone: string
  date: string
  requestedStartTime: string
  requestedEndTime: string | null
  serviceType: string | null
  status: string
  cancelledBy: string | null
  subscriptionId: string | null
  createdAt: Date
}

export interface CustomerAppointmentsResponse {
  upcoming: CustomerAppointment | null
  past: CustomerAppointment[]
}

function normalizePhone(phone: string): string {
  if (!phone) return ''
  if (phone.startsWith('+90')) return phone
  if (phone.startsWith('90')) return `+${phone}`
  if (phone.startsWith('0')) return `+90${phone.slice(1)}`
  if (phone.startsWith('5')) return `+90${phone}`
  return `+90${phone}`
}

export async function getCustomerAppointments(phone: string): Promise<CustomerAppointmentsResponse> {
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone.match(/^\+90[5][0-9]{9}$/)) {
    throw new Error('Geçerli bir telefon numarası girin')
  }

  const appointments = await prisma.appointmentRequest.findMany({
    where: {
      customerPhone: normalizedPhone,
    },
    include: {
      barber: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { requestedStartTime: 'desc' },
    ],
  })

  const now = getNowUTC()

  const upcomingAppointments: CustomerAppointment[] = []
  const pastAppointments: CustomerAppointment[] = []

  for (const apt of appointments) {
    const appointmentDateTime = createAppointmentDateTimeTR(apt.date, apt.requestedStartTime)
    
    const mappedAppointment: CustomerAppointment = {
      id: apt.id,
      barberId: apt.barberId,
      barberName: apt.barber.name,
      barberImage: apt.barber.image,
      customerName: apt.customerName,
      customerPhone: apt.customerPhone,
      date: apt.date,
      requestedStartTime: apt.requestedStartTime,
      requestedEndTime: apt.requestedEndTime,
      serviceType: apt.serviceType,
      status: apt.status,
      cancelledBy: apt.cancelledBy,
      subscriptionId: apt.subscriptionId,
      createdAt: apt.createdAt,
    }

    if (appointmentDateTime.getTime() > now.getTime() && (apt.status === 'pending' || apt.status === 'approved')) {
      upcomingAppointments.push(mappedAppointment)
    } else {
      pastAppointments.push(mappedAppointment)
    }
  }

  upcomingAppointments.sort((a, b) => {
    const dateA = createAppointmentDateTimeTR(a.date, a.requestedStartTime)
    const dateB = createAppointmentDateTimeTR(b.date, b.requestedStartTime)
    return dateA.getTime() - dateB.getTime()
  })
  
  return {
    upcoming: upcomingAppointments[0] || null,
    past: pastAppointments,
  }
}

export async function cancelAppointmentByCustomer(
  appointmentId: string,
  customerPhone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(customerPhone)

    if (!normalizedPhone.match(/^\+90[5][0-9]{9}$/)) {
      return { success: false, error: 'Geçerli bir telefon numarası girin' }
    }

    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: appointmentId },
      include: {
        appointmentSlots: true,
      },
    })

    if (!appointment) {
      return { success: false, error: 'Randevu bulunamadı' }
    }

    if (appointment.customerPhone !== normalizedPhone) {
      return { success: false, error: 'Bu randevu size ait değil' }
    }

    if (appointment.status === 'cancelled') {
      return { success: false, error: 'Randevu zaten iptal edilmiş' }
    }

    const appointmentDateTime = createAppointmentDateTimeTR(appointment.date, appointment.requestedStartTime)
    const now = getNowUTC()

    if (appointmentDateTime.getTime() <= now.getTime()) {
      return { success: false, error: 'Geçmiş randevular iptal edilemez' }
    }

    if (appointment.status !== 'pending' && appointment.status !== 'approved') {
      return { success: false, error: 'Bu randevu iptal edilemez' }
    }

    await prisma.$transaction(async (tx) => {
      if (appointment.status === 'approved' && appointment.appointmentSlots.length > 0) {
        await tx.appointmentSlot.deleteMany({
          where: {
            appointmentRequestId: appointment.id,
          },
        })
      }

      await tx.appointmentRequest.update({
        where: { id: appointment.id },
        data: {
          status: 'cancelled',
          cancelledBy: 'customer' as any,
        },
      })
    })

    const { formatDateTimeForSms } = await import('@/lib/time/formatDate')
    const { sendSms } = await import('@/lib/sms/sms.service')
    const { getAdminPhoneSetting } = await import('@/lib/settings/settings-helpers')
    
    const customerMessage = `Randevunuz başarıyla iptal edilmiştir. ${formatDateTimeForSms(appointment.date, appointment.requestedStartTime)}`

    try {
      await sendSms(normalizedPhone, customerMessage)
      try {
        await prisma.smsLog.create({
          data: {
            to: normalizedPhone,
            message: customerMessage,
            event: 'CUSTOMER_CANCEL_SUCCESS',
            provider: 'vatansms',
            status: 'success',
            error: null,
          },
        })
      } catch (error) {
        console.error('SMS log error:', error)
      }
    } catch (smsError) {
      try {
        await prisma.smsLog.create({
          data: {
            to: normalizedPhone,
            message: customerMessage,
            event: 'CUSTOMER_CANCEL_SUCCESS',
            provider: 'vatansms',
            status: 'error',
            error: smsError instanceof Error ? smsError.message : String(smsError),
          },
        })
      } catch (error) {
        console.error('SMS log error:', error)
      }
    }

    const adminPhone = await getAdminPhoneSetting()
    if (adminPhone && adminPhone.trim()) {
      const adminMessage = `📌 Müşteri tarafından iptal edildi:\n${appointment.customerName} – ${formatDateTimeForSms(appointment.date, appointment.requestedStartTime)}`
      
      try {
        await sendSms(adminPhone, adminMessage)
        try {
          await prisma.smsLog.create({
            data: {
              to: adminPhone,
              message: adminMessage,
              event: 'CUSTOMER_CANCEL_ADMIN_NOTIFY',
              provider: 'vatansms',
              status: 'success',
              error: null,
            },
          })
        } catch (error) {
          console.error('SMS log error:', error)
        }
      } catch (smsError) {
        try {
          await prisma.smsLog.create({
            data: {
              to: adminPhone,
              message: adminMessage,
              event: 'CUSTOMER_CANCEL_ADMIN_NOTIFY',
              provider: 'vatansms',
              status: 'error',
              error: smsError instanceof Error ? smsError.message : String(smsError),
            },
          })
        } catch (error) {
          console.error('SMS log error:', error)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Cancel appointment error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Bir hata oluştu' }
  }
}
