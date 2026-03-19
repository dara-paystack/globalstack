import { formatTime } from '../../lib/format'

// Timeline — vertical stepper for transaction detail panels.
// Each step has a label and a time. The last step in a completed flow
// gets a filled dot; earlier steps get empty dots.

export function Timeline({ events }) {
  if (!events?.length) return null

  return (
    <ol className="relative space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1
        return (
          <li key={i} className="relative flex gap-4 pb-4 last:pb-0">
            {/* Vertical line connecting steps */}
            {!isLast && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border-primary-light" />
            )}

            {/* Dot */}
            <div className="mt-0.5 shrink-0">
              <div
                className={[
                  'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                  isLast
                    ? 'border-action-primary-main bg-action-primary-main'
                    : 'border-border-primary-main bg-surface-primary',
                ].join(' ')}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-content-primary">
                {event.label}
              </span>
              <span className="ml-2 text-sm text-content-tertiary">
                {formatTime(event.time)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
