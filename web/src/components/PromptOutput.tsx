import { Fragment, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  COPY_BUTTON,
  COPIED_BUTTON,
  START_NEW_RUN_BUTTON,
  PREVIEW_TAB,
  DIFF_TAB,
  EDIT_TAB,
  STATS_BAR,
  BACK_TO_SUGGESTIONS,
  RESET_TO_AI,
} from '../constants/copy'
import { DiffChunk, OutputMode } from '../types'

interface PromptOutputProps {
  originalPrompt: string
  optimizedPrompt: string
  diffChunks: DiffChunk[]
  hasManualEdits: boolean
  onChunkToggle: (ids: string[], accepted: boolean) => void
  onManualEdit: (text: string) => void
  onResetToAI: () => void
  onBack: () => void
  onReset: () => void
}

function formatDate(): string {
  return new Date().toISOString().slice(0, 10)
}

const markdownComponents = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-[#065f46] font-bold text-2xl mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[#065f46] font-bold text-xl mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[#047857] font-semibold text-lg mt-3 mb-1">{children}</h3>
  ),
  hr: () => <hr className="border-[#d1fae5] my-4" />,
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-[#f4f7f5] rounded px-1 py-0.5 text-xs font-mono">{children}</code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-[#f4f7f5] rounded-lg p-4 overflow-x-auto text-xs">{children}</pre>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="bg-[#d1fae5] px-3 py-2 text-left font-semibold text-[#065f46] text-xs">
      {children}
    </th>
  ),
}

// ─── side-by-side diff ──────────────────────────────────────────────────────

type GroupedRow =
  | { type: 'unchanged'; id: string; text: string }
  | { type: 'changed'; removedChunk: DiffChunk | null; addedChunk: DiffChunk | null }

function groupChunks(chunks: DiffChunk[]): GroupedRow[] {
  const rows: GroupedRow[] = []
  let i = 0
  while (i < chunks.length) {
    const chunk = chunks[i]
    if (chunk.type === 'unchanged') {
      rows.push({ type: 'unchanged', id: chunk.id, text: chunk.newText })
      i++
    } else if (chunk.type === 'removed') {
      if (i + 1 < chunks.length && chunks[i + 1].type === 'added') {
        rows.push({ type: 'changed', removedChunk: chunks[i], addedChunk: chunks[i + 1] })
        i += 2
      } else {
        rows.push({ type: 'changed', removedChunk: chunks[i], addedChunk: null })
        i++
      }
    } else {
      rows.push({ type: 'changed', removedChunk: null, addedChunk: chunks[i] })
      i++
    }
  }
  return rows
}

function rowAccepted(row: GroupedRow & { type: 'changed' }): boolean {
  if (row.addedChunk) return row.addedChunk.accepted
  if (row.removedChunk) return row.removedChunk.accepted
  return true
}

function rowIds(row: GroupedRow & { type: 'changed' }): string[] {
  return [row.removedChunk?.id, row.addedChunk?.id].filter(Boolean) as string[]
}

