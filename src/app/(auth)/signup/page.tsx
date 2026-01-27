"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signupAction } from "@/lib/actions/auth"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!businessName || businessName.trim().length < 2) {
      newErrors.businessName = "İşletme adı en az 2 karakter olmalıdır"
    }

    if (!username || username.length < 3) {
      newErrors.username = "Kullanıcı adı en az 3 karakter olmalıdır"
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Kullanıcı adı sadece harf, rakam ve underscore içerebilir"
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Geçerli bir e-posta adresi giriniz"
    }

    if (!password || password.length < 8) {
      newErrors.password = "Şifre en az 8 karakter olmalıdır"
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("businessName", businessName.trim())
      formData.append("username", username.trim())
      formData.append("email", email.trim())
      formData.append("password", password)
      formData.append("confirmPassword", confirmPassword)

      const result = await signupAction(formData)

      if (!result.success) {
        toast.error(result.error || "Kayıt başarısız")
        setLoading(false)
        return
      }

      toast.success("Kayıt başarılı! Giriş yapabilirsiniz.")
      router.push("/login")
      router.refresh()
    } catch (error) {
      toast.error("Kayıt yapılırken bir hata oluştu")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Kayıt Ol</CardTitle>
          <CardDescription className="text-center">
            Yeni bir hesap oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">İşletme Adı</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value)
                  if (errors.businessName) {
                    setErrors((prev) => ({ ...prev, businessName: "" }))
                  }
                }}
                placeholder="İşletme adınızı girin"
                disabled={loading}
                autoComplete="organization"
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (errors.username) {
                    setErrors((prev) => ({ ...prev, username: "" }))
                  }
                }}
                placeholder="Kullanıcı adınızı girin"
                disabled={loading}
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: "" }))
                  }
                }}
                placeholder="Email adresinizi girin"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: "" }))
                  }
                  if (errors.confirmPassword && confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                  }
                }}
                placeholder="Şifrenizi girin (min 8 karakter)"
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                  }
                }}
                placeholder="Şifrenizi tekrar girin"
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Zaten hesabın var mı? </span>
              <Link href="/login" className="text-primary hover:underline">
                Giriş Yap
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
