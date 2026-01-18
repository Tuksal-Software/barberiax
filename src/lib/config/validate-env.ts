import { publicEnv } from './env.public'
import { serverEnv } from './env.server'

export function validateEnv() {
  try {
    const _ = { ...publicEnv, ...serverEnv }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Environment validation failed:', error.message)
      if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.exit) {
        process.exit(1)
      }
    }
    throw error
  }
}

export function validateProductionEnv() {
  if (typeof window !== 'undefined') {
    return
  }
  
  if (publicEnv.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        console.warn('⚠️  JWT_SECRET should be at least 32 characters long in production for security')
      }
      const weakSecrets = ['your-secret-key', 'change-me', 'secret', 'password', 'example']
      if (weakSecrets.some(weak => jwtSecret.toLowerCase().includes(weak))) {
        console.warn('⚠️  JWT_SECRET appears to be a default/weak value. Please use a strong, random secret in production')
      }
    }
  }
}

