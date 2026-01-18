export const publicEnv = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  SMS_PROVIDER: process.env.SMS_PROVIDER ?? "console",
  ADMIN_PHONE: process.env.ADMIN_PHONE,
  SMS_API_ID: process.env.SMS_API_ID,
  SMS_API_KEY: process.env.SMS_API_KEY,
}

