import { prisma } from '@/lib/prisma'
import { defaultSettings } from './defaults'
import { Prisma } from '@prisma/client'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'
import { unstable_noStore as noStore } from 'next/cache'
import { getCurrentTenant } from '@/lib/db-helpers'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  noStore()
  try {
    const { tenantId } = await getCurrentTenant()
    const setting = await prisma.appSetting.findUnique({
      where: { 
        tenantId_key: {
          tenantId,
          key,
        },
      },
    })
    if (setting) {
      return setting.value as T
    }
  } catch (error) {
    console.error(`[Settings] Error getting setting ${key}:`, error)
  }
  return fallback
}

export async function setSetting(key: string, value: unknown, actorId?: string): Promise<void> {
  const jsonValue = value === null ? Prisma.JsonNull : value
  const { tenantId } = await getCurrentTenant()
  
  const existing = await prisma.appSetting.findUnique({
    where: { 
      tenantId_key: {
        tenantId,
        key,
      },
    },
  })
  
  const isCreate = !existing
  const oldValue = existing?.value

  await prisma.appSetting.upsert({
    where: { 
      tenantId_key: {
        tenantId,
        key,
      },
    },
    create: {
      tenantId,
      key,
      value: jsonValue as Prisma.InputJsonValue,
    },
    update: {
      value: jsonValue as Prisma.InputJsonValue,
    },
  })

  if (isCreate) {
    try {
      await auditLog({
        actorType: actorId ? 'admin' : 'system',
        actorId: actorId || null,
        action: AuditAction.SETTINGS_CREATED,
        entityType: 'settings',
        entityId: key,
        summary: `Setting created: ${key}`,
        metadata: {
          key,
          value: jsonValue,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }
  }
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const { tenantId } = await getCurrentTenant()
  const settings = await prisma.appSetting.findMany({
    where: { tenantId },
  })
  const result: Record<string, unknown> = {}
  for (const setting of settings) {
    result[setting.key] = setting.value
  }
  return result
}

export async function ensureDefaultSettings(): Promise<void> {
  const { tenantId } = await getCurrentTenant()
  const existingSettings = await prisma.appSetting.findMany({
    where: { tenantId },
    select: { key: true },
  })
  const existingKeys = new Set(existingSettings.map((s) => s.key))

  const settingsToCreate = []

  if (!existingKeys.has('adminPhone')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'adminPhone',
        },
      },
      create: {
        tenantId,
        key: 'adminPhone',
        value: defaultSettings.adminPhone === null ? Prisma.JsonNull : defaultSettings.adminPhone,
      },
      update: {},
    })
    settingsToCreate.push('adminPhone')
  }

  if (!existingKeys.has('shopName')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'shopName',
        },
      },
      create: {
        tenantId,
        key: 'shopName',
        value: defaultSettings.shopName,
      },
      update: {},
    })
    settingsToCreate.push('shopName')
  }

  if (!existingKeys.has('sms')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'sms',
        },
      },
      create: {
        tenantId,
        key: 'sms',
        value: defaultSettings.sms,
      },
      update: {},
    })
    settingsToCreate.push('sms')
  }

  if (!existingKeys.has('customerCancel')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'customerCancel',
        },
      },
      create: {
        tenantId,
        key: 'customerCancel',
        value: defaultSettings.customerCancel,
      },
      update: {},
    })
    settingsToCreate.push('customerCancel')
  }

  if (!existingKeys.has('timezone')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'timezone',
        },
      },
      create: {
        tenantId,
        key: 'timezone',
        value: defaultSettings.timezone,
      },
      update: {},
    })
    settingsToCreate.push('timezone')
  }

  if (!existingKeys.has('enableServiceSelection')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'enableServiceSelection',
        },
      },
      create: {
        tenantId,
        key: 'enableServiceSelection',
        value: defaultSettings.enableServiceSelection,
      },
      update: {},
    })
    settingsToCreate.push('enableServiceSelection')
  }

  if (!existingKeys.has('appointmentCancelReminderHours')) {
    await prisma.appSetting.upsert({
      where: { 
        tenantId_key: {
          tenantId,
          key: 'appointmentCancelReminderHours',
        },
      },
      create: {
        tenantId,
        key: 'appointmentCancelReminderHours',
        value: defaultSettings.appointmentCancelReminderHours === null ? Prisma.JsonNull : defaultSettings.appointmentCancelReminderHours,
      },
      update: {},
    })
    settingsToCreate.push('appointmentCancelReminderHours')
  }

  for (const key of settingsToCreate) {
    try {
      await auditLog({
        actorType: 'system',
        actorId: null,
        action: AuditAction.SETTINGS_CREATED,
        entityType: 'settings',
        entityId: key,
        summary: `Default setting created: ${key}`,
        metadata: {
          key,
          value: key === 'adminPhone' ? defaultSettings.adminPhone : 
                 key === 'shopName' ? defaultSettings.shopName :
                 key === 'sms' ? defaultSettings.sms :
                 key === 'customerCancel' ? defaultSettings.customerCancel :
                 key === 'enableServiceSelection' ? defaultSettings.enableServiceSelection :
                 key === 'appointmentCancelReminderHours' ? defaultSettings.appointmentCancelReminderHours :
                 defaultSettings.timezone,
        },
      })
    } catch (error) {
      console.error('Audit log error:', error)
    }
  }
}

