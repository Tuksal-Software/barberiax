import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { deleteService } from '@/lib/actions/services'
import { toast } from 'sonner'
import { useState } from 'react'

export function DeleteServiceDialog({
  open,
  onOpenChange,
  serviceName,
  serviceId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  serviceName: string
  serviceId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  const onConfirm = async () => {
    setLoading(true)
    try {
      const res = await deleteService(serviceId)
      if (res.success) {
        toast.success('Hizmet silindi')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error || 'Silme işlemi başarısız')
      }
    } catch (e) {
      toast.error('Silme işlemi başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hizmeti silmek istediğinize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            {serviceName} hizmeti silinecek. İlişkili randevular etkilenmeyecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>{loading ? 'Siliniyor…' : 'Sil'}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}






