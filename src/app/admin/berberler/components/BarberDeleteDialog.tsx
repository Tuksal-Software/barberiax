"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deactivateBarber, type BarberListForManagement } from "@/lib/actions/barber.actions"

interface BarberDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  barber: BarberListForManagement
  futureAppointmentCount: number
  onSuccess: () => void
}

export function BarberDeleteDialog({
  open,
  onOpenChange,
  barber,
  futureAppointmentCount,
  onSuccess,
}: BarberDeleteDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const result = await deactivateBarber(barber.id)

      if (!result.success) {
        toast.error(result.error || "Berber silinirken hata oluştu")
        setLoading(false)
        return
      }

      if (result.hasFutureAppointments) {
        toast.success(
          `Berber pasifleştirildi. ${result.appointmentCount} randevu iptal edildi.`
        )
      } else {
        toast.success("Berber başarıyla pasifleştirildi")
      }

      onSuccess()
    } catch (error) {
      console.error("Error deleting barber:", error)
      toast.error("Bir hata oluştu")
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900">Berberi Pasifleştir</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-slate-600">
            <p>
              <strong>{barber.name}</strong> adlı berberi pasifleştirmek
              istediğinize emin misiniz?
            </p>
            {futureAppointmentCount > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mt-3">
                <p className="font-medium text-red-900 mb-1">
                  ⚠️ Uyarı
                </p>
                <p className="text-sm text-red-800">
                  Bu berbere ait <strong>{futureAppointmentCount}</strong> aktif
                  randevu bulunmaktadır.
                </p>
                <p className="text-sm text-red-800 mt-1">
                  Devam ederseniz <strong>TÜM randevular iptal edilecek</strong> ve
                  müşterilere <strong>SMS gönderilmeyecektir</strong>.
                </p>
              </div>
            )}
            <p className="text-sm text-slate-500 mt-2">
              Pasifleştirilen berber listeden tamamen kaybolacaktır.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
            İptal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Pasifleştiriliyor..." : "Evet, Pasifleştir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


