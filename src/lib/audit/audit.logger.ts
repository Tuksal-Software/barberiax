'use server'

import { prisma } from '@/lib/prisma'

export interface AuditLogInput {
  actorType: 'customer' | 'admin' | 'system'
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  metadata?: any
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action as any,
        entityType: input.entityType as any,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? null,
      },
    })
  } catch {
  }
}


