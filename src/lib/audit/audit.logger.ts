'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentTenant } from '@/lib/db-helpers'

export interface AuditLogInput {
  actorType: 'customer' | 'admin' | 'system'
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  metadata?: any
  tenantId?: string
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    let tenantId = input.tenantId

    if (!tenantId) {
      try {
        const tenant = await getCurrentTenant()
        tenantId = tenant.tenantId
      } catch {
        if (input.entityId && input.entityType) {
          try {
            const entity = await getEntityTenantId(input.entityType, input.entityId)
            if (entity) {
              tenantId = entity.tenantId
            }
          } catch {
          }
        }
      }
    }

    if (!tenantId) {
      return
    }

    await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action as any,
        entityType: input.entityType as any,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? null,
        tenantId,
      },
    })
  } catch {
  }
}

async function getEntityTenantId(entityType: string, entityId: string): Promise<{ tenantId: string } | null> {
  try {
    switch (entityType) {
      case 'appointment':
        const appointment = await prisma.appointmentRequest.findUnique({
          where: { id: entityId },
          select: { tenantId: true },
        })
        return appointment
      case 'barber':
        const barber = await prisma.barber.findUnique({
          where: { id: entityId },
          select: { tenantId: true },
        })
        return barber
      case 'expense':
        const expense = await prisma.expense.findUnique({
          where: { id: entityId },
          select: { tenantId: true },
        })
        return expense
      case 'ledger':
        const ledger = await prisma.ledgerEntry.findUnique({
          where: { id: entityId },
          select: { tenantId: true },
        })
        return ledger
      case 'subscription':
        const subscription = await prisma.subscription.findUnique({
          where: { id: entityId },
          select: { tenantId: true },
        })
        return subscription
      default:
        return null
    }
  } catch {
    return null
  }
}


