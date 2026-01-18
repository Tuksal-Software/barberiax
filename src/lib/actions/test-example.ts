'use server'

import { createAppointmentRequest, approveAppointmentRequest } from './appointment.actions'
import { getAvailableTimeSlotsV2 } from './availability.actions'

export async function exampleUsage() {
  const barberId = 'example-barber-id'
  const date = '2024-12-20'

  console.log('1. Mevcut müsaitlik kontrolü...')
  const availableBefore = await getAvailableTimeSlotsV2({ barberId, date })
  console.log('Müsait slotlar:', availableBefore)

  console.log('\n2. Randevu talebi oluşturuluyor...')
  const requestResult = await createAppointmentRequest({
    barberId,
    customerName: 'Test Müşteri',
    customerPhone: '+90 555 123 4567',
    customerEmail: 'test@example.com',
    date,
    requestedStartTime: '10:00',
    requestedEndTime: '11:00',
  })

  if (typeof requestResult === 'object' && 'error' in requestResult) {
    console.error('Randevu talebi oluşturma hatası:', requestResult.error)
    return
  }

  const requestId = requestResult
  console.log('Randevu talebi ID:', requestId)

  console.log('\n3. Talepten sonra müsaitlik kontrolü (pending talepler bloklamaz)...')
  const availableAfterRequest = await getAvailableTimeSlotsV2({ barberId, date })
  console.log('Müsait slotlar:', availableAfterRequest)

  console.log('\n4. Randevu talebi 30 dakika için onaylanıyor...')
  const approvalResult = await approveAppointmentRequest({
    appointmentRequestId: requestId,
    approvedDurationMinutes: 30,
  })

  if (typeof approvalResult === 'object' && approvalResult !== null && 'error' in approvalResult) {
    console.error('Onaylama hatası:', approvalResult.error)
    return approvalResult.error
  }

  console.log('Randevu onaylandı')

  console.log('\n5. Onaydan sonra müsaitlik kontrolü...')
  const availableAfterApproval = await getAvailableTimeSlotsV2({ barberId, date })
  console.log('Müsait slotlar:', availableAfterApproval)
  console.log('10:00-10:30 aralığı artık dolu olmalı')
}

