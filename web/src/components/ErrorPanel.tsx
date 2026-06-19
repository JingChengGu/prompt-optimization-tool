import { useState } from 'react'
import { RETRY_BUTTON } from '../constants/copy'

interface ErrorPanelProps {
  message: string
  detail?: string
  onRetry?: () => void
}

export function ErrorPanel({ message, detail, onRetry }: ErrorPanelProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-red-300 bg-red-50 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-red-600 text-lg">⚠</span>
        <div className="flex-1">
          <p className="text-red-700 font-medium">{message}</p>
          {detail && (
            <div className="mt-2">
              <button
                type="button"
                className="text-red-500 text-xs underline"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Hide details' : 'Show details'}
              </button>
              {expanded && (
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32 text-red-800">
                  {detail}
                </pre>
              )}
            </div>
          )}
          {onRetry && (
            <button
              type="button"
              className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              onClick={onRetry}
            >
              {RETRY_BUTTON}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
