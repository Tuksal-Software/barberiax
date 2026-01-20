import Navbar from "@/components/landing/navbar"
import Hero from "@/components/landing/hero"
import HowItWorks from "@/components/landing/how-it-works"
import Pricing from "@/components/landing/pricing"
import CalendarShowcase from "@/components/landing/calendar-showcase"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <CalendarShowcase />
    </div>
  )
}
