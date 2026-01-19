import { prisma } from '@/lib/prisma'
import { createAppointmentDateTimeTR } from '@/lib/time/appointmentDateTime'
import { getNowUTC } from '@/lib/time'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'

async function main() {
  console.log('[Mark Past Appointments Done] Script başlatılıyor...')
  
  const now = getNowUTC()
  console.log(`[Mark Past Appointments Done] Şu anki zaman (TR): ${now.toISOString()}`)
  
  const approvedAppointments = await prisma.appointmentRequest.findMany({
    where: {
      status: 'approved',
    },
    select: {
      id: true,
      date: true,
      requestedStartTime: true,
      appointmentSlots: {
        take: 1,
        orderBy: {
          startTime: 'asc',
        },
        select: {
          startTime: true,
        },
      },
    },
  })
  
  console.log(`[Mark Past Appointments Done] Toplam ${approvedAppointments.length} onaylanmış randevu bulundu`)
  
  let markedCount = 0
  let skippedCount = 0
  let errors = 0
  
  for (const appointment of approvedAppointments) {
    try {
      const startTimeStr = appointment.appointmentSlots[0]
        ? appointment.appointmentSlots[0].startTime
        : appointment.requestedStartTime
      
      const appointmentDateTime = createAppointmentDateTimeTR(appointment.date, startTimeStr)
      
      if (appointmentDateTime.getTime() >= now.getTime()) {
        skippedCount++
        continue
      }
      
      await prisma.appointmentRequest.update({
        where: { id: appointment.id },
        data: { status: 'done' },
      })
      
      try {
        await auditLog({
          actorType: 'system',
          action: AuditAction.APPOINTMENT_MARKED_DONE,
          entityType: 'appointment',
          entityId: appointment.id,
          summary: 'Saati geçen randevu otomatik olarak tamamlandı',
          metadata: {
            appointmentId: appointment.id,
            previousStatus: 'approved',
            runAt: now.toISOString(),
          },
        })
      } catch (auditError) {
        console.error(`[Mark Past Appointments Done] Audit log hatası (${appointment.id}):`, auditError)
      }
      
      markedCount++
      console.log(`[Mark Past Appointments Done] Randevu DONE olarak işaretlendi: ${appointment.id}`)
    } catch (error) {
      errors++
      console.error(`[Mark Past Appointments Done] Hata (${appointment.id}):`, error)
    }
  }
  
  console.log('\n[Mark Past Appointments Done] Özet:')
  console.log(`  - DONE olarak işaretlenen: ${markedCount}`)
  console.log(`  - Atlandı (gelecek randevu): ${skippedCount}`)
  console.log(`  - Hata sayısı: ${errors}`)
  
  try {
    await prisma.systemJobLog.create({
      data: {
        jobName: 'mark_past_appointments_done',
        ranAt: now,
        meta: {
          totalApproved: approvedAppointments.length,
          markedCount,
          skippedCount,
          errors,
        },
      },
    })
    console.log('[Mark Past Appointments Done] Job log kaydedildi')
  } catch (logError) {
    console.error('[Mark Past Appointments Done] Job log kaydedilemedi:', logError)
  }
  
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('[Mark Past Appointments Done] Kritik hata:', error)
  process.exit(1)
})

