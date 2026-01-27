import { AdminShell } from "@/components/AdminShell"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const isSuperAdmin = session.user.role === 'super_admin'
  
  let tenant = null
  if (session.user.tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, status: true, createdAt: true }
    })
  }

  if (!isSuperAdmin && tenant?.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <CardTitle className="text-3xl">Hesap Aktivasyonu Bekleniyor</CardTitle>
              <CardDescription className="text-base">
                {tenant?.name} hesabınız henüz aktif değil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-blue-900 font-medium">
                      Hesabınız İnceleniyor
                    </p>
                    <p className="text-sm text-blue-700">
                      Kayıt işleminiz tamamlandı. Hesabınız sistem yöneticisi tarafından 
                      onaylandıktan sonra tüm özelliklere erişebileceksiniz.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">İletişim Bilgileri</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Sorularınız için bizimle iletişime geçebilirsiniz:
                </p>
                <div className="space-y-1">
                  <p className="text-sm">📧 destek@barberiax.com</p>
                  <p className="text-sm">📞 +90 XXX XXX XX XX</p>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Kayıt tarihi: {new Date(tenant?.createdAt || '').toLocaleDateString('tr-TR')}
                </p>
                <form action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/' })
                }}>
                  <Button type="submit" variant="outline" size="sm">
                    Çıkış Yap
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const showSidebar = true
  const isDisabled = false

  return <AdminShell showSidebar={showSidebar} isDisabled={isDisabled}>{children}</AdminShell>
}
