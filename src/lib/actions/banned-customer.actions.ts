"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export interface BannedCustomerWithStats {
  id: string
  customerPhone: string
  customerName: string
  reason: string | null
  banType: string
  bannedAt: Date
  bannedUntil: Date | null
  isActive: boolean
  cancelledAppointmentsCount: number
}

export async function getAllBannedCustomers(): Promise<BannedCustomerWithStats[]> {
  const bannedCustomers = await prisma.bannedCustomer.findMany({
    where: { isActive: true },
    orderBy: { bannedAt: 'desc' },
  })

  const customersWithStats = await Promise.all(
    bannedCustomers.map(async (customer) => {
      const cancelledCount = await prisma.appointmentRequest.count({
        where: {
          customerPhone: customer.customerPhone,
          status: 'cancelled',
        },
      })

      return {
        ...customer,
        cancelledAppointmentsCount: cancelledCount,
      }
    })
  )

  return customersWithStats
}

export async function banCustomer(data: {
  customerPhone: string
  customerName: string
  reason?: string
  banType: 'permanent' | 'temporary'
  bannedUntil?: Date
}) {
  const { customerPhone, customerName, reason, banType, bannedUntil } = data

  const normalizedPhone = customerPhone.startsWith('+90') 
    ? customerPhone 
    : `+90${customerPhone.replace(/\D/g, '')}`

  const existing = await prisma.bannedCustomer.findFirst({
    where: {
      customerPhone: normalizedPhone,
      isActive: true,
    },
  })

  if (existing) {
    throw new Error('Bu müşteri zaten engellenmiş durumda')
  }

  if (banType === 'temporary' && !bannedUntil) {
    throw new Error('Geçici ban için bitiş tarihi gerekli')
  }

  const oldBan = await prisma.bannedCustomer.findFirst({
    where: {
      customerPhone: normalizedPhone,
      isActive: false,
    },
  })

  if (oldBan) {
    await prisma.bannedCustomer.delete({
      where: { id: oldBan.id },
    })
  }

  await prisma.bannedCustomer.create({
    data: {
      customerPhone: normalizedPhone,
      customerName,
      reason: reason || null,
      banType,
      bannedUntil: banType === 'temporary' ? bannedUntil : null,
      isActive: true,
    },
  })

  revalidatePath('/admin/engellenen-musteriler')
  return { success: true }
}

export async function unbanCustomer(id: string) {
  await prisma.bannedCustomer.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/admin/engellenen-musteriler')
  return { success: true }
}

export async function isCustomerBanned(customerPhone: string): Promise<boolean> {
  const normalizedPhone = customerPhone.startsWith('+90') 
    ? customerPhone 
    : `+90${customerPhone.replace(/\D/g, '')}`

  const now = new Date()
  
  const bannedCustomer = await prisma.bannedCustomer.findFirst({
    where: {
      customerPhone: normalizedPhone,
      isActive: true,
      OR: [
        { banType: 'permanent' },
        {
          AND: [
            { banType: 'temporary' },
            { bannedUntil: { gte: now } },
          ],
        },
      ],
    },
  })

  return !!bannedCustomer
}
