'use server'

import { requireAuth } from '@/lib/db-helpers'
import { updateBarberImage } from './barber.actions'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function uploadBarberImage(
  barberId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    await requireAuth()

    const file = formData.get('file') as File | null
    if (!file) {
      return {
        success: false,
        error: 'Dosya bulunamadı',
      }
    }

    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Sadece resim dosyaları yüklenebilir',
      }
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Dosya boyutu 5MB\'dan küçük olmalıdır',
      }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'barbers')
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${barberId}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    await writeFile(filePath, buffer)

    const publicPath = `/uploads/barbers/${fileName}`

    const updateResult = await updateBarberImage(barberId, publicPath)
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'Resim kaydedilemedi',
      }
    }

    return {
      success: true,
      path: publicPath,
    }
  } catch (error) {
    console.error('Upload barber image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }
}


