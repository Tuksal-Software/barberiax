export function parseAppointmentDateTimeTR(
  date: string,
  time: string
): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)

  // TR saatini UTC'ye çevir
  const utcMs = Date.UTC(y, m - 1, d, h - 3, min, 0, 0)

  // Server Date objesi
  return new Date(utcMs)
}

export function createAppointmentDateTimeTR(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Geçersiz tarih veya saat: ${date} ${time}`)
  }
  
  return new Date(Date.UTC(year, month - 1, day, hours - 3, minutes, 0, 0))
}

export function createAppointmentDateTime(date: string, time: string): Date {
  return createAppointmentDateTimeTR(date, time)
}

export function isAppointmentInPast(date: string, time: string): boolean {
  const appointmentDateTime = createAppointmentDateTimeTR(date, time)
  const nowUTC = new Date()
  return appointmentDateTime.getTime() <= nowUTC.getTime()
}

export function isAppointmentInFuture(date: string, time: string): boolean {
  const appointmentDateTime = createAppointmentDateTimeTR(date, time)
  const nowUTC = new Date()
  return appointmentDateTime.getTime() > nowUTC.getTime()
}

export function getHoursUntilAppointment(date: string, time: string): number {
  const appointmentDateTime = createAppointmentDateTimeTR(date, time)
  const nowUTC = new Date()
  const diffMs = appointmentDateTime.getTime() - nowUTC.getTime()
  return diffMs / (1000 * 60 * 60)
}

