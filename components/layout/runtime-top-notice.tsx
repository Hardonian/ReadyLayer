'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRuntimeUiConfig } from '@/components/providers/runtime-ui-config-provider'

const DISMISS_KEY = 'rl_runtime_top_notice_dismissed_v1'

export function RuntimeTopNotice(): React.JSX.Element | null {
  const runtime = useRuntimeUiConfig()
  const notice = runtime.config.banners.topNotice

  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    // If the notice is disabled or changed to empty, clear dismissal so it can reappear later.
    if (!notice.enabled || !notice.message) {
      try {
        window.localStorage.removeItem(DISMISS_KEY)
      } catch {
        // ignore
      }
      setDismissed(false)
    }
  }, [notice.enabled, notice.message])

  if (!notice.enabled || !notice.message || dismissed) return null

  const variantClass =
    notice.variant === 'success'
      ? 'bg-success-muted text-text border-success/30'
      : notice.variant === 'warning'
        ? 'bg-warning-muted text-text border-warning/30'
        : notice.variant === 'danger'
          ? 'bg-danger-muted text-text border-danger/30'
          : 'bg-info-muted text-text border-info/30'

  return (
    <div className={cn('w-full border-b', variantClass)} role="status" aria-live="polite">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium">{notice.title}</div>
          <div className="text-sm text-text-muted">{notice.message}</div>
        </div>
        {notice.dismissible && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setDismissed(true)
              try {
                window.localStorage.setItem(DISMISS_KEY, '1')
              } catch {
                // ignore
              }
            }}
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
