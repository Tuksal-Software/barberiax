import { AppointmentRequestStatus } from '@prisma/client'

export interface Barber {
  id: string
  name: string
  avatar?: string
  rating: number
  expertise: string[]
  slotDuration: number
  isActive: boolean
}

export interface Appointment {
  id: string
  barberId: string
  barberName: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: Date
  startTime: string
  endTime: string
  status: AppointmentRequestStatus
  notes?: string
  requestedDuration?: number
  confirmedDuration?: number
}

export const MOCK_BARBERS: Barber[] = [
  {
    id: "1",
    name: "Mehmet Yılmaz",
    rating: 4.8,
    expertise: ["Fade", "Pompadour", "Sakal Tıraşı"],
    slotDuration: 30,
    isActive: true,
  },
  {
    id: "2",
    name: "Ali Demir",
    rating: 4.9,
    expertise: ["Klasik", "Undercut", "Sakal Bakımı"],
    slotDuration: 45,
    isActive: true,
  },
  {
    id: "3",
    name: "Can Özkan",
    rating: 4.7,
    expertise: ["Modern", "Fade", "Tıraş"],
    slotDuration: 30,
    isActive: true,
  },
  {
    id: "4",
    name: "Emre Kaya",
    rating: 4.6,
    expertise: ["Klasik", "Sakal Şekillendirme"],
    slotDuration: 30,
    isActive: false,
  },
]

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    barberId: "1",
    barberName: "Mehmet Yılmaz",
    customerName: "Ahmet Can",
    customerPhone: "+90 532 123 4567",
    customerEmail: "ahmet@example.com",
    date: new Date(),
    startTime: "10:00",
    endTime: "10:30",
    status: "approved",
    requestedDuration: 30,
    confirmedDuration: 30,
  },
  {
    id: "2",
    barberId: "2",
    barberName: "Ali Demir",
    customerName: "Fatma Yıldız",
    customerPhone: "+90 533 987 6543",
    date: new Date(),
    startTime: "14:00",
    endTime: "14:45",
    status: "pending",
    requestedDuration: 45,
  },
  {
    id: "3",
    barberId: "1",
    barberName: "Mehmet Yılmaz",
    customerName: "Mustafa Şahin",
    customerPhone: "+90 534 555 1234",
    date: new Date(Date.now() + 86400000),
    startTime: "16:00",
    endTime: "16:30",
    status: "approved",
    requestedDuration: 30,
    confirmedDuration: 30,
  },
]

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "layout-dashboard" },
  { label: "Randevular", href: "/admin/randevular", icon: "calendar" },
  { label: "Berberler", href: "/admin/berberler", icon: "users", disabled: true },
  { label: "Ayarlar", href: "/admin/ayarlar", icon: "settings", disabled: true },
] as const

export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? 0 : 30
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}).filter((time) => {
  const [h] = time.split(":").map(Number)
  return h >= 9 && h <= 21
})

export const DURATION_OPTIONS = [15, 30, 45, 60] as const






