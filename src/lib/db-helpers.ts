import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export interface Session {
  userId: string
  role: 'super_admin' | 'tenant_owner'
  email: string
  name: string
}

export async function getCurrentTenant() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  return {
    tenantId: session.user.tenantId as string,
    role: session.user.role as "super_admin" | "tenant_owner",
    isSuperAdmin: session.user.role === "super_admin"
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (!user) {
    throw new Error("Unauthorized")
  }

  return {
    userId: user.id,
    role: user.role as 'super_admin' | 'tenant_owner',
    email: user.email,
    name: user.name,
  }
}

export async function getTenantFilter(): Promise<{ tenantId: string } | {}> {
  const { tenantId, isSuperAdmin } = await getCurrentTenant()
  
  if (isSuperAdmin) {
    return {}
  }
  
  return { tenantId }
}

export async function getTenantIdForCreate(): Promise<string | undefined> {
  const { tenantId, isSuperAdmin } = await getCurrentTenant()
  
  if (isSuperAdmin) {
    return undefined
  }
  
  return tenantId
}
