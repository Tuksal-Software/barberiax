"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, Users, Scissors } from "lucide-react"
import { toast } from "sonner"
import {
  getBarbersForManagement,
  checkBarberFutureAppointments,
  type BarberListForManagement,
} from "@/lib/actions/barber.actions"
import { BarberFormDialog } from "./components/BarberFormDialog"
import { BarberDeleteDialog } from "./components/BarberDeleteDialog"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default function BerberlerPage() {
  const [barbers, setBarbers] = useState<BarberListForManagement[]>([])
  const [loading, setLoading] = useState(true)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState<BarberListForManagement | null>(null)
  const [deletingBarber, setDeletingBarber] = useState<BarberListForManagement | null>(null)
  const [futureAppointmentCount, setFutureAppointmentCount] = useState<number>(0)

  const loadBarbers = async () => {
    setLoading(true)
    try {
      const data = await getBarbersForManagement()
      setBarbers(data)
    } catch (error) {
      console.error("Error loading barbers:", error)
      toast.error("Berberler yüklenirken hata oluştu")
      setBarbers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBarbers()
  }, [])

  const handleCreate = () => {
    setEditingBarber(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (barber: BarberListForManagement) => {
    setEditingBarber(barber)
    setFormDialogOpen(true)
  }

  const handleDelete = async (barber: BarberListForManagement) => {
    setDeletingBarber(barber)
    try {
      const check = await checkBarberFutureAppointments(barber.id)
      setFutureAppointmentCount(check.count)
      setDeleteDialogOpen(true)
    } catch (error) {
      console.error("Error checking appointments:", error)
      toast.error("Randevu kontrolü yapılırken hata oluştu")
    }
  }

  const handleFormSuccess = () => {
    setFormDialogOpen(false)
    setEditingBarber(null)
    loadBarbers()
  }

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false)
    setDeletingBarber(null)
    setFutureAppointmentCount(0)
    loadBarbers()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Berberler</h1>
          <p className="text-sm text-slate-600 mt-1">
            Berber yönetimi ve düzenleme
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Berber Ekle
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 bg-slate-100" />
      ) : (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Toplam Berber
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{barbers.length}</div>
            <p className="text-xs text-blue-700 mt-1">
              {barbers.filter(b => b.isActive).length} aktif, {barbers.filter(b => !b.isActive).length} pasif
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 bg-slate-100" />
          ))}
        </div>
      ) : barbers.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Scissors className="h-12 w-12 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium">Henüz berber eklenmemiş</p>
              <p className="text-slate-500 text-sm mt-1">
                Yeni berber eklemek için yukarıdaki butona tıklayın
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <Card
              key={barber.id}
              className={cn(
                "bg-white border-2 shadow-sm transition-all hover:shadow-md",
                barber.isActive ? "border-green-200" : "border-slate-200 opacity-60"
              )}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                    <AvatarImage
                      src={barber.image || undefined}
                      alt={barber.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-semibold">
                      {getInitials(barber.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">
                      {barber.name}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {barber.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge
                      className={cn(
                        "font-normal",
                        barber.isActive
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      {barber.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    {barber.experience > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-normal">
                        {barber.experience} yıl deneyim
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 w-full pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(barber)}
                      className="flex-1 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDelete(barber)}
                      className="flex-1 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Sil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BarberFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        barber={editingBarber}
        onSuccess={handleFormSuccess}
      />

      {deletingBarber && (
        <BarberDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          barber={deletingBarber}
          futureAppointmentCount={futureAppointmentCount}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}


