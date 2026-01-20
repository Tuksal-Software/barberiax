import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const navigationLinks = [
  { active: true, href: "/", label: "Ana Sayfa" },
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#nasil-calisir", label: "Nasıl Çalışır" },
  { href: "#fiyatlandirma", label: "Fiyatlandırma" },
  { href: "#iletisim", label: "İletişim" },
]

export default function Navbar() {
  return (
    <header className="border-b px-4 md:px-6 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Sol taraf */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menü */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                size="icon"
                variant="ghost"
              >
                <svg
                  className="pointer-events-none"
                  fill="none"
                  height={16}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width={16}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className="-translate-y-[7px] origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-315"
                    d="M4 12L20 12"
                  />
                  <path
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                    d="M4 12H20"
                  />
                  <path
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-135"
                    d="M4 12H20"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1 md:hidden">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-0">
                  {navigationLinks.map((link) => (
                    <NavigationMenuItem className="w-full" key={link.label}>
                      <NavigationMenuLink
                        active={link.active}
                        className="py-2 px-3 w-full"
                        href={link.href}
                      >
                        {link.label}
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          {/* Logo ve Desktop Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src="/logo.png" alt="Barberiax" width={32} height={32} />
              <span className="font-bold text-slate-900">Barberiax</span>
            </Link>

            {/* Desktop Navigation Menu */}
            <NavigationMenu className="max-md:hidden">
              <NavigationMenuList className="gap-2">
                {navigationLinks.map((link) => (
                  <NavigationMenuItem key={link.label}>
                    <NavigationMenuLink
                      active={link.active}
                      className="py-1.5 px-3 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                      href={link.href}
                    >
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* Sağ taraf - Butonlar */}
        <div className="flex items-center gap-2">
          <Button asChild className="text-sm" size="sm" variant="ghost">
            <Link href="/login">Giriş Yap</Link>
          </Button>
          <Button asChild className="text-sm bg-slate-900 hover:bg-slate-800" size="sm">
            <Link href="/signup">Başlayın</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}