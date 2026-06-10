import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatKrw } from '../lib/format.js'

interface Props {
  series: number[]   // monthly after-tax dividend income
  years: number
}

export default function ProjectionChart({ series, years }: Props) {
  const data = series.map((value, i) => ({
    month: i + 1,
    value: Math.round(value),
  }))

  // Show annual ticks (one per year)
  const yearTicks = Array.from({ length: years }, (_, i) => (i + 1) * 12)

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            ticks={yearTicks}
            tickFormatter={(m: number) => `${Math.round(m / 12)}년`}
          />
          <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
          <Tooltip
            formatter={(v) => [typeof v === 'number' ? formatKrw(v) : String(v), '월 배당 (세후)']}
            labelFormatter={(m) => {
              const month = typeof m === 'number' ? m : Number(m)
              return `${Math.ceil(month / 12)}년차 ${((month - 1) % 12) + 1}월`
            }}
          />
          <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#bfdbfe" name="월 배당 (세후)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
