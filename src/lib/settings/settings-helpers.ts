'use server'

import { getSetting } from './settings.service'
import { defaultSettings } from './defaults'
import { publicEnv } from '@/lib/config/env.public'

export async function getAdminPhoneSetting(): Promise<string | null> {
  const dbPhone = await getSetting<string | null>('adminPhone', defaultSettings.adminPhone)
  return dbPhone ?? publicEnv.ADMIN_PHONE ?? defaultSettings.adminPhone
}

export async function getSmsSenderSetting(): Promise<string> {
  const smsSettings = await getSetting<{ enabled: boolean; sender: string }>(
    'sms',
    defaultSettings.sms
  )
  return smsSettings.sender || defaultSettings.sms.sender
}

export async function getEnableServiceSelectionSetting(): Promise<boolean> {
  return await getSetting<boolean>('enableServiceSelection', defaultSettings.enableServiceSelection)
}

export async function getAppointmentCancelReminderHoursSetting(): Promise<number | null> {
  return await getSetting<number | null>('appointmentCancelReminderHours', defaultSettings.appointmentCancelReminderHours)
}

