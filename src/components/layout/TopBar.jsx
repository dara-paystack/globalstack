import { useMode } from '../../context/ModeContext'

export function TopBar() {
  const { mode, setMode, isTestMode } = useMode()

  function toggle() {
    setMode(isTestMode ? 'live' : 'test')
  }

  return (
    <div>
      {/* Main topbar row */}
      <div className="h-14 bg-surface-primary border-b border-border-primary-light flex items-center justify-end px-6">
        {/* Test/Live pill toggle */}
        <button
          onClick={toggle}
          aria-label={`Switch to ${isTestMode ? 'live' : 'test'} mode`}
          className={[
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer',
            isTestMode
              ? 'border-feedback-warning-border bg-feedback-warning-light text-feedback-warning-dark'
              : 'border-border-primary-light bg-surface-secondary text-content-secondary hover:bg-surface-tertiary',
          ].join(' ')}
        >
          {/* Indicator dot */}
          <span
            className={[
              'w-1.5 h-1.5 rounded-full',
              isTestMode ? 'bg-feedback-warning-main' : 'bg-feedback-success-main',
            ].join(' ')}
          />
          {isTestMode ? 'Test' : 'Live'}
        </button>
      </div>

      {/* Test mode amber banner */}
      {isTestMode && (
        <div className="bg-feedback-warning-light border-b border-feedback-warning-border px-6 py-2 text-sm text-feedback-warning-dark">
          You&apos;re viewing test data. No real transactions will be affected.
        </div>
      )}
    </div>
  )
}
