import { prisma } from '@/lib/prisma'
import { parseAppointmentDateTimeTR } from '@/lib/time/appointmentDateTime'
import { getNowUTC } from '@/lib/time'
import { sendSms } from '@/lib/sms/sms.service'
import { getAdminPhoneSetting, getAppointmentCancelReminderHoursSetting } from '@/lib/settings/settings-helpers'
import { format } from 'date-fns'

const REMINDER_TYPES = {
  HOUR_2: 'APPOINTMENT_REMINDER_HOUR_2',
  HOUR_1: 'APPOINTMENT_REMINDER_HOUR_1',
  CUSTOM_CANCEL: 'APPOINTMENT_REMINDER_CUSTOM',
} as const

type ReminderType = typeof REMINDER_TYPES[keyof typeof REMINDER_TYPES]

function formatDateFromDB(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  return `${day}.${month}.${year}`
}

function getSiteUrl(): string {
  const siteUrl = process.env.SITE_URL || 'https://example.com'
  return siteUrl.replace(/\/$/, '')
}

function createReminderMessage(
  reminderType: ReminderType,
  customerName: string,
  date: string,
  startTime: string,
  customerPhone?: string,
  hoursUntil?: number
): string {
  if (reminderType === REMINDER_TYPES.HOUR_2) {
    return `Merhaba ${customerName},
${date} tarihinde ${startTime} saatindeki randevunuzu hatırlatmak isteriz.
Randevunuza 2 saat kaldı.`
  } else if (reminderType === REMINDER_TYPES.HOUR_1) {
    return `Merhaba ${customerName},
${date} tarihinde ${startTime} saatindeki randevunuza 1 saat kaldı.
Hizmetin aksamaması için lütfen randevudan 10 dk önce geliniz.`
  } else if (reminderType === REMINDER_TYPES.CUSTOM_CANCEL) {
    const siteUrl = getSiteUrl()
    const encodedPhone = customerPhone ? encodeURIComponent(customerPhone) : ''
    const cancelLink = `${siteUrl}/?cancel=1&phone=${encodedPhone}`
    return `Merhaba ${customerName},

${date} tarihinde ${startTime} saatindeki randevunuza ${hoursUntil} saat kaldı.

Randevunuzu iptal etmek isterseniz aşağıdaki bağlantıyı kullanabilirsiniz:
${cancelLink}`
  }
  return ''
}

function getReminderEvent(
  appointmentRequestId: string,
  reminderType: ReminderType,
  hoursUntil?: number
): string {
  if (reminderType === REMINDER_TYPES.CUSTOM_CANCEL) {
    return `APPOINTMENT_REMINDER_CUSTOM_${hoursUntil}H_${appointmentRequestId}`
  }
  return `${reminderType}_${appointmentRequestId}`
}

function getReadableReminderEvent(
  reminderType: ReminderType,
  customerName: string,
  hoursUntil?: number
): string {
  if (reminderType === REMINDER_TYPES.HOUR_1) {
    return `Randevu Hatırlatma (1 Saat Kala) – ${customerName}`
  }

  if (reminderType === REMINDER_TYPES.HOUR_2) {
    return `Randevu Hatırlatma (2 Saat Kala) – ${customerName}`
  }

  return `Randevu Hatırlatma (${hoursUntil} Saat Kala) – ${customerName}`
}

async function checkIfReminderSent(
  appointmentRequestId: string,
  reminderType: ReminderType,
  hoursUntil?: number
): Promise<boolean> {
  const event = getReminderEvent(appointmentRequestId, reminderType, hoursUntil)
  const existingLog = await prisma.smsLog.findFirst({
    where: {
      event,
    },
  })
  return !!existingLog
}

