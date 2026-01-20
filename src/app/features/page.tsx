"use client";
import React from "react";
import { Timeline } from "@/components/ui/timeline";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import Image from "next/image";

export default function FeaturesPage() {
  const data = [
    {
      title: "Dashboard",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Tüm işletme verilerinizi tek bir ekranda görün. Günlük randevu sayısı, gelir istatistikleri ve önemli metrikler anlık olarak takip edin.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/dashboard.png"
              alt="Dashboard"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Randevular",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Bekleyen randevuları onaylayın, iptal edin veya düzenleyin. Müşteri bilgileri ve randevu geçmişi tek tıkla erişilebilir.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/randevular.png"
              alt="Randevular"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Takvim",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Tüm randevularınızı haftalık takvimde görüntüleyin. Sürükle-bırak ile randevu zamanlarını kolayca değiştirin.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/takvim.png"
              alt="Takvim"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Çalışma Saatleri",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Her gün için farklı çalışma saatleri belirleyin. Tatil günleri ve özel istisnalar kolayca oluşturun.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/calismasaatleri.png"
              alt="Çalışma Saatleri"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Abonmanlar",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Düzenli müşteriler için tekrarlayan randevular oluşturun. Haftalık veya aylık abonelikler yönetin.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/abonmanlar.png"
              alt="Abonmanlar"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Kara Liste",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            İstenmeyen müşterileri engelleyin. Engellenen telefon numaraları sistemden randevu alamaz.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/engellenenmusteriler.png"
              alt="Engellenen Müşteriler"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Bekleme Listesi",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
            Dolu saatler için bekleme listesi oluşturun. İptal olduğunda bekleyen müşterilere otomatik bildirim.
          </p>
          <div className="mb-6 p-4 bg-slate-50 dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700">
            <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-3">
              <strong>Müşteriler nasıl eklenebilir?</strong>
            </p>
            <p className="text-neutral-700 dark:text-neutral-300 text-xs md:text-sm mb-3">
              Dolu saatlerde müşteriler randevu sayfasından kolayca bekleme listesine eklenebilir:
            </p>
            <div className="max-w-xs mx-auto">
              <Image
                src="/beklemelistesimodal.png"
                alt="Müşteri Bekleme Listesi"
                width={300}
                height={500}
                className="rounded-lg object-contain w-full shadow-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/beklemelistesi.png"
              alt="Bekleme Listesi Admin"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Dijital Defter",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Tüm gelirlerinizi kaydedin ve takip edin. Randevu bazlı otomatik gelir kaydı ile defteriniz her zaman güncel.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/defter.png"
              alt="Defter"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Gider Yönetimi",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Kira, elektrik, personel maaşı gibi tüm giderlerinizi kaydedin. Sabit ve değişken gider ayrımı yapın.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/giderler.png"
              alt="Giderler"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "SMS İzleme",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Gönderilen tüm SMS'leri görüntüleyin. Başarılı ve başarısız mesajları filtreleyin, detaylı analiz yapın.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/smslog.png"
              alt="SMS Log"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Ayarlar",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            İşletme adı, SMS ayarları, iptal kuralları ve daha fazlasını tek yerden özelleştirin.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Image
              src="/settings.png"
              alt="Ayarlar"
              width={800}
              height={600}
              className="rounded-lg object-cover w-full h-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Navbar />
      <div className="w-full pt-16">
        <Timeline data={data} />
      </div>
      <Footer />
    </>
  );
}
