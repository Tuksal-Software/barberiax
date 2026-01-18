"use client"

import { useMemo, useRef, useEffect } from "react"
import { format, addDays, isSameDay, isPast, startOfDay } from "date-fns"
import { tr } from "date-fns/locale/tr"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HorizontalDatePickerProps {
  selectedDate: Date | undefined
  onDateSelect: (date: Date) => void
  className?: string
}

const DAY_NAMES_SHORT = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"]
const DAY_NAMES_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export function HorizontalDatePicker({
  selectedDate,
  onDateSelect,
  className,
}: HorizontalDatePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const tomorrow = useMemo(() => addDays(today, 1), [today])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(today, i))
  }, [today])

  const isDateDisabled = (date: Date): boolean => {
    return isPast(startOfDay(date)) && !isSameDay(date, today)
  }

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false
    return isSameDay(date, selectedDate)
  }

  const selectedDateText = useMemo(() => {
    if (!selectedDate) return ""
    
    const dayOfWeek = selectedDate.getDay()
    const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const dayName = DAY_NAMES_FULL[dayNameIndex]
    const formattedDate = format(selectedDate, "dd.MM.yyyy", { locale: tr })
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    
    let suffix = ""
    if (isSameDay(selectedDate, today)) {
      suffix = " (Bugün)"
    } else if (isSameDay(selectedDate, tomorrow)) {
      suffix = " (Yarın)"
    }
    
    return `${formattedDate} ${capitalizedDayName}${suffix}`
  }, [selectedDate, today, tomorrow])

  useEffect(() => {
    if (!selectedDate || !scrollContainerRef.current) return
    
    const selectedIndex = dates.findIndex(date => isSameDay(date, selectedDate))
    if (selectedIndex === -1) return
    
    const container = scrollContainerRef.current
    const cardWidth = 56 + 8
    const scrollPosition = selectedIndex * cardWidth
    
    if (!isScrollingRef.current) {
      container.scrollTo({
        left: scrollPosition,
        behavior: "smooth"
      })
    }
  }, [selectedDate, dates])

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0 && e.deltaX === 0) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    e.preventDefault()
    container.scrollLeft += e.deltaX || e.deltaY
  }

  const handleTouchStart = () => {
    isScrollingRef.current = true
  }

  const handleTouchEnd = () => {
    setTimeout(() => {
      isScrollingRef.current = false
    }, 100)
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      {selectedDate && (
        <div className="text-sm font-medium text-foreground">
          {selectedDateText}
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 max-w-full scrollbar-hide"
        style={{ 
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain"
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex gap-2 min-w-max">
          {dates.map((date, index) => {
            const dayOfWeek = date.getDay()
            const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            const dayName = DAY_NAMES_SHORT[dayNameIndex]
            const dayNumber = format(date, "d")
            const monthName = format(date, "MMMM", { locale: tr })
            const disabled = isDateDisabled(date)
            const selected = isDateSelected(date)

            return (
              <div 
                key={index} 
                className="flex items-end gap-2"
                style={{ scrollSnapAlign: "start" }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => !disabled && onDateSelect(date)}
                  className={cn(
                    "w-14 h-16 flex flex-col items-center justify-center gap-0.5 overflow-hidden",
                    "transition-all duration-200",
                    disabled && "opacity-50 cursor-not-allowed",
                    selected && !disabled 
                      ? "bg-blue-600 text-white border-2 border-blue-600 shadow-sm" 
                      : "bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-200",
                    isSameDay(date, today) && !selected && !disabled && "bg-blue-100 text-blue-700 border-blue-300"
                  )}
                >
                  <span className={cn(
                    "text-[11px] font-medium leading-none",
                    selected ? "text-white/80" : disabled ? "text-slate-400" : isSameDay(date, today) && !selected ? "text-blue-700" : "text-slate-600"
                  )}>
                    {dayName}
                  </span>
                  <span className={cn(
                    "text-[10px] leading-none whitespace-nowrap",
                    selected ? "text-white/60" : disabled ? "text-slate-400/80" : isSameDay(date, today) && !selected ? "text-blue-600" : "text-slate-500",
                    disabled && "opacity-50"
                  )}>
                    {monthName}
                  </span>
                  <span className={cn(
                    "text-[15px] font-semibold leading-none",
                    selected ? "text-white" : disabled ? "text-slate-400" : isSameDay(date, today) && !selected ? "text-blue-700" : "text-slate-900"
                  )}>
                    {dayNumber}
                  </span>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