function SideBySideDiff({
  chunks,
  onToggle,
}: {
  chunks: DiffChunk[]
  onToggle: (ids: string[], accepted: boolean) => void
}) {
  const rows = groupChunks(chunks)
  const changedRows = rows.filter((r): r is GroupedRow & { type: 'changed' } => r.type === 'changed')
  const acceptedCount = changedRows.filter(rowAccepted).length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        {acceptedCount} of {changedRows.length} changes accepted · hover a change to accept or reject it
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* column headers */}
        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
            Original
          </div>
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Optimized
          </div>
        </div>

        {/* diff rows */}
        <div className="grid grid-cols-2 divide-y divide-gray-100">
          {rows.map((row, i) => {
            if (row.type === 'unchanged') {
              const cell = (
                <div className="font-mono text-xs text-gray-600 whitespace-pre-wrap px-4 py-1 leading-relaxed">
                  {row.text}
                </div>
              )
              return (
                <Fragment key={row.id}>
                  <div className="border-r border-gray-100">{cell}</div>
                  {cell}
                </Fragment>
              )
            }

            // changed row
            const accepted = rowAccepted(row)
            const ids = rowIds(row)

            // left column: original text
            const leftText = row.removedChunk?.originalText ?? ''
            const leftStyle = row.removedChunk
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-50 text-gray-400'

            // right column: content depends on accepted state
            let rightText = ''
            let rightStyle = ''
            if (row.addedChunk && row.removedChunk) {
              // replacement
              rightText = accepted ? row.addedChunk.newText : row.removedChunk.originalText
              rightStyle = accepted ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-600'
            } else if (row.addedChunk) {
              // pure addition
              rightText = accepted ? row.addedChunk.newText : ''
              rightStyle = accepted ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-400'
            } else if (row.removedChunk) {
              // pure deletion
              rightText = accepted ? '' : row.removedChunk.originalText
              rightStyle = accepted ? 'bg-red-50 text-red-300' : 'bg-gray-50 text-gray-600'
            }

            const borderColor = accepted ? 'border-l-2 border-emerald-400' : 'border-l-2 border-red-300'

            return (
              <Fragment key={i}>
                {/* left: read-only original */}
                <div
                  className={`font-mono text-xs whitespace-pre-wrap px-4 py-1 leading-relaxed border-r border-gray-100 ${leftStyle}`}
                >
                  {leftText || ' '}
                </div>

                {/* right: working optimized + hover controls */}
                <div className={`group relative font-mono text-xs whitespace-pre-wrap px-4 py-1 pr-16 leading-relaxed ${rightStyle} ${borderColor}`}>
                  {rightText || ' '}

                  {/* accept/reject buttons — always in DOM, low opacity until hover */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Accept this change"
                      onClick={() => onToggle(ids, true)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        accepted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-400 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-600'
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      title="Reject this change"
                      onClick={() => onToggle(ids, false)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        !accepted
                          ? 'bg-red-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:border-red-400 hover:text-red-500'
                      }`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export function PromptOutput({
  originalPrompt,
  optimizedPrompt,
  diffChunks,
  hasManualEdits,
  onChunkToggle,
  onManualEdit,
  onResetToAI,
  onBack,
  onReset,
}: PromptOutputProps) {
  const [tab, setTab] = useState<OutputMode>('preview')
  const [copied, setCopied] = useState(false)

  const origChars = originalPrompt.length
  const optChars = optimizedPrompt.length
  const pctRaw =
    origChars > 0 ? (((optChars - origChars) / origChars) * 100).toFixed(1) : '0.0'
  const pctStr = (optChars >= origChars ? '+' : '') + pctRaw + '%'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimizedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([optimizedPrompt], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt_optimized_${formatDate()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleResetToAI = () => {
    if (
      window.confirm(
        'This will discard your manual edits and restore the AI-generated version. Continue?'
      )
    ) {
      onResetToAI()
    }
  }

  const today = formatDate()
  const tabs: { key: OutputMode; label: string }[] = [
    { key: 'preview', label: PREVIEW_TAB },
    { key: 'diff', label: DIFF_TAB },
    { key: 'edit', label: EDIT_TAB },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-600">
        {STATS_BAR(origChars, optChars, pctStr)}
      </div>

      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key
                ? 'bg-[#065f46] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px] overflow-auto">
        {tab === 'preview' && (
          <div className="prose max-w-none text-sm">
            <ReactMarkdown components={markdownComponents}>{optimizedPrompt}</ReactMarkdown>
          </div>
        )}

        {tab === 'diff' && (
          diffChunks.length === 0 ? (
            <p className="text-gray-400 text-sm">No changes detected.</p>
          ) : (
            <SideBySideDiff chunks={diffChunks} onToggle={onChunkToggle} />
          )
        )}

        {tab === 'edit' && (
          <div className="flex flex-col gap-3">
            {hasManualEdits && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-600">Manual edits applied</span>
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                  onClick={handleResetToAI}
                >
                  {RESET_TO_AI}
                </button>
              </div>
            )}
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-[#10b981] min-h-[500px]"
              value={optimizedPrompt}
              onChange={(e) => onManualEdit(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm flex-wrap">
        <button
          type="button"
          className="px-4 py-2 bg-[#10b981] text-white text-sm font-semibold rounded-lg hover:bg-[#059669] transition-colors"
          onClick={handleDownload}
        >
          Download prompt_optimized_{today}.md
        </button>
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          onClick={handleCopy}
        >
          {copied ? COPIED_BUTTON : COPY_BUTTON}
        </button>
        <button
          type="button"
          className="px-4 py-2 border border-[#10b981] text-[#10b981] text-sm rounded-lg hover:bg-[#f0fdf4] transition-colors"
          onClick={onBack}
        >
          {BACK_TO_SUGGESTIONS}
        </button>
        <button
          type="button"
          className="ml-auto text-gray-500 text-sm hover:text-gray-700"
          onClick={onReset}
        >
          {START_NEW_RUN_BUTTON}
        </button>
      </div>
    </div>
  )
}
