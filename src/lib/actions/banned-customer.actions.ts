"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getTenantFilter, getCurrentTenant } from "@/lib/db-helpers"

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
  const tenantFilter = await getTenantFilter()
  const bannedCustomers = await prisma.bannedCustomer.findMany({
    where: { 
      isActive: true,
      ...tenantFilter,
    },
    orderBy: { bannedAt: 'desc' },
  })

  const customersWithStats = await Promise.all(
    bannedCustomers.map(async (customer) => {
      const cancelledCount = await prisma.appointmentRequest.count({
        where: {
          customerPhone: customer.customerPhone,
          status: 'cancelled',
          ...tenantFilter,
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

  const tenantFilter = await getTenantFilter()
  const existing = await prisma.bannedCustomer.findFirst({
    where: {
      customerPhone: normalizedPhone,
      isActive: true,
      ...tenantFilter,
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
      ...tenantFilter,
    },
  })

  if (oldBan) {
    await prisma.bannedCustomer.delete({
      where: { id: oldBan.id },
    })
  }

  const { tenantId } = await getCurrentTenant()
  await prisma.bannedCustomer.create({
    data: {
      customerPhone: normalizedPhone,
      customerName,
      reason: reason || null,
      banType,
      bannedUntil: banType === 'temporary' ? bannedUntil : null,
      isActive: true,
      tenantId,
    },
  })

  revalidatePath('/admin/engellenen-musteriler')
  return { success: true }
}

export async function unbanCustomer(id: string) {
  const tenantFilter = await getTenantFilter()
  await prisma.bannedCustomer.update({
    where: { 
      id,
      ...tenantFilter,
    },
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
  const tenantFilter = await getTenantFilter()
  
  const bannedCustomer = await prisma.bannedCustomer.findFirst({
    where: {
      customerPhone: normalizedPhone,
      isActive: true,
      ...tenantFilter,
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
