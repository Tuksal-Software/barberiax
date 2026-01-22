import Navbar from "@/components/landing/navbar"
import Hero from "@/components/landing/hero"
import HowItWorks from "@/components/landing/how-it-works"
import Pricing from "@/components/landing/pricing"
import CalendarShowcase from "@/components/landing/calendar-showcase"
import Footer from "@/components/landing/footer"

export default function HomePage() {
    return (
        <div className="relative z-10">
            <Navbar />
            <Hero />
            <HowItWorks />
            <Pricing />
            <CalendarShowcase />
            <Footer />
        </div>
    )
}
