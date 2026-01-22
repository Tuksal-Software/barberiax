"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Play } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="container max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Sol taraf - Text & CTA */}
          <div className="lg:col-span-2 space-y-8">
            <div className="inline-block px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
              ✨ Modern Berber Yönetim Sistemi
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              Berber Salonunuzu
              <span className="block text-slate-600">Dijitalleştirin</span>
            </h1>
            
            <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
              Randevularınızı otomatik yönetin, müşterilerinizi kaybetmeyin. 
              SMS hatırlatma, online randevu ve gelir takibi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild 
                size="lg" 
                className="bg-slate-900 hover:bg-slate-800 text-white group"
              >
                <Link href="/signup" className="flex items-center gap-2">
                  Ücretsiz Başla
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                size="lg" 
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Link href="#demo" className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Demo İzle
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
                </div>
                <span className="text-sm text-slate-600">50+ işletme kullanıyor</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                <span className="text-sm text-slate-600 ml-1">4.9/5</span>
              </div>
            </div>
          </div>
          
          {/* Sağ taraf - Gerçek Mockup */}
          <div className="lg:col-span-3 relative">
            <div className="relative z-10 transform hover:scale-105 transition-transform duration-300">
              <Image
                src="/mockup.png"
                alt="Barberiax Admin Panel ve Müşteri Ekranı"
                width={1400}
                height={1050}
                priority
                className="w-full h-auto drop-shadow-2xl"
              />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-12 -right-12 w-72 h-72 bg-slate-200 rounded-full blur-3xl opacity-50 -z-10"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-slate-300 rounded-full blur-3xl opacity-30 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
