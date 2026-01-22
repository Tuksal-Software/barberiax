"use client"

import Image from "next/image"
import { User, MessageSquare, Scissors, CheckCircle, Calendar, Bell, BarChart } from "lucide-react"
import React from "react"
import {
  AnimatedBeam,
  BeamContainer,
  BeamNode,
} from "@/components/ui/animated-beam"

const steps = [
  {
    icon: Calendar,
    title: "Müşteri Randevu Alır",
    description: "Müşteriniz online randevu sisteminden kolayca randevu oluşturur"
  },
  {
    icon: Bell,
    title: "Otomatik SMS Gider",
    description: "Sistem otomatik olarak hem müşteriye hem berbere SMS hatırlatması gönderir"
  },
  {
    icon: CheckCircle,
    title: "İşletme Hazırlanır",
    description: "İşletme randevuyu admin panelden görür ve hazırlık yapar"
  },
  {
    icon: BarChart,
    title: "Kayıt Tutulur",
    description: "Tüm randevular otomatik kayıt altına alınır ve raporlanır"
  }
]

export default function HowItWorks() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const customerRef = React.useRef<HTMLDivElement>(null)
  const platformRef = React.useRef<HTMLDivElement>(null)
  const smsRef = React.useRef<HTMLDivElement>(null)
  const barberRef = React.useRef<HTMLDivElement>(null)
  const customerReturnRef = React.useRef<HTMLDivElement>(null)

  return (
    <section className="py-10 md:py-14 bg-[#f7f7f7]">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-4">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Nasıl Çalışır?
          </h2>
          <p className="text-lg text-slate-600">
            Otomatik randevu akışı
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <BeamContainer
              ref={containerRef}
              className="flex w-full items-center justify-between rounded-xl bg-white/50 backdrop-blur-sm p-10 shadow-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <BeamNode
                  ref={customerRef}
                  className="h-16 w-16 border-2 border-blue-500/20 bg-blue-500/10"
                >
                  <User className="h-8 w-8 text-blue-600" />
                </BeamNode>
                <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  Müşteri
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <BeamNode
                  ref={platformRef}
                  className="h-20 w-20 border-2 border-purple-500/20 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                >
                  <Image
                    src="/logo.png"
                    alt="Barberiax"
                    width={32}
                    height={32}
                    className="w-10 h-10"
                  />
                </BeamNode>
                <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  Barberiax
                </span>
              </div>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col items-center gap-2">
                  <BeamNode
                    ref={smsRef}
                    className="h-14 w-14 border-2 border-emerald-500/20 bg-emerald-500/10"
                  >
                    <MessageSquare className="h-7 w-7 text-emerald-600" />
                  </BeamNode>
                  <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                    SMS
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <BeamNode
                    ref={barberRef}
                    className="h-14 w-14 border-2 border-amber-500/20 bg-amber-500/10"
                  >
                    <Scissors className="h-7 w-7 text-amber-600" />
                  </BeamNode>
                  <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                    İşletme
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <BeamNode
                    ref={customerReturnRef}
                    className="h-14 w-14 border-2 border-rose-500/20 bg-rose-500/10"
                  >
                    <User className="h-7 w-7 text-rose-600" />
                  </BeamNode>
                  <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                    Müşteri
                  </span>
                </div>
              </div>

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={customerRef}
                toRef={platformRef}
                duration={3}
                curvature={0.2}
                gradientStartColor="#3b82f6"
                gradientStopColor="#8b5cf6"
              />

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={platformRef}
                toRef={smsRef}
                duration={3}
                delay={0.5}
                curvature={0}
                gradientStartColor="#8b5cf6"
                gradientStopColor="#10b981"
              />

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={smsRef}
                toRef={customerReturnRef}
                duration={3}
                delay={1}
                curvature={0.3}
                gradientStartColor="#10b981"
                gradientStopColor="#f43f5e"
              />

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={smsRef}
                toRef={barberRef}
                duration={3}
                delay={1.5}
                curvature={-0.2}
                gradientStartColor="#10b981"
                gradientStopColor="#f59e0b"
              />
            </BeamContainer>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                <div className="relative flex items-start gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 transition-all duration-300 group-hover:border-transparent group-hover:shadow-lg">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative w-11 h-11 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 text-base group-hover:text-purple-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
