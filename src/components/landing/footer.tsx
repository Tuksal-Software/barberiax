"use client"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { RainbowButton } from "@/components/ui/rainbow-button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Heart, Mail, Phone, MapPin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-slate-50 text-slate-700">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="BarberiAX" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-900">BarberiAX</span>
            </div>
            <p className="text-sm text-slate-600">
              Berber salonları için modern randevu yönetim sistemi. Müşterilerinizi mutlu edin, işinizi büyütün.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Hızlı Linkler</h3>
            <ul className="space-y-2">
              <li><Button variant="link" className="h-auto p-0 text-slate-600 hover:text-emerald-500">Özellikler</Button></li>
              <li><Button variant="link" className="h-auto p-0 text-slate-600 hover:text-emerald-500">Fiyatlandırma</Button></li>
              <li><Button variant="link" className="h-auto p-0 text-slate-600 hover:text-emerald-500">Hakkımızda</Button></li>
              <li><Button variant="link" className="h-auto p-0 text-slate-600 hover:text-emerald-500">İletişim</Button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">İletişim</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span><>info@iha-tech.com</></span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>+90 549 410 4333</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Demo</h3>
            <p className="text-sm text-slate-600 mb-4">Sistemi ücretsiz test edin ve keşfedin</p>
            <Link href="/demo" className="block">
              <RainbowButton className="group">
                Demo'yu Deneyin
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </RainbowButton>
            </Link>
          </div>
        </div>

        <Separator className="bg-slate-200 my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>© 2026 Barberiax. Tüm hakları saklıdır.</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Powered by <Heart className="w-3 h-3 text-red-500 fill-red-500" /> IHA-TECH
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <Button variant="link" className="h-auto p-0 text-slate-500 hover:text-emerald-500">
              KVKK
            </Button>
            <span className="text-slate-400">•</span>
            <Button variant="link" className="h-auto p-0 text-slate-500 hover:text-emerald-500">
              Gizlilik Politikası
            </Button>
            <span className="text-slate-400">•</span>
            <Button variant="link" className="h-auto p-0 text-slate-500 hover:text-emerald-500">
              Kullanım Koşulları
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
