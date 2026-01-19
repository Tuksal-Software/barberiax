"use client"

import { Smartphone, Cloud, MessageSquare, Users } from "lucide-react"
import React from "react"
import {
  AnimatedBeam,
  BeamContainer,
  BeamNode,
} from "@/components/ui/animated-beam"

export default function HowItWorks() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const customerRef = React.useRef<HTMLDivElement>(null)
  const platformRef = React.useRef<HTMLDivElement>(null)
  const smsRef = React.useRef<HTMLDivElement>(null)
  const barberRef = React.useRef<HTMLDivElement>(null)

  return (
    <section className="py-10 md:py-14 bg-slate-50">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Nasıl Çalışır?
          </h2>
          <p className="text-lg text-slate-600">
            Otomatik randevu akışı
          </p>
        </div>

        <BeamContainer
          ref={containerRef}
          className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-xl border border-slate-200 bg-white p-12 shadow-sm"
        >
          {/* Müşteri */}
          <div className="flex flex-col items-center gap-2">
            <BeamNode
              ref={customerRef}
              className="h-14 w-14 border-2 border-blue-500/20 bg-blue-500/10"
            >
              <Smartphone className="h-7 w-7 text-blue-600" />
            </BeamNode>
            <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Müşteri
            </span>
          </div>

          {/* Platform */}
          <div className="flex flex-col items-center gap-2">
            <BeamNode
              ref={platformRef}
              className="h-16 w-16 border-2 border-purple-500/20 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            >
              <Cloud className="h-8 w-8 text-purple-600" />
            </BeamNode>
            <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Barberiax
            </span>
          </div>

          {/* SMS & Berber */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-2">
              <BeamNode
                ref={smsRef}
                className="h-12 w-12 border-2 border-emerald-500/20 bg-emerald-500/10"
              >
                <MessageSquare className="h-6 w-6 text-emerald-600" />
              </BeamNode>
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                SMS
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <BeamNode
                ref={barberRef}
                className="h-12 w-12 border-2 border-amber-500/20 bg-amber-500/10"
              >
                <Users className="h-6 w-6 text-amber-600" />
              </BeamNode>
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Berber
              </span>
            </div>
          </div>

          {/* Müşteri → Platform */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={customerRef}
            toRef={platformRef}
            duration={3}
            curvature={0.2}
            gradientStartColor="#3b82f6"
            gradientStopColor="#8b5cf6"
          />

          {/* Platform → SMS */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={platformRef}
            toRef={smsRef}
            duration={3}
            delay={0.5}
            curvature={-0.3}
            gradientStartColor="#8b5cf6"
            gradientStopColor="#10b981"
          />

          {/* SMS → Platform (geri) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={smsRef}
            toRef={platformRef}
            duration={3}
            delay={1.5}
            curvature={-0.3}
            reverse
            gradientStartColor="#10b981"
            gradientStopColor="#8b5cf6"
          />

          {/* Platform → Berber */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={platformRef}
            toRef={barberRef}
            duration={3}
            delay={2.5}
            curvature={0.3}
            gradientStartColor="#8b5cf6"
            gradientStopColor="#f59e0b"
          />
        </BeamContainer>
      </div>
    </section>
  )
}