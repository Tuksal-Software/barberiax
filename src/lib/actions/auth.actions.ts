'use server'

import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken, verifyToken, type JWTPayload } from '@/lib/auth/jwt'
import { setAuthCookie, getAuthCookie, deleteAuthCookie } from '@/lib/auth/cookies'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit'
import { auditLog } from '@/lib/audit/audit.logger'

export interface LoginInput {
  email: string
  password: string
}

export interface Session {
  userId: string
  role: 'admin' | 'barber'
  email: string
  name: string
}

export async function login(input: LoginInput): Promise<{ success: boolean; error?: string }> {
  const { email, password } = input

  const rateLimit = checkRateLimit(email)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
    }
  }

  const barber = await prisma.barber.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      name: true,
      isActive: true,
    },
  })

  if (!barber) {
    try {
      await auditLog({
        actorType: 'admin',
        action: AuditAction.SMS_FAILED,
        entityType: 'auth',
        entityId: null,
        summary: 'Başarısız giriş denemesi',
        metadata: {
          email,
        },
      })
    } catch {
    }
    return {
      success: false,
      error: 'E-posta veya şifre hatalı',
    }
  }

  if (!barber.isActive) {
    try {
      await auditLog({
        actorType: 'admin',
        action: AuditAction.SMS_FAILED,
        entityType: 'auth',
        entityId: null,
        summary: 'Başarısız giriş denemesi - hesap aktif değil',
        metadata: {
          email,
        },
      })
    } catch {
    }
    return {
      success: false,
      error: 'Hesabınız aktif değil',
    }
  }

  const isValidPassword = await bcrypt.compare(password, barber.password)
  if (!isValidPassword) {
    try {
      await auditLog({
        actorType: 'admin',
        action: AuditAction.SMS_FAILED,
        entityType: 'auth',
        entityId: null,
        summary: 'Başarısız giriş denemesi',
        metadata: {
          email,
        },
      })
    } catch {
    }
    return {
      success: false,
      error: 'E-posta veya şifre hatalı',
    }
  }

  resetRateLimit(email)

  const token = signToken({
    userId: barber.id,
    role: barber.role,
  })

  await setAuthCookie(token)

  try {
    await auditLog({
      actorType: 'admin',
      actorId: barber.id,
      action: AuditAction.SMS_SENT,
      entityType: 'auth',
      entityId: null,
      summary: 'Admin giriş yaptı',
      metadata: {
        email,
      },
    })
  } catch {
  }

  return { success: true }
}

export async function logout(): Promise<void> {
  const session = await getSession()
  await deleteAuthCookie()
  
  if (session) {
    try {
      await auditLog({
        actorType: 'admin',
        actorId: session.userId,
        action: AuditAction.SMS_SENT,
        entityType: 'auth',
        entityId: null,
        summary: 'Admin çıkış yaptı',
        metadata: {
          email: session.email,
        },
      })
    } catch {
    }
  }
}

export async function getSession(): Promise<Session | null> {
  const token = await getAuthCookie()
  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    await deleteAuthCookie()
    return null
  }

  if (payload.role !== 'admin') {
    return null
  }

  const userId = payload.userId ?? (payload as any).sub ?? (payload as any).id ?? null
  if (!userId) {
    await deleteAuthCookie()
    return null
  }

  const barber = await prisma.barber.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isActive: true,
    },
  })

  if (!barber || !barber.isActive) {
    await deleteAuthCookie()
    return null
  }

  return {
    userId: barber.id,
    role: 'admin',
    email: barber.email,
    name: barber.name,
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  if (session.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return session
}






