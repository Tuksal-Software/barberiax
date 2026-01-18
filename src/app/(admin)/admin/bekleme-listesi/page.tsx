"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, User, Phone, Calendar, Clock } from "lucide-react"
import { getAllWaitlistRequests, type WaitlistRequest } from "@/lib/actions/appointment-waitlist.actions"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"

export default function BeklemeListesiPage() {
  const [requests, setRequests] = useState<WaitlistRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      const data = await getAllWaitlistRequests()
      setRequests(data)
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const activeRequests = requests.filter(r => r.status === 'active')
  const notifiedRequests = requests.filter(r => r.status === 'notified')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bekleme Listesi</h1>
        <p className="text-sm text-slate-600 mt-1">
          Randevu bildirimi bekleyen müşteriler
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="relative pb-2">
            <p className="text-sm font-medium text-amber-700">Bekleyen Talepler</p>
            <p className="text-3xl font-bold text-amber-900">{activeRequests.length}</p>
            <div className="absolute right-4 top-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="relative pb-2">
            <p className="text-sm font-medium text-green-700">Bildirilen</p>
            <p className="text-3xl font-bold text-green-900">{notifiedRequests.length}</p>
            <div className="absolute right-4 top-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-slate-50">
          <CardTitle className="text-lg">Tüm Talepler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-slate-500">Yükleniyor...</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Henüz talep yok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Müşteri</TableHead>
                  <TableHead className="font-semibold text-slate-700">Telefon</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tarih</TableHead>
                  <TableHead className="font-semibold text-slate-700">Saat Aralığı</TableHead>
                  <TableHead className="font-semibold text-slate-700">Durum</TableHead>
                  <TableHead className="font-semibold text-slate-700">Oluşturulma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {request.customerName}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {request.customerPhone}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(new Date(request.preferredDate), "d MMM yyyy", { locale: tr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {request.timeRangeType === 'morning' ? 'Sabah/Öğle' : 'Akşam'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={request.status === 'active' 
                          ? "bg-amber-100 text-amber-700 border-amber-200" 
                          : "bg-green-100 text-green-700 border-green-200"
                        }
                      >
                        {request.status === 'active' ? 'Bekliyor' : 'Bildirildi'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(request.createdAt), "dd MMM yyyy HH:mm", { locale: tr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
