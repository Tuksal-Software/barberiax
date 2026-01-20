import Navbar from "@/components/landing/navbar"
import Hero from "@/components/landing/hero"
import HowItWorks from "@/components/landing/how-it-works"
import Pricing from "@/components/landing/pricing"
import CalendarShowcase from "@/components/landing/calendar-showcase"
import Footer from "@/components/landing/footer"

export default function HomePage() {
    return (
        <div className="min-h-screen w-full bg-[#f9fafb] relative">
            {/* Diagonal Fade Center Grid Background */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #d1d5db 1px, transparent 1px),
            linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
          `,
                    backgroundSize: "32px 32px",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)",
                    maskImage:
                        "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)",
                }}
            />
            <div className="relative z-10">
                <Navbar />
                <Hero />
                <HowItWorks />
                <Pricing />
                <CalendarShowcase />
                <Footer />
            </div>
        </div>
    )
}