async function sendReminderSms(
  appointmentRequestId: string,
  customerPhone: string,
  customerName: string,
  date: string,
  startTime: string,
  reminderType: ReminderType,
  hoursUntil?: number
): Promise<void> {
  const message = createReminderMessage(reminderType, customerName, date, startTime, customerPhone, hoursUntil)
  
  try {
    await sendSms(customerPhone, message)
    
    const event = getReminderEvent(appointmentRequestId, reminderType, hoursUntil)
    const eventLabel = getReadableReminderEvent(reminderType, customerName, hoursUntil)
    await prisma.smsLog.create({
      data: {
        to: customerPhone,
        message,
        event,
        eventLabel,
        provider: 'vatansms',
        status: 'success',
        error: null,
      },
    })
  } catch (error) {
    const event = getReminderEvent(appointmentRequestId, reminderType, hoursUntil)
    const eventLabel = getReadableReminderEvent(reminderType, customerName, hoursUntil)
    await prisma.smsLog.create({
      data: {
        to: customerPhone,
        message,
        event,
        eventLabel,
        provider: 'vatansms',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

function isWithinReminderWindow(
  appointmentDateTime: Date,
  now: Date,
  hoursBefore: number,
  toleranceMinutes = 5
): boolean {
  const targetTime =
    appointmentDateTime.getTime() - hoursBefore * 60 * 60 * 1000

  const diffMs = Math.abs(now.getTime() - targetTime)
  const diffMinutes = diffMs / (1000 * 60)

  return diffMinutes <= toleranceMinutes
}

async function main() {
  console.log('[Appointment Reminders] Script başlatılıyor...')
  
  const now = getNowUTC()
  console.log(`[Appointment Reminders] Şu anki zaman (TR): ${format(now, 'dd.MM.yyyy HH:mm:ss')}`)
  
  const adminPhone = await getAdminPhoneSetting()
  console.log(`[Appointment Reminders] Admin telefon: ${adminPhone || 'ayarlanmamış'}`)
  
  const approvedAppointments = await prisma.appointmentRequest.findMany({
    where: {
      status: 'approved',
    },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      date: true,
      requestedStartTime: true,
    },
  })
  
  console.log(`[Appointment Reminders] Toplam ${approvedAppointments.length} onaylanmış randevu bulundu`)
  
  const customReminderHours = await getAppointmentCancelReminderHoursSetting()
  console.log(`[Appointment Reminders] Custom reminder saatleri: ${customReminderHours || 'kapalı'}`)
  
  let reminders2hSent = 0
  let reminders1hSent = 0
  let remindersCustomSent = 0
  let reminders2hSkipped = 0
  let reminders1hSkipped = 0
  let remindersCustomSkipped = 0
  let errors = 0
  
  for (const appointment of approvedAppointments) {
    if (!appointment.requestedStartTime) {
      continue
    }
    
    if (adminPhone && appointment.customerPhone === adminPhone) {
      console.log(`[Appointment Reminders] Admin randevusu atlandı: ${appointment.id}`)
      continue
    }
    
    try {
      const appointmentDateTime = parseAppointmentDateTimeTR(appointment.date, appointment.requestedStartTime)
      
      if (appointmentDateTime.getTime() <= now.getTime()) {
        continue
      }
      
      const formattedDate = formatDateFromDB(appointment.date)
      const dbTime = appointment.requestedStartTime
      
      if (isWithinReminderWindow(appointmentDateTime, now, 2, 5)) {
        const alreadySent = await checkIfReminderSent(appointment.id, REMINDER_TYPES.HOUR_2)
        
        if (alreadySent) {
          reminders2hSkipped++
          console.log(`[Appointment Reminders] 2 saat hatırlatması zaten gönderilmiş: ${appointment.id}`)
        } else {
          await sendReminderSms(
            appointment.id,
            appointment.customerPhone,
            appointment.customerName,
            formattedDate,
            dbTime,
            REMINDER_TYPES.HOUR_2
          )
          reminders2hSent++
          console.log(`[Appointment Reminders] 2 saat hatırlatması gönderildi: ${appointment.id} - ${appointment.customerPhone}`)
        }
      }
      
      if (isWithinReminderWindow(appointmentDateTime, now, 1, 5)) {
        const alreadySent = await checkIfReminderSent(appointment.id, REMINDER_TYPES.HOUR_1)
        
        if (alreadySent) {
          reminders1hSkipped++
          console.log(`[Appointment Reminders] 1 saat hatırlatması zaten gönderilmiş: ${appointment.id}`)
        } else {
          await sendReminderSms(
            appointment.id,
            appointment.customerPhone,
            appointment.customerName,
            formattedDate,
            dbTime,
            REMINDER_TYPES.HOUR_1
          )
          reminders1hSent++
          console.log(`[Appointment Reminders] 1 saat hatırlatması gönderildi: ${appointment.id} - ${appointment.customerPhone}`)
        }
      }
      
      if (customReminderHours !== null && customReminderHours >= 3 && customReminderHours <= 24) {
        const targetTime = new Date(
          appointmentDateTime.getTime() - customReminderHours * 60 * 60 * 1000
        )
        const diffMs = Math.abs(now.getTime() - targetTime.getTime())
        const diffMinutes = diffMs / (1000 * 60)
        
        console.log('[DEBUG REMINDER]', {
          appointmentId: appointment.id,
          now: now.toISOString(),
          appointmentDateTime: appointmentDateTime.toISOString(),
          targetTime: targetTime.toISOString(),
          diffMinutes,
        })
        
        if (isWithinReminderWindow(appointmentDateTime, now, customReminderHours, 5)) {
          const alreadySent = await checkIfReminderSent(appointment.id, REMINDER_TYPES.CUSTOM_CANCEL, customReminderHours)
          
          if (alreadySent) {
            remindersCustomSkipped++
            console.log(`[Appointment Reminders] Custom hatırlatma zaten gönderilmiş: ${appointment.id}`)
          } else {
            await sendReminderSms(
              appointment.id,
              appointment.customerPhone,
              appointment.customerName,
              formattedDate,
              dbTime,
              REMINDER_TYPES.CUSTOM_CANCEL,
              customReminderHours
            )
            remindersCustomSent++
            console.log(`[Appointment Reminders] Custom hatırlatma gönderildi: ${appointment.id} - ${appointment.customerPhone} (${customReminderHours} saat kala)`)
          }
        }
      }
    } catch (error) {
      errors++
      console.error(`[Appointment Reminders] Hata (${appointment.id}):`, error)
    }
  }
  
  console.log('\n[Appointment Reminders] Özet:')
  console.log(`  - 2 saat hatırlatması gönderildi: ${reminders2hSent}`)
  console.log(`  - 2 saat hatırlatması atlandı (duplicate): ${reminders2hSkipped}`)
  console.log(`  - 1 saat hatırlatması gönderildi: ${reminders1hSent}`)
  console.log(`  - 1 saat hatırlatması atlandı (duplicate): ${reminders1hSkipped}`)
  if (customReminderHours !== null) {
    console.log(`  - Custom hatırlatma gönderildi: ${remindersCustomSent}`)
    console.log(`  - Custom hatırlatma atlandı (duplicate): ${remindersCustomSkipped}`)
  }
  console.log(`  - Hata sayısı: ${errors}`)
  console.log(`  - Toplam SMS gönderildi: ${reminders2hSent + reminders1hSent + remindersCustomSent}`)
  
  try {
    await prisma.systemJobLog.create({
      data: {
        jobName: 'appointment_reminders',
        ranAt: now,
        meta: {
          totalApproved: approvedAppointments.length,
          reminders2hSent,
          reminders1hSent,
          remindersCustomSent,
          reminders2hSkipped,
          reminders1hSkipped,
          remindersCustomSkipped,
          errors,
          customReminderHours,
        },
      },
    })
    console.log('[Appointment Reminders] Job log kaydedildi')
  } catch (logError) {
    console.error('[Appointment Reminders] Job log kaydedilemedi:', logError)
  }
  
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('[Appointment Reminders] Kritik hata:', error)
  process.exit(1)
})

