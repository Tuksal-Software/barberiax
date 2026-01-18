import { AdminShell } from "@/components/AdminShell"
import { requireAdmin } from "@/lib/actions/auth.actions"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin()
  } catch (error) {
    redirect('/admin/login')
  }

  return <AdminShell>{children}</AdminShell>
}
