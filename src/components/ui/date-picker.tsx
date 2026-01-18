"use client"

import * as React from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ 
  date, 
  onSelect, 
  placeholder = "Tarih seçin",
  disabled = false,
  className 
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-slate-500",
            "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          {date ? (
            <span className="text-slate-900">
              {format(date, "d MMMM yyyy", { locale: tr })}
            </span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-white border-slate-200 shadow-lg text-slate-900 z-[200]" 
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          locale={tr}
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from?: Date
  to?: Date
  onFromSelect?: (date: Date | undefined) => void
  onToSelect?: (date: Date | undefined) => void
  fromPlaceholder?: string
  toPlaceholder?: string
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onFromSelect,
  onToSelect,
  fromPlaceholder = "Başlangıç tarihi",
  toPlaceholder = "Bitiş tarihi",
  className
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2 md:grid-cols-2", className)}>
      <DatePicker
        date={from}
        onSelect={onFromSelect}
        placeholder={fromPlaceholder}
      />
      <DatePicker
        date={to}
        onSelect={onToSelect}
        placeholder={toPlaceholder}
      />
    </div>
  )
}

