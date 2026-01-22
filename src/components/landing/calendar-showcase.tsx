"use client"

import { useState } from "react"
import { GridBackground } from "@/components/ui/grid-background"
import { Calendar, Clock, Users, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const features = [
  {
    icon: Calendar,
    title: "Haftalık Görünüm",
    description: "Tüm randevularınızı haftalık takvimde görün"
  },
  {
    icon: Clock,
    title: "Otomatik Slot Yönetimi",
    description: "Çakışan randevular otomatik engellenir"
  },
  {
    icon: Users,
    title: "Çoklu Berber",
    description: "Her berberin randevularını ayrı takip edin"
  },
  {
    icon: CheckCircle,
    title: "Onay Sistemi",
    description: "Randevuları onaylayın veya iptal edin"
  }
]

const dummyAppointments = [
  { day: 0, time: '10:00', name: 'Mücahit bal', status: 'approved' },
  { day: 0, time: '14:00', name: 'Mehmet Kaya', status: 'approved' },
  { day: 1, time: '11:00', name: 'Can Demir', status: 'approved' },
  { day: 1, time: '13:00', name: 'Ali Veli', status: 'approved' },
  { day: 2, time: '10:00', name: 'Emre Şahin', status: 'pending' },
  { day: 2, time: '13:00', name: 'Burak Öz', status: 'approved' },
  { day: 3, time: '12:00', name: 'Cem Arslan', status: 'approved' },
  { day: 4, time: '11:00', name: 'Baran Şahin', status: 'abonman', hasRedDot: true },
  { day: 4, time: '14:00', name: 'Burak Bakır', status: 'abonman', hasRedDot: true },
  { day: 4, time: '15:00', name: 'Eren Koç', status: 'done' },
]

const days = [
  { abbr: 'Pzt', date: 19, count: 15 },
  { abbr: 'Sal', date: 20, count: 12 },
  { abbr: 'Çar', date: 21, count: 8 },
  { abbr: 'Per', date: 22, count: 10 },
  { abbr: 'Cum', date: 23, count: 18 },
  { abbr: 'Cmt', date: 24, count: 5 },
  { abbr: 'Paz', date: 25, count: 0 },
]

const hours = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00']

export default function CalendarShowcase() {
  const [selectedAppointment, setSelectedAppointment] = useState<typeof dummyAppointments[0] | null>(null)

  return (
    <section className="py-10 md:py-14 bg-[#f7f7f7]">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Güçlü Takvim Yönetimi
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tüm randevularınızı tek bir ekranda görün ve yönetin
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
            <div className="p-6 pb-4">
              <div className="text-center text-sm font-semibold text-slate-900 mb-6">
                19 Ocak - 25 Ocak 20∞
              </div>
              
              <div className="relative h-[600px]">
                <GridBackground 
                  gridSize="8:8"
                  colors={{
                    background: 'bg-white',
                    borderColor: 'border-slate-200/60',
                    borderSize: '1px',
                    borderStyle: 'solid'
                  }}
                  beams={{
                    count: 10,
                    colors: [
                      'bg-blue-400/40',
                      'bg-purple-400/40',
                      'bg-cyan-400/40',
                      'bg-indigo-400/40',
                    ],
                    speed: 6,
                    shadow: 'shadow-md shadow-blue-400/30 rounded-full'
                  }}
                />
                
                <div className="absolute inset-0 p-4 z-20">
                  <div className="h-full flex flex-col">
                    <div className="grid grid-cols-8 gap-2 mb-3">
                      <div className="text-xs font-medium text-slate-400"></div>
                      {days.map((day, i) => (
                        <div key={i} className="text-center">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium mb-1">
                            {day.abbr}
                          </div>
                          <div className={`text-base font-semibold mb-1 ${i === 1 ? 'text-blue-600' : 'text-slate-900'}`}>
                            {day.date}
                          </div>
                          {day.count > 0 && (
                            <div className="text-[10px] text-slate-500">
                              {day.count} randevu
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 flex flex-col">
                      {hours.map((hour, hourIndex) => (
                        <div key={hour} className="flex-1 grid grid-cols-8 gap-1.5 min-h-0">
                          <div className="text-xs text-slate-500 flex items-center font-medium px-0.5">
                            {hour}
                          </div>
                          
                          {days.map((day, dayIndex) => {
                            const appointment = dummyAppointments.find(
                              app => app.day === dayIndex && app.time === hour
                            )
                            
                            const getStatusStyles = (status: string) => {
                              switch (status) {
                                case 'approved':
                                  return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/15 hover:border-emerald-500/40 cursor-pointer'
                                case 'pending':
                                  return 'bg-amber-500/10 border border-amber-500/30 text-amber-700 hover:bg-amber-500/15 hover:border-amber-500/40 cursor-pointer'
                                case 'abonman':
                                  return 'bg-violet-500/10 border border-violet-500/30 text-violet-700 hover:bg-violet-500/15 hover:border-violet-500/40 cursor-pointer'
                                case 'done':
                                  return 'bg-green-500/5 border border-green-500/20 text-green-600/60 cursor-not-allowed'
                                default:
                                  return 'bg-slate-50/20 border border-dashed border-slate-200/50'
                              }
                            }
                            
                            return (
                              <div key={dayIndex} className="relative min-h-0 h-full">
                                {appointment ? (
                                  appointment.status === 'done' ? (
                                    <div className={`
                                      w-full h-full px-1.5 py-1 text-xs font-medium
                                      flex flex-col justify-center items-start gap-0.5
                                      ${getStatusStyles(appointment.status)}
                                    `}>
                                      <div className="font-semibold text-[11px] leading-tight">{appointment.time}</div>
                                      <div className="text-[10px] truncate w-full leading-tight">{appointment.name}</div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedAppointment(appointment)}
                                      className={`
                                        w-full h-full px-1.5 py-1 text-xs font-medium
                                        flex flex-col justify-center items-start gap-0.5 relative
                                        ${getStatusStyles(appointment.status)}
                                        transition-all
                                      `}
                                    >
                                      {(appointment as any).hasRedDot && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                      )}
                                      <div className="font-semibold text-[11px] leading-tight">{appointment.time}</div>
                                      <div className="text-[10px] truncate w-full leading-tight">{appointment.name}</div>
                                    </button>
                                  )
                                ) : (
                                  <div className="w-full h-full border border-dashed border-slate-200/50 bg-slate-50/20"></div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment?.status === 'approved' 
                ? 'Onaylanmış Randevu' 
                : selectedAppointment?.status === 'pending'
                ? 'Bekleyen Randevu'
                : selectedAppointment?.status === 'abonman'
                ? 'Abonman Randevu'
                : 'Randevu Detayı'}
            </DialogTitle>
            <DialogDescription>
              Randevu detayları
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Müşteri:</span>
                <span className="text-sm text-slate-900">{selectedAppointment.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Saat:</span>
                <span className="text-sm text-slate-900">{selectedAppointment.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Durum:</span>
                <span className={`text-sm font-medium ${
                  selectedAppointment.status === 'approved' 
                    ? 'text-emerald-700' 
                    : selectedAppointment.status === 'pending'
                    ? 'text-amber-700'
                    : selectedAppointment.status === 'abonman'
                    ? 'text-violet-700'
                    : 'text-green-700'
                }`}>
                  {selectedAppointment.status === 'approved' 
                    ? 'Onaylandı' 
                    : selectedAppointment.status === 'pending'
                    ? 'Beklemede'
                    : selectedAppointment.status === 'abonman'
                    ? 'Abonman'
                    : 'Tamamlandı'}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Bu bir demo görünümüdür. Gerçek uygulamada randevu yönetimi ve onay işlemleri buradan yapılabilir.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
