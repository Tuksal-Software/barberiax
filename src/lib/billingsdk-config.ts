export interface Plan {
  id: string;
  title: string;
  description: string;
  highlight?: boolean;
  type?: "monthly" | "yearly";
  currency?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  buttonText: string;
  badge?: string;
  features: {
    name: string;
    icon: string;
    iconColor?: string;
  }[];
}

export interface CurrentPlan {
  plan: Plan;
  type: "monthly" | "yearly" | "custom";
  price?: string;
  nextBillingDate: string;
  paymentMethod: string;
  status: "active" | "inactive" | "past_due" | "cancelled";
}

export const plans: Plan[] = [
  {
    id: "temel",
    title: "Temel Paket",
    description: "",
    currency: "₺",
    monthlyPrice: "999",
    yearlyPrice: "9990",
    buttonText: "Hemen Başla",
    badge: "Popüler",
    highlight: true,
    features: [
      {
        name: "Sınırsız Randevu Yönetimi",
        icon: "check",
        iconColor: "text-emerald-500",
      },
      {
        name: "SMS Hatırlatma Sistemi",
        icon: "check",
        iconColor: "text-blue-500",
      },
      {
        name: "Mobil Uyumlu Randevu Ekranı",
        icon: "check",
        iconColor: "text-purple-500",
      },
      {
        name: "Gelir ve Gider Takibi",
        icon: "check",
        iconColor: "text-amber-500",
      },
      {
        name: "Detaylı Raporlama",
        icon: "check",
        iconColor: "text-rose-500",
      },
      {
        name: "Çoklu Berber Yönetimi",
        icon: "check",
        iconColor: "text-teal-500",
      },
      {
        name: "Özel Domain Desteği",
        icon: "x",
        iconColor: "text-slate-400",
      },
    ],
  },
  {
    id: "profesyonel",
    title: "Profesyonel Paket",
    description: "+ Özel Tasarım Masrafı",
    currency: "₺",
    monthlyPrice: "999",
    yearlyPrice: "9990",
    buttonText: "İletişime Geçin",
    features: [
      {
        name: "Sınırsız Randevu Yönetimi",
        icon: "check",
        iconColor: "text-emerald-500",
      },
      {
        name: "SMS Hatırlatma Sistemi",
        icon: "check",
        iconColor: "text-blue-500",
      },
      {
        name: "Mobil Uyumlu Randevu Ekranı",
        icon: "check",
        iconColor: "text-purple-500",
      },
      {
        name: "Gelir ve Gider Takibi",
        icon: "check",
        iconColor: "text-amber-500",
      },
      {
        name: "Detaylı Raporlama",
        icon: "check",
        iconColor: "text-rose-500",
      },
      {
        name: "Çoklu Berber Yönetimi",
        icon: "check",
        iconColor: "text-teal-500",
      },
      {
        name: "Özel Domain Desteği",
        icon: "check",
        iconColor: "text-amber-600",
      },
      {
        name: "Kişiye Özel Tasarım",
        icon: "check",
        iconColor: "text-blue-600",
      },
    ],
  },
  {
    id: "kurumsal",
    title: "Kurumsal Çözüm",
    description: "Büyük işletmeler ve zincir salonlar için özel çözümler",
    currency: "₺",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    buttonText: "İletişime Geçin",
    features: [
      {
        name: "Profesyonel Paketin Tümü",
        icon: "check",
        iconColor: "text-emerald-500",
      },
      {
        name: "Çoklu Şube Yönetimi",
        icon: "check",
        iconColor: "text-blue-500",
      },
      {
        name: "Özel Modül Geliştirme",
        icon: "check",
        iconColor: "text-purple-500",
      },
      {
        name: "Beyaz Etiket Çözümü",
        icon: "check",
        iconColor: "text-amber-500",
      },
      {
        name: "7/24 Teknik Destek",
        icon: "check",
        iconColor: "text-rose-500",
      },
    ],
  },
];
