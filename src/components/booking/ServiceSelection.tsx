'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// basit checkbox yerine input kullanıyoruz; projede checkbox bileşeni yok
import { cn } from '@/lib/utils'

type Service = {
  id: string
  name: string
  description?: string | null
  price: number | string
  duration: number
  isActive?: boolean
}

interface ServiceSelectionProps {
  services: Service[]
  selectedServices: string[]
  onSelectionChange: (serviceIds: string[]) => void
  onNext?: () => void
  onBack?: () => void
  showNavigation?: boolean
}

export function ServiceSelection({ 
  services, 
  selectedServices, 
  onSelectionChange, 
  onNext, 
  onBack, 
  showNavigation = false 
}: ServiceSelectionProps) {
  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      onSelectionChange(selectedServices.filter(s => s !== id))
    } else {
      onSelectionChange([...selectedServices, id])
    }
  }

  const calcTotalDuration = (): number => {
    return services.filter(s => selectedServices.includes(s.id)).reduce((acc, s) => acc + (s.duration || 0), 0)
  }

  const calcTotalPrice = (): number => {
    return services.filter(s => selectedServices.includes(s.id)).reduce((acc, s) => acc + Number(s.price || 0), 0)
  }

  const totalDuration = calcTotalDuration()
  const totalPrice = calcTotalPrice()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Hizmet Seçimi</h2>
        <p className="text-gray-600">Almak istediğiniz hizmetleri seçin (en az 1 hizmet seçmelisiniz)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.filter(s => s.isActive !== false).map(service => (
          <Card
            key={service.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selectedServices.includes(service.id) && 'ring-2 ring-teal-500'
            )}
            onClick={() => toggleService(service.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-teal-600">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(service.price))}
                </div>
                <Badge variant="secondary">{service.duration} dk</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedServices.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Toplam Süre</p>
                <p className="text-lg font-semibold">{totalDuration} dakika</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Toplam Ücret</p>
                <p className="text-2xl font-bold text-teal-600">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalPrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {showNavigation && (
        <div className="flex gap-3 justify-between pt-4">
          {onBack && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack}
              className="flex-1"
            >
              Geri Dön
            </Button>
          )}
          {onNext && (
            <Button 
              type="button" 
              onClick={onNext}
              disabled={selectedServices.length === 0}
              className="flex-1"
            >
              Devam Et
            </Button>
          )}
        </div>
      )}
    </div>
  )
}


