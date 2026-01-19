import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <header className="border-b px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Barberiax" width={32} height={32} />
            <span className="font-bold">Barberiax</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Giriş Yap</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Başlayın</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
