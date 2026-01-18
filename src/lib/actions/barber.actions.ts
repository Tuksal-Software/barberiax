'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/actions/auth.actions'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createAppointmentDateTimeTR } from '@/lib/time/appointmentDateTime'
import { getNowUTC } from '@/lib/time'
import { Prisma } from '@prisma/client'

export interface BarberListItem {
  id: string
  name: string
  slotDuration: number
  isActive: boolean
  image: string | null
}

export interface BarberListForManagement {
  id: string
  name: string
  email: string
  experience: number
  image: string | null
  isActive: boolean
}

export interface CreateBarberInput {
  name: string
  experience?: number
}

export interface UpdateBarberInput {
  id: string
  name: string
  experience?: number
}

export interface DeactivateBarberResult {
  success: boolean
  error?: string
  hasFutureAppointments?: boolean
  appointmentCount?: number
}

export async function getActiveBarbers(): Promise<BarberListItem[]> {
  const barbers = await prisma.barber.findMany({
    where: {
      isActive: true,
      role: 'barber',
    },
    select: {
      id: true,
      name: true,
      slotDuration: true,
      isActive: true,
      image: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return barbers
}

export async function getBarbersForManagement(): Promise<BarberListForManagement[]> {
  await requireAdmin()

  const barbers = await prisma.barber.findMany({
    where: {
      role: 'barber',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      experience: true,
      image: true,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return barbers
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function createBarber(
  input: CreateBarberInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const session = await requireAdmin()
    const { name, experience } = input

    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Ad Soyad zorunludur',
      }
    }

    const slug = slugify(name)
    const email = `${slug}@themenshair.com`

    const existingBarber = await prisma.barber.findUnique({
      where: { email },
    })

    if (existingBarber) {
      let counter = 1
      let newEmail = `${slug}-${counter}@themenshair.com`
      while (await prisma.barber.findUnique({ where: { email: newEmail } })) {
        counter++
        newEmail = `${slug}-${counter}@themenshair.com`
      }
      const finalEmail = newEmail

      const password = generateRandomPassword()
      const hashedPassword = await bcrypt.hash(password, 10)

      const barber = await prisma.barber.create({
        data: {
          name: name.trim(),
          email: finalEmail,
          password: hashedPassword,
          role: 'barber',
          experience: experience || 0,
          isActive: true,
        },
      })

      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.UI_SETTINGS_SAVED,
          entityType: 'other',
          entityId: barber.id,
          summary: `Berber oluşturuldu: ${barber.name}`,
          metadata: {
            barberId: barber.id,
            barberName: barber.name,
            email: finalEmail,
            experience: experience || 0,
          },
        })
      } catch (error) {
        console.error('Audit log error:', error)
      }

      return {
        success: true,
        id: barber.id,
      }
    }

    const password = generateRandomPassword()
    const hashedPassword = await bcrypt.hash(password, 10)

    const barber = await prisma.barber.create({
      data: {
        name: name.trim(),
        email,
        password: hashedPassword,
        role: 'barber',
        experience: experience || 0,
        isActive: true,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.UI_SETTINGS_SAVED,
        entityType: 'other',
        entityId: barber.id,
        summary: `Berber oluşturuldu: ${barber.name}`,
        metadata: {
          barberId: barber.id,
          barberName: barber.name,
          email,
          experience: experience || 0,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return {
      success: true,
      id: barber.id,
    }
  } catch (error) {
    console.error('Create barber error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export async function updateBarber(
  input: UpdateBarberInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin()
    const { id, name, experience } = input

    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Ad Soyad zorunludur',
      }
    }

    const barber = await prisma.barber.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
      },
    })

    if (!barber) {
      return {
        success: false,
        error: 'Berber bulunamadı',
      }
    }

    if (barber.role !== 'barber') {
      return {
        success: false,
        error: 'Bu işlem sadece berberler için geçerlidir',
      }
    }

    const oldName = barber.name

    await prisma.barber.update({
      where: { id },
      data: {
        name: name.trim(),
        experience: experience || 0,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.UI_SETTINGS_SAVED,
        entityType: 'other',
        entityId: id,
        summary: `Berber güncellendi: ${oldName} -> ${name.trim()}`,
        metadata: {
          barberId: id,
          oldName,
          newName: name.trim(),
          experience: experience || 0,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update barber error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export async function checkBarberFutureAppointments(
  barberId: string
): Promise<{ hasFutureAppointments: boolean; count: number }> {
  await requireAdmin()

  const nowTR = getNowUTC()

  const activeAppointments = await prisma.appointmentRequest.findMany({
    where: {
      barberId,
      status: {
        in: ['pending', 'approved'],
      },
    },
    select: {
      id: true,
      date: true,
      requestedStartTime: true,
    },
  })

  const futureAppointments = activeAppointments.filter((appointment) => {
    const appointmentDateTime = createAppointmentDateTimeTR(
      appointment.date,
      appointment.requestedStartTime
    )
    return appointmentDateTime.getTime() > nowTR.getTime()
  })

  return {
    hasFutureAppointments: futureAppointments.length > 0,
    count: futureAppointments.length,
  }
}

export async function deactivateBarber(
  barberId: string
): Promise<DeactivateBarberResult> {
  try {
    const session = await requireAdmin()

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!barber) {
      return {
        success: false,
        error: 'Berber bulunamadı',
      }
    }

    if (barber.role !== 'barber') {
      return {
        success: false,
        error: 'Bu işlem sadece berberler için geçerlidir',
      }
    }

    if (!barber.isActive) {
      return {
        success: false,
        error: 'Berber zaten pasif durumda',
      }
    }

    const nowTR = getNowUTC()

    const activeAppointments = await prisma.appointmentRequest.findMany({
      where: {
        barberId,
        status: {
          in: ['pending', 'approved'],
        },
      },
      select: {
        id: true,
        date: true,
        requestedStartTime: true,
      },
    })

    const futureAppointments = activeAppointments.filter((appointment) => {
      const appointmentDateTime = createAppointmentDateTimeTR(
        appointment.date,
        appointment.requestedStartTime
      )
      return appointmentDateTime.getTime() > nowTR.getTime()
    })

    if (futureAppointments.length > 0) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.appointmentRequest.updateMany({
          where: {
            id: {
              in: futureAppointments.map((apt) => apt.id),
            },
          },
          data: {
            status: 'cancelled',
            cancelledBy: 'system',
          },
        })

        await tx.appointmentSlot.updateMany({
          where: {
            appointmentRequestId: {
              in: futureAppointments.map((apt) => apt.id),
            },
          },
          data: {
            status: 'free',
            appointmentRequestId: null,
          },
        })

        await tx.barber.update({
          where: { id: barberId },
          data: {
            isActive: false,
          },
        })
      })

      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.UI_SETTINGS_SAVED,
          entityType: 'other',
          entityId: barberId,
          summary: `Berber pasifleştirildi: ${barber.name} (${futureAppointments.length} randevu iptal edildi)`,
          metadata: {
            barberId,
            barberName: barber.name,
            cancelledAppointments: futureAppointments.length,
          },
        })

        for (const apt of futureAppointments) {
          try {
            await auditLog({
              actorType: 'system',
              action: AuditAction.APPOINTMENT_CANCELLED,
              entityType: 'appointment',
              entityId: apt.id,
              summary: `Randevu iptal edildi (berber pasifleştirildi)`,
              metadata: {
                barberId,
                reason: 'barber_deactivated',
              },
            })
          } catch (error) {
            console.error('Audit log error for appointment:', error)
          }
        }
      } catch (error) {
        console.error('Audit log error:', error)
      }
    } else {
      await prisma.barber.update({
        where: { id: barberId },
        data: {
          isActive: false,
        },
      })

      try {
        await auditLog({
          actorType: 'admin',
          actorId: session.userId,
          action: AuditAction.UI_SETTINGS_SAVED,
          entityType: 'other',
          entityId: barberId,
          summary: `Berber pasifleştirildi: ${barber.name}`,
          metadata: {
            barberId,
            barberName: barber.name,
          },
        })
      } catch (error) {
        console.error('Audit log error:', error)
      }
    }

    return {
      success: true,
      hasFutureAppointments: futureAppointments.length > 0,
      appointmentCount: futureAppointments.length,
    }
  } catch (error) {
    console.error('Deactivate barber error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export async function updateBarberImage(
  barberId: string,
  imagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: {
        id: true,
        role: true,
      },
    })

    if (!barber) {
      return {
        success: false,
        error: 'Berber bulunamadı',
      }
    }

    if (barber.role !== 'barber') {
      return {
        success: false,
        error: 'Bu işlem sadece berberler için geçerlidir',
      }
    }

    await prisma.barber.update({
      where: { id: barberId },
      data: {
        image: imagePath,
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update barber image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export async function getBarberById(barberId: string) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  })

  return barber
}






