"use client"

import { PricingTableFive } from "@/components/billingsdk/pricing-table-five"
import { plans } from "@/lib/billingsdk-config"

export default function Pricing() {
  return (
    <section className="py-10 md:py-14" id="fiyatlandirma">
      <div className="container max-w-7xl mx-auto px-4">
        <PricingTableFive
          plans={plans}
          theme="classic"
          onPlanSelect={(planId: string) => console.log("Selected plan:", planId)}
          title="Şeffaf Fiyatlandırma"
          description="Size en uygun paketi seçin ve hemen başlayın"
        />
      </div>
    </section>
  )
}