import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    username?: string
    role?: UserRole
    tenantId?: string
  }
  interface Session {
    user: {
      role?: string
      tenantId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    tenantId?: string
  }
}
