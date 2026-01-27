'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { auth, signOut, signIn } from '@/auth'
import { requireAuth, type Session } from '@/lib/db-helpers'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface SignupFormData {
  username: string
  email: string
  password: string
  name: string
  businessName: string
}

export async function signupAction(
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; redirect?: string }> {
  try {
    const username = formData.get('username')?.toString().trim()
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString()
    const confirmPassword = formData.get('confirmPassword')?.toString()
    const businessName = formData.get('businessName')?.toString().trim()
    const name = (formData.get('name')?.toString().trim()) || username || businessName || ''

    if (!username || username.length < 3) {
      return {
        success: false,
        error: 'Kullanıcı adı en az 3 karakter olmalıdır',
      }
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        success: false,
        error: 'Kullanıcı adı sadece harf, rakam ve underscore içerebilir',
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        error: 'Geçerli bir e-posta adresi giriniz',
      }
    }

    if (!password || password.length < 8) {
      return {
        success: false,
        error: 'Şifre en az 8 karakter olmalıdır',
      }
    }

    if (!businessName || businessName.trim().length < 2) {
      return {
        success: false,
        error: 'İşletme adı en az 2 karakter olmalıdır',
      }
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Şifreler eşleşmiyor',
      }
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return {
        success: false,
        error: 'Bu kullanıcı adı zaten kullanılıyor',
      }
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return {
        success: false,
        error: 'Bu e-posta adresi zaten kullanılıyor',
      }
    }

    const slug = slugify(businessName)
    
    if (!slug || slug.length === 0) {
      return {
        success: false,
        error: 'İşletme adından geçerli bir slug oluşturulamadı',
      }
    }

    const existingSlug = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      let counter = 1
      let newSlug = `${slug}-${counter}`
      while (await prisma.tenant.findUnique({ where: { slug: newSlug } })) {
        counter++
        newSlug = `${slug}-${counter}`
      }
      const finalSlug = newSlug

      const hashedPassword = await bcrypt.hash(password, 10)

      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: businessName.trim(),
            slug: finalSlug,
            status: 'suspended',
          },
        })

        await tx.user.create({
          data: {
            tenantId: tenant.id,
            username,
            email,
            password: hashedPassword,
            name: name.trim() || username,
            role: 'tenant_owner',
          },
        })
      })

      await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      return {
        success: true,
        message: 'Kayıt başarılı! Yönlendiriliyorsunuz...',
        redirect: '/admin',
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: businessName.trim(),
          slug,
          status: 'suspended',
        },
      })

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          username,
          email,
          password: hashedPassword,
          name: name.trim() || username,
          role: 'tenant_owner',
        },
      })
    })

    await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    return {
      success: true,
      message: 'Kayıt başarılı! Yönlendiriliyorsunuz...',
      redirect: '/admin',
    }
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        if (error.message.includes('username')) {
          return {
            success: false,
            error: 'Bu kullanıcı adı zaten kullanılıyor',
          }
        }
        if (error.message.includes('email')) {
          return {
            success: false,
            error: 'Bu e-posta adresi zaten kullanılıyor',
          }
        }
        if (error.message.includes('slug')) {
          return {
            success: false,
            error: 'Bu işletme adı zaten kullanılıyor',
          }
        }
      }
    }

    return {
      success: false,
      error: 'Kayıt işlemi sırasında bir hata oluştu',
    }
  }
}

export async function getSessionClient(): Promise<Session | null> {
  try {
    return await requireAuth()
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
