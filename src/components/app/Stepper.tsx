"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: { label: string }[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
    return (
        <div className={cn("flex justify-center px-4 py-2 sm:py-6", className)}>
            <div className="flex items-center gap-4">
                {steps.map((step, index) => {
                    const stepNumber = index + 1
                    const isCompleted = stepNumber < currentStep
                    const isCurrent = stepNumber === currentStep

                    return (
                        <div key={index} className="flex items-center">
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                                        (isCompleted || isCurrent) &&
                                        "border-primary bg-primary text-primary-foreground",
                                        !isCompleted &&
                                        !isCurrent &&
                                        "border-muted bg-background text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                                </div>
                                <span
                                    className={cn(
                                        "hidden text-xs font-medium sm:block",
                                        isCurrent ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                  {step.label}
                </span>
                            </div>

                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "mx-2 h-0.5 w-8 transition-colors",
                                        isCompleted ? "bg-primary" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}






