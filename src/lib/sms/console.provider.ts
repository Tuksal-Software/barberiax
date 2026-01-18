import type { SmsProvider } from './sms.provider'

export class ConsoleSmsProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<void> {
    console.log('[SMS]', {
      to,
      message,
      timestamp: new Date().toISOString(),
    })
  }
}






