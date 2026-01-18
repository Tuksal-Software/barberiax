"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { login } from "@/lib/actions/auth.actions"
import { Loader2 } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
})

type LoginData = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const [isPending, setIsPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginData) => {
    if (isPending) return
    
    setIsPending(true)
    
    try {
      const result = await login(data)
      
      if (result?.success) {
        toast.success("Giriş başarılı")
        window.location.href = "/admin"
      } else {
        toast.error(result.error || "Giriş başarısız")
        setIsPending(false)
      }
    } catch (error) {
      toast.error("Bir hata oluştu")
      setIsPending(false)
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-foreground">Admin Girişi</CardTitle>
          <CardDescription className="text-muted-foreground">
            Yönetici paneline erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-foreground">E-posta</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={cn(
                  "bg-background border-input text-foreground",
                  errors.email && "border-destructive"
                )}
                disabled={isPending}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password" className="text-foreground">Şifre</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={cn(
                  "bg-background border-input text-foreground",
                  errors.password && "border-destructive"
                )}
                disabled={isPending}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

