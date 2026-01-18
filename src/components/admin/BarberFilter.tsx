"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Barber {
  id: string
  name: string
}

interface BarberFilterProps {
  barbers: Barber[]
  selectedBarberId: string | null
  onSelect?: (barberId: string | null) => void
  onBarberChange?: (barberId: string | null) => void
  showLabel?: boolean
}

export function BarberFilter({
  barbers,
  selectedBarberId,
  onSelect,
  onBarberChange,
  showLabel = false,
}: BarberFilterProps) {
  if (barbers.length === 0) {
    return null
  }

  const handleChange = onSelect || onBarberChange

  return (
    <Select
      value={selectedBarberId || "all"}
      onValueChange={(value) => {
        if (handleChange) {
          handleChange(value === "all" ? null : value)
        }
      }}
    >
      <SelectTrigger className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
        <SelectValue placeholder="Tüm Berberler" />
      </SelectTrigger>
      <SelectContent className="bg-white border-slate-200">
        <SelectItem 
          value="all"
          className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
        >
          Tüm Berberler
        </SelectItem>
        {barbers.map((barber) => (
          <SelectItem 
            key={barber.id} 
            value={barber.id}
            className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
          >
            {barber.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

