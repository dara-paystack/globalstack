import { useId } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

// Sparkline — a minimal Recharts AreaChart for at-a-glance trend visualization.
// Using Recharts (not Pax) because Pax doesn't have a chart component.
// Recharts is our single charting dependency — don't reach for D3 or chart.js.

// Default color uses deep-sky-600 hex (#009EFF) — Recharts can't consume CSS variables
// directly, so we use the resolved primitive value here.

// Custom tooltip: rounded pill with date on top, colored dot + label + value below.
// Matches the reference style from the Navattic-type chart tooltips.
function SparkTooltip({ active, payload, label, color, labelKey, dataKey }) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const displayLabel = entry.payload[labelKey] ?? label
  const value = entry.value

  return (
    <div className="bg-surface-primary border border-border-primary-light rounded-2xl px-4 py-2.5 shadow-sm">
      <div className="text-sm font-medium text-content-primary mb-1">
        {displayLabel}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-content-tertiary">USDC</span>
        <span className="text-xs font-medium text-content-primary tabular-nums ml-auto">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
    </div>
  )
}

export function Sparkline({
  data,
  dataKey = 'value',
  labelKey = 'day',
  color = '#009EFF',
  height = 56,
}) {
  // Unique gradient ID per instance — prevents SVG <defs> collisions
  // when multiple sparklines render on the same page.
  const gradientId = `spark-${useId().replace(/:/g, '')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: -4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<SparkTooltip color={color} labelKey={labelKey} dataKey={dataKey} />}
          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
