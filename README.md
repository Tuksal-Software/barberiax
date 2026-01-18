# 💈 Berber Randevu Yönetim Sistemi

Modern, mobil odaklı berber randevu yönetim platformu. Müşteriler kolayca randevu alabilir, işletme sahipleri randevuları yönetebilir ve finansal işlemleri takip edebilir.

## 🎯 Özellikler

### 👤 Müşteri Tarafı
- **Kolay Randevu Alma**: Mobil uyumlu, kullanıcı dostu randevu alma sistemi
- **Berber Seçimi**: Aktif berberleri görüntüleme ve seçme
- **Hizmet Seçimi**: Saç, sakal veya saç+sakal hizmet seçenekleri
- **Tarih ve Saat Seçimi**: 60 günlük takvim ile esnek randevu alma
- **Randevu Yönetimi**: OTP doğrulamalı randevu görüntüleme ve iptal etme
- **Bekleme Listesi**: Randevu açılırsa bildirim alma sistemi
- **Otomatik Müşteri Tanıma**: Telefon numarası ile önceki randevu bilgilerini hatırlama

### 🏢 Admin Panel
- **Randevu Yönetimi**: Randevuları onaylama, reddetme ve tamamlandı olarak işaretleme
- **Berber Yönetimi**: Berber ekleme, düzenleme, silme ve profil fotoğrafı yükleme
- **Çalışma Saatleri**: Haftalık çalışma saatlerini ayarlama ve özel günler için çalışma saati override'ları
- **Manuel Randevu Oluşturma**: Müşteri adına randevu oluşturma
- **Abonelik Yönetimi**: Tekrarlayan randevular için abonelik sistemi (haftalık, iki haftalık, aylık)
- **Finansal Yönetim**:
  - Defter kayıtları (gelir takibi)
  - Gider yönetimi (manuel ve otomatik tekrarlayan giderler)
  - Finansal grafikler ve raporlar
- **Bekleme Listesi**: Müşteri bekleme listesi yönetimi
- **Engellenen Müşteriler**: Problemli müşterileri engelleme sistemi
- **SMS Logları**: Gönderilen SMS'lerin takibi
- **Audit Logs**: Sistemdeki tüm işlemlerin detaylı kaydı
- **Ayarlar**: Uygulama genelinde yapılandırma ayarları

### 🔧 Teknik Özellikler
- **OTP Doğrulama**: SMS ile randevu iptal ve görüntüleme için güvenli doğrulama
- **SMS Entegrasyonu**: Randevu onayı, hatırlatma ve bildirimleri için otomatik SMS gönderimi
- **Otomatik İşlemler**:
  - Geçmiş randevuları otomatik tamamlandı olarak işaretleme
  - Tekrarlayan giderleri otomatik oluşturma
  - Randevu hatırlatmaları gönderme
- **Zaman Yönetimi**: Esnek slot süresi ayarları (varsayılan 30 dakika)
- **Çalışma Saati Override'ları**: Belirli tarihler için çalışma saatlerini değiştirme

## 🚀 Teknoloji Stack'i

### Frontend
- **Next.js 15.5.9** - React framework (App Router)
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component kütüphanesi
- **Framer Motion** - Animasyonlar
- **React Hook Form** - Form yönetimi
- **Zod** - Schema validation
- **date-fns** - Tarih işlemleri
- **Recharts** - Grafik görselleştirme

### Backend
- **Next.js Server Actions** - API endpoint'leri
- **Prisma ORM** - Veritabanı yönetimi
- **MySQL** - Veritabanı
- **bcryptjs** - Şifre hashleme
- **jsonwebtoken** - JWT authentication

### Diğer
- **SMS Provider** - Vatan SMS entegrasyonu (console provider ile test modu)
- **Zod** - Runtime validation
- **Sonner** - Toast bildirimleri

## 📋 Gereksinimler

- Node.js 18+ 
- npm veya yarn
- MySQL veritabanı (geliştirme için SQLite da kullanılabilir)

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarlayın

`.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
JWT_SECRET="your-secret-key"
SMS_API_KEY="your-sms-api-key"
SMS_API_URL="your-sms-api-url"
```

### 3. Veritabanını Hazırlayın

```bash
npx prisma generate
npx prisma db push
```

veya production için:

```bash
npx prisma migrate deploy
```

### 4. Veritabanını Seed Edin (Opsiyonel)

```bash
npm run db:seed
```

### 5. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

## 📜 Kullanılabilir Komutlar

### Geliştirme
```bash
npm run dev              # Geliştirme sunucusunu başlat
npm run build            # Production build oluştur
npm start                # Production sunucusunu başlat
npm run lint             # ESLint ile kod kontrolü
npm run type-check       # TypeScript tip kontrolü
```

### Veritabanı
```bash
npm run db:seed          # Veritabanını seed et
npm run db:studio        # Prisma Studio'yu aç
npm run db:reset         # Veritabanını sıfırla ve seed et
```

### Otomatik İşlemler (Cron Jobs)
```bash
npm run send:appointment-reminders    # Randevu hatırlatmaları gönder
npm run mark:appointments-done        # Geçmiş randevuları tamamlandı olarak işaretle
npm run run:recurring-expenses        # Tekrarlayan giderleri çalıştır
```

### Temizleme
```bash
npm run clean            # Cache dosyalarını temizle
npm run dev:clean        # Cache temizle ve dev başlat
npm run build:clean      # Cache temizle ve build yap
```

