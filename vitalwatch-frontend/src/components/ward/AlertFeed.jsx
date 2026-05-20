/**
 * components/ward/AlertFeed.jsx
 * ──────────────────────────────
 * Right column of the ward overview.
 * Shows live unacknowledged and acknowledged alerts.
 *
 * Props:
 *  unacknowledged — array of unacked alert objects
 *  acknowledged   — array of acked/escalated alert objects
 *  count          — total unacknowledged count
 *  filter         — 'all' | 'critical'
 *  onFilterChange — (filter) => void
 *  onAcknowledge  — (alertId, userId) => void
 *  onEscalate     — (alertId, userId) => void
 *  loading        — bool
 */

import { useColors } from '../../hooks/useTheme.jsx'
import { useRef, useEffect } from 'react'
import AlertCard from './AlertCard.jsx'

export default function AlertFeed({
  unacknowledged = [],
  acknowledged   = [],
  count          = 0,
  filter         = 'all',
  onFilterChange,
  onAcknowledge,
  onEscalate,
  loading        = false
}) {
  const C = useColors()
  const prevIds     = useRef(new Set())
  const newAlertIds = useRef(new Set())

  // Track which alert IDs are truly new this render
  useEffect(() => {
    const currentIds = new Set([...unacknowledged, ...acknowledged].map(a => a.id))
    const fresh = new Set()
    currentIds.forEach(id => {
      if (!prevIds.current.has(id)) fresh.add(id)
    })
    newAlertIds.current = fresh
    prevIds.current     = currentIds
  })

  const visibleUnacked = filter === 'critical'
    ? unacknowledged.filter(a => a.severity === 'critical')
    : unacknowledged

  const visibleAcked = filter === 'critical'
    ? acknowledged.filter(a => a.severity === 'critical')
    : acknowledged

  const allClear = visibleUnacked.length === 0

  return (
    <div className="af-wrap">

      {/* Header */}
      <div className="af-header">
        <div className="af-title-row">
          <span className="af-title">
            Alerts
            {count > 0 && (
              <span className="af-count-badge">{count > 99 ? '99+' : count}</span>
            )}
          </span>
          <div className="af-filters">
            <button
              className={`af-filter ${filter === 'all' ? 'af-filter-active' : ''}`}
              onClick={() => onFilterChange?.('all')}
            >
              All
            </button>
            <button
              className={`af-filter ${filter === 'critical' ? 'af-filter-active' : ''}`}
              onClick={() => onFilterChange?.('critical')}
            >
              Critical
            </button>
          </div>
        </div>
      </div>

      {/* Feed list */}
      <div className="af-list">

        {/* All clear state */}
        {allClear && !loading && (
          <div className="af-all-clear">
            <span className="af-all-clear-icon">✓</span>
            <span>All alerts acknowledged</span>
          </div>
        )}

        {/* Unacknowledged section */}
        {visibleUnacked.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            isNew={newAlertIds.current.has(alert.id)}
            onAcknowledge={onAcknowledge}
            onEscalate={onEscalate}
          />
        ))}

        {/* Divider between sections */}
        {visibleUnacked.length > 0 && visibleAcked.length > 0 && (
          <div className="af-divider">
            <span>Acknowledged</span>
          </div>
        )}

        {/* Acknowledged / escalated section */}
        {visibleAcked.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            isNew={false}
            onAcknowledge={onAcknowledge}
            onEscalate={onEscalate}
          />
        ))}

        {/* Empty state when filter returns nothing */}
        {visibleUnacked.length === 0 && visibleAcked.length === 0 && !loading && count === 0 && (
          <div className="af-empty">
            <p className="af-empty-title">No alerts</p>
            <p className="af-empty-sub">All patients are stable</p>
          </div>
        )}
      </div>

      <style>{`
        .af-wrap {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: #FFFFFF;
          font-family: 'Inter', sans-serif;
        }

        /* Header */
        .af-header {
          padding: 16px 16px 12px;
          border-bottom: 1px solid #EBEBEB;
          flex-shrink: 0;
        }
        .af-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .af-title {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .af-count-badge {
          background: #DC2626;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        /* Filters */
        .af-filters { display: flex; gap: 4px; }
        .af-filter {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid #EBEBEB;
          background: transparent;
          font-size: 12px;
          font-weight: 500;
          color: #666666;
          cursor: pointer;
          transition: all 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .af-filter:hover { background: #F4F4F4; }
        .af-filter-active {
          background: #111111;
          color: #FFFFFF;
          border-color: #111111;
        }

        /* List */
        .af-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .af-list::-webkit-scrollbar       { width: 4px; }
        .af-list::-webkit-scrollbar-track { background: transparent; }
        .af-list::-webkit-scrollbar-thumb { background: #DDDDDD; border-radius: 2px; }

        /* All clear */
        .af-all-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 8px;
          color: #15803D;
          font-size: 13px;
          font-weight: 500;
        }
        .af-all-clear-icon {
          width: 20px;
          height: 20px;
          background: #16A34A;
          color: #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Section divider */
        .af-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 0;
          font-size: 11px;
          color: #AAAAAA;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        .af-divider::before,
        .af-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #F0F0F0;
        }

        /* Empty state */
        .af-empty {
          text-align: center;
          padding: 40px 16px;
        }
        .af-empty-title {
          font-size: 14px;
          font-weight: 500;
          color: #555555;
          margin: 0 0 4px;
        }
        .af-empty-sub {
          font-size: 12.5px;
          color: #AAAAAA;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
