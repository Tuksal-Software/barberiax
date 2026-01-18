"use client"

import { memo } from "react"
import { format } from "date-fns"
import { Clock, User, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/lib/constants"

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
  className?: string
}

const statusColors = {
  pending: "bg-amber-950 text-amber-300 border-amber-800",
  approved: "bg-blue-950 text-blue-300 border-blue-800",
  rejected: "bg-red-950 text-red-300 border-red-800",
  cancelled: "bg-muted text-muted-foreground border-border",
  done: "bg-green-950 text-green-300 border-green-800",
}

const statusLabels = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal",
  done: "Tamamlandı",
}

export const AppointmentCard = memo(function AppointmentCard({
  appointment,
  onClick,
  className,
}: AppointmentCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md bg-card border-border",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium">{appointment.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{appointment.customerPhone}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="flex-1">
                {format(appointment.date, "d MMMM yyyy")} - {appointment.startTime} - {appointment.endTime}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Berber: {appointment.barberName}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("font-semibold border-2 shrink-0 self-start sm:self-auto", statusColors[appointment.status])}
          >
            {statusLabels[appointment.status]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
})

