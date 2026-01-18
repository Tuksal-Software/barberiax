"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import { useIsMobile } from "@/hooks/use-mobile"
import { BarChart3, TrendingUp } from "lucide-react"
import type { WeeklyAppointmentData } from "@/lib/actions/stats.actions"

interface WeeklyAppointmentsChartProps {
  data: WeeklyAppointmentData[]
}

const chartConfig = {
  count: {
    label: "Randevu Sayısı",
    color: "#3b82f6",
  },
} satisfies ChartConfig

export function WeeklyAppointmentsChart({ data }: WeeklyAppointmentsChartProps) {
  const isMobile = useIsMobile()
  
  const total = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.count, 0),
    [data]
  )

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-slate-200 pb-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              Haftalık Randevular
            </CardTitle>
            <CardDescription className="text-slate-600">
              Bu hafta günlük randevu sayısı
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{total}</div>
            <div className="text-xs text-slate-600 flex items-center gap-1 justify-end">
              <TrendingUp className="h-3 w-3" />
              Bu hafta
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full sm:h-[300px]"
        >
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: isMobile ? 5 : 10,
              left: isMobile ? -10 : 0,
              bottom: isMobile ? 5 : 0,
            }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              vertical={false} 
              strokeDasharray="3 3" 
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => isMobile ? value.substring(0, 3) : value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={isMobile ? 30 : 40}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ 
                fill: 'transparent',
                stroke: '#3b82f6', 
                strokeWidth: 2,
                strokeDasharray: '5 5',
                opacity: 0.3
              }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                
                const data = payload[0]
                const dayData = payload[0].payload as WeeklyAppointmentData
                
                const formatDate = (dateStr: string) => {
                  const parts = dateStr.split('-')
                  if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`
                  }
                  return dateStr
                }
                
                return (
                  <div className="bg-white border-2 border-slate-200 shadow-lg rounded-lg p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {dayData.dayLabel} - {formatDate(dayData.day)}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs text-slate-600">Randevu Sayısı:</span>
                        <span className="text-sm font-bold text-blue-600">{data.value}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="count"
              fill="url(#colorCount)"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
              background={{ fill: 'transparent' }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}