"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(username: string, password: string) {
  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Kullanıcı adı veya şifre hatalı" }
        default:
          return { success: false, error: "Bir hata oluştu" }
      }
    }
    return { success: false, error: "Beklenmeyen bir hata oluştu" }
  }
}

export async function logoutAction() {
  await signOut({ redirect: false })
}
