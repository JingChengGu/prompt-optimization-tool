import { useState } from 'react'
import { ParsedCategory, ParsedSuggestion } from '../types'
import {
  SELECT_ALL,
  DESELECT_ALL,
  GENERATE_PROMPT_BUTTON,
  APPROVED_COUNT,
  SHOW_MORE,
  SHOW_LESS,
  NO_SUGGESTIONS_APPROVED,
  REVIEW_INSTRUCTION,
} from '../constants/copy'
import { OriginalPromptViewer } from './OriginalPromptViewer'

interface SuggestionReviewProps {
  parsedCategories: ParsedCategory[]
  originalPrompt: string
  workflowCRunning: boolean
  onToggle: (id: string) => void
  onSelectAll: (value: boolean) => void
  onSelectAllCategory: (categoryName: string, value: boolean) => void
  onGenerate: () => void
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}

function ChangeTypePill({ type }: { type: string }) {
  const colors: Record<string, string> = {
    add: 'bg-blue-100 text-blue-700',
    replace: 'bg-amber-100 text-amber-700',
    remove: 'bg-red-100 text-red-600',
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        colors[type] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {type}
    </span>
  )
}

function SuggestionCard({
  suggestion,
  onToggle,
  onViewInPrompt,
}: {
  suggestion: ParsedSuggestion
  onToggle: (id: string) => void
  onViewInPrompt: (section: string) => void
}) {
  const [recExpanded, setRecExpanded] = useState(false)
  const [evExpanded, setEvExpanded] = useState(false)
  const recLines = suggestion.recommendation.split('\n')
  const hasMoreRec = recLines.length > 3
  const truncatedRec = recLines.slice(0, 3).join('\n')

  return (
    <div
      className={`border rounded-lg p-4 bg-white transition-opacity ${
        suggestion.approved ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={suggestion.approved}
          onChange={() => onToggle(suggestion.id)}
          className="mt-1 h-4 w-4 cursor-pointer accent-[#10b981]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                suggestion.confidence === 'high'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {suggestion.confidence}
            </span>
            <ChangeTypePill type={suggestion.changeType} />
          </div>

          <p className="font-semibold text-gray-800 text-sm mb-3">{suggestion.issue}</p>

          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Recommendation</p>
            <pre className="whitespace-pre-wrap font-sans text-xs text-gray-600 leading-relaxed">
              {recExpanded ? suggestion.recommendation : truncatedRec}
            </pre>
            {hasMoreRec && (
              <button
                type="button"
                className="text-[#10b981] text-xs mt-1 hover:underline"
                onClick={() => setRecExpanded((v) => !v)}
              >
                {recExpanded ? SHOW_LESS : SHOW_MORE}
              </button>
            )}
          </div>

          {suggestion.evidence && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Evidence</p>
              <p className="font-mono text-xs bg-gray-50 p-2 rounded text-gray-600 break-words">
                {evExpanded ? suggestion.evidence : suggestion.evidence.slice(0, 150)}
                {suggestion.evidence.length > 150 && (
                  <button
                    type="button"
                    className="text-[#10b981] ml-1 hover:underline"
                    onClick={() => setEvExpanded((v) => !v)}
                  >
                    {evExpanded ? SHOW_LESS : SHOW_MORE}
                  </button>
                )}
              </p>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Original Prompt Reference
            </p>
            {suggestion.existingText ? (
              <div className="border-l-2 border-amber-300 bg-gray-50 px-3 py-2 rounded-r text-xs">
                <p className="text-gray-400 mb-1">Current text being changed:</p>
                <p className="font-mono text-gray-600 break-words">{suggestion.existingText}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                New addition — no existing text being replaced. Will be added to:{' '}
                <span className="font-medium text-gray-500">{suggestion.promptSection || 'prompt'}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {suggestion.promptSection && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                {suggestion.promptSection}
              </span>
            )}
            <button
              type="button"
              className="text-xs text-[#10b981] hover:underline"
              onClick={() => onViewInPrompt(suggestion.promptSection)}
            >
              View in original prompt →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  onToggle,
  onSelectAllCategory,
  onViewInPrompt,
}: {
  category: ParsedCategory
  onToggle: (id: string) => void
  onSelectAllCategory: (name: string, value: boolean) => void
  onViewInPrompt: (section: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#065f46]">{category.displayName}</span>
          <span className="text-xs text-gray-400">
            {category.suggestions.length} suggestion
            {category.suggestions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs text-[#10b981] hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onSelectAllCategory(category.name, true)
            }}
          >
            {SELECT_ALL}
          </button>
          <button
            type="button"
            className="text-xs text-gray-400 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onSelectAllCategory(category.name, false)
            }}
          >
            {DESELECT_ALL}
          </button>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="p-4 bg-[#f0f4f2] flex flex-col gap-3">
          {category.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onToggle={onToggle}
              onViewInPrompt={onViewInPrompt}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SuggestionReview({
  parsedCategories,
  originalPrompt,
  workflowCRunning,
  onToggle,
  onSelectAll,
  onSelectAllCategory,
  onGenerate,
}: SuggestionReviewProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSection, setViewerSection] = useState('')

  const totalSuggestions = parsedCategories.reduce((s, c) => s + c.suggestions.length, 0)
  const approvedCount = parsedCategories.reduce(
    (s, c) => s + c.suggestions.filter((x) => x.approved).length,
    0
  )

  const handleViewInPrompt = (section: string) => {
    setViewerSection(section)
    setViewerOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500 italic">{REVIEW_INSTRUCTION}</p>
        <div className="sticky top-0 z-10 bg-[#f0f4f2] py-3">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-600">
                {totalSuggestions} suggestions across {parsedCategories.length} categories
              </span>
              <button
                type="button"
                className="text-xs text-[#10b981] hover:underline"
                onClick={() => onSelectAll(true)}
              >
                {SELECT_ALL}
              </button>
              <button
                type="button"
                className="text-xs text-gray-400 hover:underline"
                onClick={() => onSelectAll(false)}
              >
                {DESELECT_ALL}
              </button>
              <span className="text-xs text-gray-500">{APPROVED_COUNT(approvedCount)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                className="px-4 py-2 bg-[#10b981] text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#059669] transition-colors flex items-center gap-2"
                disabled={approvedCount === 0 || workflowCRunning}
                onClick={onGenerate}
              >
                {workflowCRunning && <Spinner />}
                {GENERATE_PROMPT_BUTTON}
              </button>
              {approvedCount === 0 && (
                <span className="text-xs text-amber-600">{NO_SUGGESTIONS_APPROVED}</span>
              )}
            </div>
          </div>
        </div>

        {parsedCategories.map((cat) => (
          <CategorySection
            key={cat.name}
            category={cat}
            onToggle={onToggle}
            onSelectAllCategory={onSelectAllCategory}
            onViewInPrompt={handleViewInPrompt}
          />
        ))}
      </div>

      <OriginalPromptViewer
        originalPrompt={originalPrompt}
        targetSection={viewerSection}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  )
}
