"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import {
  createBarber,
  updateBarber,
  type BarberListForManagement,
} from "@/lib/actions/barber.actions"
import { uploadBarberImage } from "@/lib/actions/barber-image.actions"

interface BarberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  barber: BarberListForManagement | null
  onSuccess: () => void
}

export function BarberFormDialog({
  open,
  onOpenChange,
  barber,
  onSuccess,
}: BarberFormDialogProps) {
  const [name, setName] = useState("")
  const [experience, setExperience] = useState<number>(0)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (barber) {
        setName(barber.name)
        setExperience(barber.experience)
        setImagePreview(barber.image)
      } else {
        setName("")
        setExperience(0)
        setImagePreview(null)
      }
      setImageFile(null)
    }
  }, [open, barber])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Sadece resim dosyaları yüklenebilir")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Dosya boyutu 5MB'dan küçük olmalıdır")
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(barber?.image || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("Ad Soyad zorunludur")
      return
    }

    setLoading(true)
    try {
      if (barber) {
        const result = await updateBarber({
          id: barber.id,
          name: name.trim(),
          experience: experience || 0,
        })

        if (!result.success) {
          toast.error(result.error || "Berber güncellenirken hata oluştu")
          return
        }

        if (imageFile) {
          const formData = new FormData()
          formData.append("file", imageFile)
          const uploadResult = await uploadBarberImage(barber.id, formData)
          
          if (!uploadResult.success) {
            toast.error(uploadResult.error || "Fotoğraf yüklenirken hata oluştu")
            return
          }
        }

        toast.success("Berber başarıyla güncellendi")
      } else {
        const result = await createBarber({
          name: name.trim(),
          experience: experience || 0,
        })

        if (!result.success) {
          toast.error(result.error || "Berber oluşturulurken hata oluştu")
          return
        }

        if (result.id && imageFile) {
          const formData = new FormData()
          formData.append("file", imageFile)
          const uploadResult = await uploadBarberImage(result.id, formData)
          
          if (!uploadResult.success) {
            toast.warning("Berber oluşturuldu ancak fotoğraf yüklenemedi")
          }
        }

        toast.success("Berber başarıyla oluşturuldu")
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving barber:", error)
      toast.error("Bir hata oluştu")
    } finally {
      setLoading(false)
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-slate-900">
            {barber ? "Berber Düzenle" : "Yeni Berber Ekle"}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {barber ? "Berber bilgilerini düzenleyin" : "Yeni bir berber ekleyin"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={imagePreview || undefined}
                  alt={name || "Berber"}
                />
                <AvatarFallback className="text-lg">
                  {name ? getInitials(name) : "BB"}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Label
                  htmlFor="image-upload"
                  className="cursor-pointer"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </span>
                  </Button>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">
                Ad Soyad <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="text-slate-700">Deneyim (Yıl)</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={experience}
                onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {barber && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
                <p className="font-medium text-blue-900 mb-1">Bilgi:</p>
                <p className="text-blue-800">Email: {barber.email}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Email ve rol değiştirilemez
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Kaydediliyor..." : barber ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


