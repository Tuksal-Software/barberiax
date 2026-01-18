import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { updateService } from '@/lib/actions/services'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(10000),
  duration: z.number().refine((v) => [15, 30, 45, 60, 90, 120].includes(v)),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function EditServiceModal({
  open,
  onOpenChange,
  service,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  service: {
    id: string
    name: string
    description?: string | null
    price: string | number
    duration: number
    isActive: boolean
  }
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 30,
      isActive: true,
    },
  })

  useEffect(() => {
    if (open && service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        price: typeof service.price === 'string' ? Number(service.price) : service.price,
        duration: service.duration,
        isActive: service.isActive,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const res = await updateService(service.id, {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        isActive: data.isActive,
      })
      if (res.success) {
        toast.success('Hizmet güncellendi')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error || 'Güncelleme başarısız')
      }
    } catch (e) {
      toast.error('Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hizmeti Düzenle</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">İsim</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" rows={3} {...form.register('description')} />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Fiyat (₺)</Label>
              <Input id="price" type="number" step="0.01" inputMode="decimal" {...form.register('price', { valueAsNumber: true })} />
              {form.formState.errors.price && (
                <p className="text-sm text-red-600">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Süre</Label>
              <Select value={String(form.watch('duration'))} onValueChange={(v) => form.setValue('duration', Number(v), { shouldDirty: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Süre seçin" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5} className="z-[100] bg-background">
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} dk</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.duration && (
                <p className="text-sm text-red-600">{form.formState.errors.duration.message}</p>
              )}
            </div>

            <div className="space-y-2 flex items-end">
              <div className="flex items-center justify-between w-full">
                <Label>Aktif</Label>
                <Switch 
                  checked={form.watch('isActive')} 
                  onCheckedChange={(v) => form.setValue('isActive', v, { shouldDirty: true })}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
            <Button type="submit" disabled={!form.formState.isValid || saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
