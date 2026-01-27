'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/db-helpers'
import { Prisma } from '@prisma/client'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'
import { getTenantFilter, getCurrentTenant } from '@/lib/db-helpers'

export interface GetLedgerCandidatesParams {
  barberId?: string
  selectedDate: string
}

export interface UnpaidLedgerItem {
  appointmentId: string
  barberId: string
  barberName: string
  customerName: string
  date: string
  startTime: string
  endTime: string | null
  amount?: null
}

export interface PaidLedgerItem {
  appointmentId: string
  barberId: string
  barberName: string
  customerName: string
  date: string
  startTime: string
  endTime: string | null
  ledger: {
    id: string
    amount: string
    description: string | null
    createdAt: Date
  }
}

export interface GetLedgerCandidatesResult {
  unpaid: UnpaidLedgerItem[]
  paid: PaidLedgerItem[]
}

export async function getLedgerCandidates(
  params: GetLedgerCandidatesParams
): Promise<GetLedgerCandidatesResult> {
  const session = await requireAuth()
  const { barberId } = params
  const tenantFilter = await getTenantFilter()

  let finalBarberId = barberId

  const where: Prisma.AppointmentRequestWhereInput = {
    status: 'done',
    ...tenantFilter,
  }

  if (finalBarberId) {
    where.barberId = finalBarberId
  }

  const appointments = await prisma.appointmentRequest.findMany({
    where,
    select: {
      id: true,
      status: true,
      barberId: true,
      customerName: true,
      date: true,
      requestedStartTime: true,
      requestedEndTime: true,
      barber: {
        select: {
          id: true,
          name: true,
        },
      },
      appointmentSlots: {
        take: 1,
        orderBy: {
          startTime: 'asc',
        },
        select: {
          startTime: true,
          endTime: true,
        },
      },
      ledgerEntry: {
        select: {
          id: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { requestedStartTime: 'asc' },
    ],
  })

  const unpaid: UnpaidLedgerItem[] = []
  const paid: PaidLedgerItem[] = []

  for (const appointment of appointments) {
    const startTimeStr = appointment.appointmentSlots[0]
      ? appointment.appointmentSlots[0].startTime.slice(0, 5)
      : appointment.requestedStartTime.slice(0, 5)

    const startTime = startTimeStr
    const endTime = appointment.appointmentSlots[0]
      ? appointment.appointmentSlots[0].endTime.slice(0, 5)
      : appointment.requestedEndTime
        ? appointment.requestedEndTime.slice(0, 5)
        : null

    const baseItem = {
      appointmentId: appointment.id,
      barberId: appointment.barberId,
      barberName: appointment.barber.name,
      customerName: appointment.customerName,
      date: appointment.date,
      startTime,
      endTime,
    }

    if (appointment.ledgerEntry) {
      paid.push({
        ...baseItem,
        ledger: {
          id: appointment.ledgerEntry.id,
          amount: appointment.ledgerEntry.amount.toString(),
          description: appointment.ledgerEntry.description,
          createdAt: appointment.ledgerEntry.createdAt,
        },
      })
    } else {
      unpaid.push(baseItem)
    }
  }

  return { unpaid, paid }
}

export interface UpsertLedgerInput {
  appointmentRequestId: string
  amount: number
  description?: string
}

export interface UpsertLedgerResult {
  success: boolean
  error?: string
}

export async function upsertLedgerForAppointment(
  input: UpsertLedgerInput
): Promise<UpsertLedgerResult> {
  try {
    const session = await requireAuth()
    const { appointmentRequestId, amount, description } = input

    if (amount <= 0) {
      return {
        success: false,
        error: 'Ücret 0\'dan büyük olmalıdır',
      }
    }

    const tenantFilter = await getTenantFilter()
    const appointmentRequest = await prisma.appointmentRequest.findUnique({
      where: { 
        id: appointmentRequestId,
        ...tenantFilter,
      },
      select: {
        id: true,
        barberId: true,
        status: true,
        date: true,
        customerName: true,
      },
    })

    if (!appointmentRequest) {
      return {
        success: false,
        error: 'Randevu bulunamadı',
      }
    }

    if (appointmentRequest.status !== 'done') {
      return {
        success: false,
        error: 'Sadece tamamlanmış randevular için ücret girilebilir',
      }
    }


    const existingEntry = await prisma.ledgerEntry.findUnique({
      where: {
        appointmentRequestId: appointmentRequest.id,
        ...tenantFilter,
      },
    })

    const isUpdate = !!existingEntry
    const oldValue = existingEntry ? {
      amount: existingEntry.amount.toString(),
      description: existingEntry.description,
    } : null

    const { tenantId } = await getCurrentTenant()
    const ledgerEntry = await prisma.ledgerEntry.upsert({
      where: {
        appointmentRequestId: appointmentRequest.id,
        ...tenantFilter,
      },
      create: {
        barberId: appointmentRequest.barberId,
        appointmentRequestId: appointmentRequest.id,
        date: appointmentRequest.date,
        customerName: appointmentRequest.customerName,
        amount: new Prisma.Decimal(amount),
        description: description || null,
        tenantId,
      },
      update: {
        amount: new Prisma.Decimal(amount),
        description: description || null,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: isUpdate ? AuditAction.LEDGER_UPDATED : AuditAction.LEDGER_CREATED,
        entityType: 'ledger',
        entityId: ledgerEntry.id,
        summary: isUpdate ? 'Ledger entry updated' : 'Ledger entry created',
        metadata: {
          appointmentRequestId: appointmentRequest.id,
          before: oldValue,
          after: {
            amount: amount.toString(),
            description: description || null,
          },
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export interface DeleteLedgerResult {
  success: boolean
  error?: string
}

export async function deleteLedgerEntry(
  appointmentRequestId: string
): Promise<DeleteLedgerResult> {
  try {
    const session = await requireAuth()

    const tenantFilter = await getTenantFilter()
    const ledgerEntry = await prisma.ledgerEntry.findUnique({
      where: {
        appointmentRequestId,
        ...tenantFilter,
      },
      include: {
        appointmentRequest: {
          select: {
            barberId: true,
          },
        },
      },
    })

    if (!ledgerEntry) {
      return {
        success: false,
        error: 'Kayıt bulunamadı',
      }
    }


    const beforeDelete = {
      id: ledgerEntry.id,
      amount: ledgerEntry.amount.toString(),
      description: ledgerEntry.description,
      appointmentRequestId: ledgerEntry.appointmentRequestId,
    }

    await prisma.ledgerEntry.delete({
      where: {
        appointmentRequestId,
        ...tenantFilter,
      },
    })

    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.LEDGER_DELETED,
        entityType: 'ledger',
        entityId: ledgerEntry.id,
        summary: 'Ledger entry deleted',
        metadata: {
          before: beforeDelete,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}

export interface LedgerSummary {
  totalRevenue: string
  paidCount: number
  unpaidCount: number
}

export async function getLedgerSummary(
  params: GetLedgerCandidatesParams
): Promise<LedgerSummary> {
  const session = await requireAuth()
  const { barberId } = params

  let finalBarberId = barberId

  const tenantFilter = await getTenantFilter()
  const where: Prisma.AppointmentRequestWhereInput = {
    status: 'done',
    ...tenantFilter,
  }

  if (finalBarberId) {
    where.barberId = finalBarberId
  }

  const [allAppointments, allPaidEntries] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where,
      select: {
        id: true,
        status: true,
      },
    }),
    prisma.ledgerEntry.findMany({
      where: {
        barberId: finalBarberId || undefined,
        appointmentRequest: {
          status: 'done',
        },
        ...tenantFilter,
      },
    }),
  ])

  const totalRevenue = allPaidEntries.reduce(
    (sum, entry) => sum + parseFloat(entry.amount.toString()),
    0
  )

  return {
    totalRevenue: totalRevenue.toFixed(2),
    paidCount: allPaidEntries.length,
    unpaidCount: allAppointments.length - allPaidEntries.length,
  }
}