## 📁 Proje Yapısı

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin route group
│   │   └── admin/               # Admin panel sayfaları
│   │       ├── randevular/      # Randevu yönetimi
│   │       ├── berberler/       # Berber yönetimi
│   │       ├── working-hours/   # Çalışma saatleri
│   │       ├── abonmanlar/      # Abonelik yönetimi
│   │       ├── giderler/        # Gider yönetimi
│   │       ├── defter/          # Defter (gelir) yönetimi
│   │       └── ...
│   ├── (admin-auth)/            # Admin authentication
│   ├── dashboard/               # Dashboard sayfası
│   ├── page.tsx                 # Ana sayfa (randevu alma)
│   └── layout.tsx               # Root layout
├── components/                   # React bileşenleri
│   ├── ui/                      # shadcn/ui bileşenleri
│   ├── admin/                   # Admin panel bileşenleri
│   └── app/                     # Müşteri uygulaması bileşenleri
├── lib/                         # Utility fonksiyonları
│   ├── actions/                 # Server Actions
│   ├── auth/                    # Authentication helpers
│   ├── sms/                     # SMS servisleri
│   ├── settings/                # Ayarlar yönetimi
│   └── time/                    # Tarih/zaman utilities
├── hooks/                       # Custom React hooks
└── scripts/                     # Otomatik çalışan scriptler
```

## 🗄️ Veritabanı Yapısı

### Ana Modeller

- **Barber** - Berber bilgileri
- **AppointmentRequest** - Randevu talepleri
- **AppointmentSlot** - Randevu slotları
- **WorkingHour** - Haftalık çalışma saatleri
- **WorkingHourOverride** - Özel gün çalışma saatleri
- **Subscription** - Tekrarlayan randevu abonelikleri
- **LedgerEntry** - Defter kayıtları (gelir)
- **Expense** - Gider kayıtları
- **RecurringExpense** - Tekrarlayan giderler
- **AppointmentWaitlist** - Bekleme listesi
- **BannedCustomer** - Engellenen müşteriler
- **SmsLog** - SMS logları
- **AuditLog** - Sistem audit logları

### Tablo İsimlendirme Stratejisi

⚠️ **ÖNEMLİ**: Proje, Prisma model isimlerinde PascalCase (örn: `Barber`, `AppointmentRequest`) kullanırken veritabanı tablo isimlerinde lowercase snake_case (örn: `barbers`, `appointment_requests`) kullanır.

Bu mapping, Prisma schema'daki `@@map` direktifleri ile sağlanır:
- `Barber` model → `barbers` tablosu
- `AppointmentRequest` model → `appointment_requests` tablosu

Sorgular yazarken her zaman Prisma model isimlerini kullanın (örn: `prisma.barber.findMany()`), veritabanı tablo isimlerini değil.

## 🔐 Güvenlik

- Şifreler bcryptjs ile hashlenir
- JWT token tabanlı authentication
- OTP doğrulama ile hassas işlemler korunur
- Rate limiting ile brute force saldırılarına karşı koruma
- Audit logging ile tüm işlemler kayıt altında

## 📱 Mobil Uyumluluk

Uygulama mobil-first yaklaşımı ile geliştirilmiştir. Tüm özellikler mobil cihazlarda mükemmel çalışır:
- Responsive tasarım
- Dokunmatik ekran optimizasyonu
- Mobil navigasyon
- Hızlı yükleme süreleri

## 🎨 UI/UX Özellikleri

- Modern ve temiz arayüz
- Smooth animasyonlar (Framer Motion)
- Toast bildirimleri (Sonner)
- Loading states ve skeleton screens
- Hata yönetimi ve kullanıcı geri bildirimleri
- Dark mode desteği (shadcn/ui)

## 📊 Özellikler Detayı

### Randevu Sistemi
1. Müşteri berber seçer
2. İsteğe bağlı olarak hizmet tipi seçer (açıksa)
3. Tarih ve saat seçer
4. İletişim bilgilerini girer
5. Randevu talebi oluşturulur (pending durumunda)
6. Admin onaylar veya reddeder
7. Onaylanan randevular SMS ile bildirilir

### Abonelik Sistemi
- Haftalık, iki haftalık veya aylık tekrarlayan randevular
- Otomatik randevu oluşturma
- Abonelik iptal ve yönetim

### Finansal Yönetim
- Gelir takibi (defter kayıtları)
- Gider yönetimi
- Tekrarlayan giderler (kira, elektrik, su vb.)
- Finansal raporlar ve grafikler

## 🚀 Production Deployment

### Veritabanı Migrasyonları

Bu proje, MySQL kullanıcısının shadow database oluşturma izni olmadığı için baseline migration yaklaşımı kullanır.

**⚠️ UYARI**: Production'da asla `prisma migrate dev` çalıştırmayın. Bunun yerine `prisma migrate deploy` kullanın.

### Deployment Adımları

1. **Prisma Client oluştur**:
```bash
npx prisma generate
```

2. **Migrasyonları deploy et**:
```bash
npx prisma migrate deploy
```

3. **Uygulamayı build et**:
```bash
npm run build
```

4. **Production sunucusunu başlat**:
```bash
npm start
```

### Otomatik İşlemler (Cron Jobs)

Production ortamında aşağıdaki scriptleri düzenli olarak çalıştırın:

```bash
# Randevu hatırlatmaları (günlük, randevudan 24 saat önce)
npm run send:appointment-reminders

# Geçmiş randevuları tamamlandı olarak işaretle (günlük)
npm run mark:appointments-done

# Tekrarlayan giderleri çalıştır (günlük)
npm run run:recurring-expenses
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje özel bir projedir.

## 📞 İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!