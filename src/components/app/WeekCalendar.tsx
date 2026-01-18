"use client"

import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/lib/constants"

const statusStyles = {
  pending: "bg-amber-950 text-amber-300 border-amber-800",
  approved: "bg-blue-950 text-blue-300 border-blue-800",
  rejected: "bg-red-950 text-red-300 border-red-800",
  cancelled: "bg-muted text-muted-foreground border-border",
  done: "bg-green-950 text-green-300 border-green-800",
}

interface WeekCalendarProps {
  weekStart: Date
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  className?: string
}

export function WeekCalendar({
  weekStart,
  appointments,
  onAppointmentClick,
  className,
}: WeekCalendarProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i)
  )

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => isSameDay(apt.date, day))
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="border-border grid grid-cols-7 gap-3 border-b pb-3 mb-4">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="text-center text-sm font-medium"
          >
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {format(day, "EEE", { locale: tr })}
            </div>
            <div className="text-foreground mt-1.5 text-lg font-semibold">
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayAppointments = getAppointmentsForDay(day)
          return (
            <div
              key={day.toISOString()}
              className="border-border min-h-[200px] space-y-1.5 rounded-lg border-2 bg-card p-2.5"
            >
              {dayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => onAppointmentClick?.(apt)}
                  className={cn(
                    "cursor-pointer rounded border p-1.5 text-xs transition-all hover:shadow-sm active:scale-[0.98]",
                    statusStyles[apt.status] || statusStyles.pending
                  )}
                >
                  <div className="font-semibold truncate">{apt.customerName}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {apt.startTime} - {apt.endTime}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

