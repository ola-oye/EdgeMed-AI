/**
 * VitalChart.jsx
 * ──────────────
 * Continuous scrolling line chart — bedside monitor style.
 * Fixed time window: 30 min / 60 min / 3 hr.
 * Readings scroll left as time passes.
 */

import { useColors } from '../../hooks/useTheme.jsx'
import { useMemo, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
)

const TICK_COUNT = 7

export default function VitalChart({
  label,
  unit,
  readings = [],
  rangeLow,
  rangeHigh,
  timeWindow = 60,
  currentValue
}) {
  const C = useColors()
  const chartRef = useRef(null)

  const chartData = useMemo(() => {
    // Compute now INSIDE the memo so it is consistent
    const now       = Date.now()
    const windowMs  = timeWindow * 60 * 1000
    const cutoff    = now - windowMs

    // Filter readings to selected window only
    const inWindow = readings
      .filter(r => {
        const t = new Date(r.read_at).getTime()
        return t >= cutoff && t <= now + 5000   // small buffer for clock skew
      })
      .sort((a, b) => new Date(a.read_at) - new Date(b.read_at))

    // Build fixed axis labels spanning the full window
    const axisLabels = Array.from({ length: TICK_COUNT }, (_, i) => {
      const t = new Date(cutoff + (i / (TICK_COUNT - 1)) * windowMs)
      return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })

    // Map each reading to the nearest axis slot
    const slotMs     = windowMs / (TICK_COUNT - 1)
    const lineValues = Array(TICK_COUNT).fill(null)
    const pointCols  = Array(TICK_COUNT).fill('transparent')

    inWindow.forEach(r => {
      const offset  = new Date(r.read_at).getTime() - cutoff
      const rawSlot = offset / slotMs
      const slot    = Math.max(0, Math.min(TICK_COUNT - 1, Math.round(rawSlot)))

      // Only overwrite if slot is empty or this reading is more recent
      if (lineValues[slot] === null) {
        lineValues[slot] = r.value
        const bad = (rangeLow != null && r.value < rangeLow) ||
                    (rangeHigh != null && r.value > rangeHigh)
        pointCols[slot] = bad ? C.criticalPure : null  // null = inherit line color
      }
    })

    return { axisLabels, lineValues, pointCols, inWindow }
  }, [readings, timeWindow, rangeLow, rangeHigh])

  const { axisLabels, lineValues, pointCols } = chartData

  const status    = getStatus(currentValue, rangeLow, rangeHigh)
  const lineColor = status === 'red'   ? C.criticalPure
                  : status === 'amber' ? C.warningPure
                  : C.aiVivid

  // Resolve point colors — null inherits line color
  const resolvedPointCols = pointCols.map(c => c === null ? lineColor : c)

  const data = {
    labels: axisLabels,
    datasets: [
      // Normal range band — upper fill
      {
        label:           '_upper',
        data:            axisLabels.map(() => rangeHigh),
        borderColor:     'transparent',
        backgroundColor: 'rgba(46,125,50,0.07)',
        fill:            '+1',
        pointRadius:     0,
        tension:         0,
        order:           3
      },
      // Normal range band — lower dashed line
      {
        label:           '_lower',
        data:            axisLabels.map(() => rangeLow),
        borderColor:     'rgba(46,125,50,0.18)',
        borderWidth:     1,
        borderDash:      [4, 3],
        backgroundColor: 'transparent',
        fill:            false,
        pointRadius:     0,
        tension:         0,
        order:           3
      },
      // Readings line
      {
        label:                label,
        data:                 lineValues,
        borderColor:          lineColor,
        backgroundColor:      'transparent',
        borderWidth:          2,
        pointRadius:          lineValues.map(v => v != null ? 3 : 0),
        pointBackgroundColor: resolvedPointCols,
        pointBorderColor:     resolvedPointCols,
        pointBorderWidth:     0,
        tension:              0.35,
        fill:                 false,
        spanGaps:             true,
        order:                1
      }
    ]
  }

  const valueColor = status === 'red' ? C.criticalText : status === 'amber' ? C.warningText : C.textPrimary

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    animation:           false,
    interaction:         { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor:     C.borderDefault,
        borderWidth:     1,
        titleColor:      C.textMuted,
        bodyColor:       C.textPrimary,
        titleFont:       { family:"'IBM Plex Sans', sans-serif", size: 10 },
        bodyFont:        { family:"'Manrope', sans-serif", size: 13, weight: '700' },
        padding:         8,
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label?.startsWith('_')) return null
            return `${ctx.dataset.label}: ${fmt(ctx.parsed.y)} ${unit}`
          }
        },
        filter: item => !item.dataset.label?.startsWith('_')
      }
    },
    scales: {
      x: {
        grid:   { color: C.bgTertiary, drawBorder: false },
        ticks:  {
          color:         C.textFaint,
          font:          { family: "'IBM Plex Sans', sans-serif", size: 9 },
          maxTicksLimit: TICK_COUNT,
          maxRotation:   0
        },
        border: { display: false }
      },
      y: {
        grid:   { color: C.bgTertiary, drawBorder: false },
        ticks:  {
          color:         C.textFaint,
          font:          { family: "'IBM Plex Sans', sans-serif", size: 9 },
          maxTicksLimit: 5
        },
        border:       { display: false },
        suggestedMin: rangeLow  ? rangeLow  * 0.90 : undefined,
        suggestedMax: rangeHigh ? rangeHigh * 1.10 : undefined
      }
    }
  }

  return (
    <div style={{
      background:    C.textInverse,
      border:        '1px solid #EBEBEB',
      borderRadius:  '10px',
      padding:       '12px 14px',
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '11px', fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '18px', fontWeight: '800', color: valueColor, letterSpacing: '-0.3px' }}>
          {currentValue != null ? fmt(currentValue) : '—'}
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '10px', fontWeight: '500', color: C.textFaint, marginLeft: '2px' }}>{unit}</span>
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: '110px', position: 'relative' }}>
        {chartData.inWindow.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '11px', color: C.borderStrong }}>
              No readings in this window
            </span>
          </div>
        ) : (
          <Line ref={chartRef} data={data} options={options} />
        )}
      </div>

      {/* Range legend */}
      {rangeLow != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', background: 'rgba(46,125,50,0.10)', border: '1px solid rgba(46,125,50,0.22)', borderRadius: '2px', flexShrink: 0 }} />
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '10px', color: C.textFaint }}>
            Normal: {rangeLow}–{rangeHigh} {unit}
          </span>
        </div>
      )}
    </div>
  )
}

function getStatus(value, lo, hi) {
  if (value == null || lo == null || hi == null) return 'normal'
  if (value < lo || value > hi) {
    return (value < lo ? (lo - value) / lo : (value - hi) / hi) > 0.06 ? 'red' : 'amber'
  }
  return 'normal'
}

function fmt(v) {
  if (v == null) return '—'
  return Number.isInteger(v) ? v : parseFloat(Number(v).toFixed(1))
}
