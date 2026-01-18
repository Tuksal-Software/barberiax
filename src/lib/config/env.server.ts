function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("[ENV] Server-only env accessed on client")
  }
}

function getRequiredEnv(key: string): string {
  assertServer()
  const value = process.env[key]
  if (!value) {
    throw new Error(`[ENV] ${key} is required`)
  }
  return value
}

function getOptionalEnv(key: string): string | undefined {
  assertServer()
  return process.env[key]
}

export const serverEnv = {
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  JWT_SECRET: getOptionalEnv("JWT_SECRET"),
}

