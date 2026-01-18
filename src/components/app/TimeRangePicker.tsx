"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface TimeRangePickerProps {
  selectedStart?: string
  onStartSelect: (time: string) => void
  timeButtons?: Array<{ time: string; disabled: boolean }>
  className?: string
}

export const TimeRangePicker = memo(function TimeRangePicker({
  selectedStart,
  onStartSelect,
  timeButtons = [],
  className,
}: TimeRangePickerProps) {
  const handleTimeClick = (time: string) => {
    onStartSelect(time)
  }

  if (timeButtons.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Müsait saat yok
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6", className)}>
      {timeButtons.map((button) => {
        const isSelected = button.time === selectedStart

        return (
          <button
            key={button.time}
            type="button"
            onClick={() => handleTimeClick(button.time)}
            disabled={button.disabled}
            className={cn(
              "h-10 px-3 rounded-lg font-medium text-sm transition-all duration-200 border-2",
              "flex items-center justify-center",
              button.disabled &&
                "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed",
              !button.disabled &&
                !isSelected &&
                "bg-white text-slate-900 border-slate-200 hover:bg-slate-100 hover:border-blue-300",
              isSelected &&
                "bg-blue-600 text-white border-blue-600"
            )}
          >
            {button.time}
          </button>
        )
      })}
    </div>
  )
})

