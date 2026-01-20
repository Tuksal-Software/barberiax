'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { getServices, createService } from '@/lib/actions/services'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EditServiceModal } from './components/EditServiceModal'
import { DeleteServiceDialog } from './components/DeleteServiceDialog'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateService, reorderServices } from '@/lib/actions/services'

type Service = {
  id: string
  name: string
  description?: string | null
  price: string | number
  duration: number
  isActive: boolean
  order: number
}

const serviceSchema = z.object({
  name: z.string().min(3, 'En az 3 karakter').max(100, 'En fazla 100 karakter'),
  description: z.string().max(500, 'En fazla 500 karakter').optional(),
  price: z.number({ invalid_type_error: 'Geçerli bir fiyat girin' }).min(0).max(10000),
  duration: z.number({ invalid_type_error: 'Geçerli bir süre seçin' }).refine(v => [15,30,45,60,90,120].includes(v), 'Geçersiz süre'),
  isActive: z.boolean().default(true),
})

type ServiceFormData = z.infer<typeof serviceSchema>

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = services.findIndex((s) => s.id === active.id)
    const newIndex = services.findIndex((s) => s.id === over.id)
    const prev = services
    const next = arrayMove(services, oldIndex, newIndex)
    setServices(next)
    try {
      await reorderServices(next.map((s, idx) => s.id))
      toast.success('Sıralama güncellendi')
    } catch (e) {
      setServices(prev)
      toast.error('Sıralama güncellenemedi')
    }
  }

  function SortableServiceRow({ s }: { s: Service }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    }
    const [toggling, setToggling] = useState(false)
    const onToggle = async () => {
      setToggling(true)
      try {
        await updateService(s.id, { isActive: !s.isActive })
        setServices((curr) => curr.map((it) => (it.id === s.id ? { ...it, isActive: !s.isActive } : it)))
        toast.success(!s.isActive ? 'Hizmet aktif edildi' : 'Hizmet pasif edildi')
      } catch (e) {
        toast.error('Durum güncellenemedi')
      } finally {
        setToggling(false)
      }
    }

    return (
      <TableRow ref={setNodeRef} style={style} className={isDragging ? 'shadow ring-2 ring-teal-200' : ''}>
        <TableCell>
          <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
        </TableCell>
        <TableCell className="font-medium">{s.name}</TableCell>
        <TableCell title={s.description ?? undefined} className="max-w-[280px] truncate text-gray-600">
          {s.description}
        </TableCell>
        <TableCell>{formatPrice(s.price)}</TableCell>
        <TableCell>
          <Badge variant="secondary">{s.duration} dk</Badge>
        </TableCell>
        <TableCell>
          <Switch 
            checked={s.isActive} 
            onCheckedChange={onToggle} 
            disabled={toggling}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300"
          />
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background">
              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelected(s); setEditOpen(true) }}>
                <Pencil className="w-4 h-4 mr-2" /> Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => { setSelected(s); setDeleteOpen(true) }}>
                <Trash className="w-4 h-4 mr-2" /> Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await getServices()
      if (res.success) {
        setServices(res.data as any)
      } else {
        toast.error(res.error || 'Hizmetler yüklenemedi')
      }
    } catch (e) {
      toast.error('Hizmetler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 30,
      isActive: true,
    }
  })

  const onCreate = async (data: ServiceFormData) => {
    setCreating(true)
    try {
      const res = await createService({
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        isActive: data.isActive,
      })
      if (res.success) {
        toast.success('Hizmet eklendi')
        setOpenCreate(false)
        form.reset()
        await load()
      } else {
        toast.error(res.error || 'Hizmet eklenemedi')
      }
    } catch (e) {
      toast.error('Hizmet eklenemedi')
    } finally {
      setCreating(false)
    }
  }

  const formatPrice = (price: string | number) => {
    const p = typeof price === 'string' ? Number(price) : price
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(p)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hizmetler</h1>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Yeni Hizmet Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hizmet Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-gray-600">Henüz hizmet eklenmemiş.</div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>İsim</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Süre</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="w-16">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((s) => (
                        <SortableServiceRow key={s.id} s={s} />
                      ))}
                    </TableBody>
                  </Table>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Hizmet Ekle</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">İsim</Label>
              <Input id="name" placeholder="Örn: Saç Kesimi" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" rows={3} placeholder="Opsiyonel açıklama" {...form.register('description')} />
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
                    {[15,30,45,60,90,120].map((d) => (
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
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Vazgeç</Button>
              <Button type="submit" disabled={!form.formState.isValid || creating}>{creating ? 'Kaydediliyor…' : 'Kaydet'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selected && (
        <EditServiceModal open={editOpen} onOpenChange={setEditOpen} service={selected} onSuccess={load} />
      )}
      {selected && (
        <DeleteServiceDialog open={deleteOpen} onOpenChange={setDeleteOpen} serviceId={selected.id} serviceName={selected.name} onSuccess={load} />
      )}
    </div>
  )
}


