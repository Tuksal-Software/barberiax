import type { SmsProvider } from './sms.provider'
import { publicEnv } from '@/lib/config/env.public'
import { getSmsSenderSetting } from '@/lib/settings/settings-helpers'

function cleanPhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  let cleaned = phone.trim()

  if (cleaned.startsWith('+90')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('90')) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  cleaned = cleaned.replace(/\D/g, '')

  if (cleaned.length !== 10) {
    return null
  }

  return cleaned
}

export class VatanSmsProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<void> {
    try {
      const cleanedPhone = cleanPhoneNumber(to)
      if (!cleanedPhone) {
        console.error('[VatanSMS] Invalid phone number:', to)
        return
      }

      if (!publicEnv.SMS_API_ID || !publicEnv.SMS_API_KEY) {
        console.error('[VatanSMS] SMS_API_ID or SMS_API_KEY is missing')
        return
      }

      const sender = await getSmsSenderSetting()

      const payload = {
        api_id: publicEnv.SMS_API_ID,
        api_key: publicEnv.SMS_API_KEY,
        sender: sender,
        message_type: 'turkce',
        message: message,
        phones: [cleanedPhone],
      }

      const response = await fetch('https://api.vatansms.net/api/v1/1toN', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[VatanSMS] API error', response.status, errorText)
        return
      }

      const result = await response.json()
      if (result.status !== 'success' && result.status !== 'ok') {
        console.error('[VatanSMS] API returned error:', result)
        return
      }
    } catch (error) {
      console.error('[VatanSMS] Error sending SMS:', error)
    }
  }
}

