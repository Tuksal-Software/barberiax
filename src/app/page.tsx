import Navbar from "@/components/landing/navbar"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-center">
            Modern Berber Yönetim Sistemi
          </h1>
          <p className="text-center text-muted-foreground mt-4">
            Randevularınızı kolayca yönetin, işinizi büyütün
          </p>
        </section>
      </main>
    </div>
  )
}
