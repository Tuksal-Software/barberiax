'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/actions/auth.actions'

export interface SmsLogItem {
  id: string
  to: string
  message: string
  event: string
  eventLabel: string | null
  provider: string
  status: string
  error: string | null
  createdAt: Date
  isAdmin: boolean
}

export interface SmsLogsResponse {
  logs: SmsLogItem[]
  customerNameMap: Record<string, string>
}

export async function getSmsLogs(limit: number = 50): Promise<SmsLogsResponse> {
  await requireAdmin()

  const logs = await prisma.smsLog.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      to: true,
      message: true,
      event: true,
      eventLabel: true,
      provider: true,
      status: true,
      error: true,
      createdAt: true,
    },
  })

  const { getAdminPhoneSetting } = await import('@/lib/settings/settings-helpers')
  const adminPhone = await getAdminPhoneSetting()

  const logsWithAdmin = logs.map((log) => ({
    ...log,
    isAdmin: adminPhone ? log.to === adminPhone : false,
  }))

  const reminderEventRegex = /^(APPOINTMENT_REMINDER_HOUR_[12]|APPOINTMENT_REMINDER_CUSTOM_\d+H)_(.+)$/
  const appointmentRequestIds: string[] = []

  logs.forEach((log) => {
    const match = log.event.match(reminderEventRegex)
    if (match) {
      const appointmentRequestId = match[2]
      if (!appointmentRequestIds.includes(appointmentRequestId)) {
        appointmentRequestIds.push(appointmentRequestId)
      }
    }
  })

  const customerNameMap: Record<string, string> = {}

  if (appointmentRequestIds.length > 0) {
    const appointments = await prisma.appointmentRequest.findMany({
      where: {
        id: {
          in: appointmentRequestIds,
        },
      },
      select: {
        id: true,
        customerName: true,
      },
    })

    appointments.forEach((appointment) => {
      customerNameMap[appointment.id] = appointment.customerName
    })
  }

  return {
    logs: logsWithAdmin,
    customerNameMap,
  }
}

export async function getLastReminderJobRun(): Promise<Date | null> {
  await requireAdmin()

  const latestJob = await prisma.systemJobLog.findFirst({
    where: {
      jobName: 'appointment_reminders',
    },
    orderBy: {
      ranAt: 'desc',
    },
    select: {
      ranAt: true,
    },
  })

  return latestJob?.ranAt || null
}

