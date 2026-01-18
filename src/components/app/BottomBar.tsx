"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BottomBarProps {
  primaryLabel: string
  primaryAction: () => void
  primaryDisabled?: boolean
  secondaryLabel?: string
  secondaryAction?: () => void
  className?: string
}

export function BottomBar({
  primaryLabel,
  primaryAction,
  primaryDisabled = false,
  secondaryLabel,
  secondaryAction,
  className,
}: BottomBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4 shadow-lg sm:static sm:border-t-0 sm:shadow-none",
        className
      )}
    >
      <div className="mx-auto flex max-w-2xl gap-3">
        {secondaryLabel && secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction}
            className="flex-1"
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          onClick={primaryAction}
          disabled={primaryDisabled}
          className={cn(secondaryLabel ? "flex-1" : "w-full")}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  )
}






