'use server'

import { auditLog } from '@/lib/audit/audit.logger'

export interface LogFormPhoneEnteredInput {
  phone: string
  barberId: string
  date: string
}

export interface LogFormNameEnteredInput {
  name: string
  phone: string
  barberId: string
  date: string
}

export interface LogFormAbandonedInput {
  phone?: string
  name?: string
  barberId: string
  date: string
  step: string
}

export async function logAppointmentFormPhoneEntered(
  input: LogFormPhoneEnteredInput
): Promise<void> {
}

export async function logAppointmentFormNameEntered(
  input: LogFormNameEnteredInput
): Promise<void> {
}

export async function logAppointmentFormAbandoned(
  input: LogFormAbandonedInput
): Promise<void> {
}


