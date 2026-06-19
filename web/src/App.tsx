import { useRef, useState, useCallback } from 'react'
import { AppState, AppStep, Batch, DiffChunk, Transcript } from './types'
import { batchTranscripts, formatBatch } from './lib/batchTranscripts'
import { callDify, extractStringOutput } from './lib/difyClient'
import { parseSuggestions } from './lib/parseSuggestions'
import { reconstructApprovedSuggestions } from './lib/reconstructSuggestions'
import { computeDiffChunks, reconstructPromptFromChunks } from './lib/computeDiffChunks'
import { Stepper } from './components/Stepper'
import { UploadZone } from './components/UploadZone'
import { PromptInput } from './components/PromptInput'
import { AnalysisProgress } from './components/AnalysisProgress'
import { SuggestionReview } from './components/SuggestionReview'
import { PromptOutput } from './components/PromptOutput'
import { ErrorPanel } from './components/ErrorPanel'

const RETRY_DELAY_MS = 3000
const STEP_ORDER: AppStep[] = ['upload', 'analyzing', 'review', 'output']

function stripJsonFences(s: string): string {
  return s
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function parseSuggestionsArray(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(stripJsonFences(raw))
    if (Array.isArray(parsed)) return parsed
  } catch {
    // fall through to fallback
  }
  return [
    {
      category: 'other',
      issue: raw,
      suggestion: '',
      recommendation: raw,
      evidence: '',
      confidence: 'medium',
    },
  ]
}

const initialState: AppState = {
  step: 'upload',
  transcripts: [],
  originalPrompt: '',
  batches: [],
  allSuggestionsRaw: [],
  parsedCategories: [],
  optimizedPrompt: '',
  diffChunks: [],
  hasManualEdits: false,
  error: null,
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [workflowBError, setWorkflowBError] = useState<string | null>(null)
  const [workflowCError, setWorkflowCError] = useState<string | null>(null)
  const [workflowBRunning, setWorkflowBRunning] = useState(false)
  const [workflowCRunning, setWorkflowCRunning] = useState(false)
  const [clusteringDone, setClusteringDone] = useState(false)
  const [clusteringSuggestionCount, setClusteringSuggestionCount] = useState(0)
  const [clusteringCategoryCount, setClusteringCategoryCount] = useState(0)
  const cancelRef = useRef(false)

  const updateBatch = useCallback((index: number, update: Partial<Batch>) => {
    setState((prev) => ({
      ...prev,
      batches: prev.batches.map((b) => (b.index === index ? { ...b, ...update } : b)),
    }))
  }, [])

  const runWorkflowB = useCallback(async (allSuggestions: unknown[]) => {
    setWorkflowBError(null)
    setWorkflowBRunning(true)
    try {
      const outputs = await callDify(import.meta.env.VITE_DIFY_WORKFLOW_B_KEY as string, {
        all_suggestions: JSON.stringify(allSuggestions),
      })
      const clustered = extractStringOutput(outputs, 'clustered_suggestions')
      const parsed = parseSuggestions(clustered)
      setClusteringSuggestionCount(parsed.reduce((s, c) => s + c.suggestions.length, 0))
      setClusteringCategoryCount(parsed.length)
      setClusteringDone(true)
      setState((prev) => ({
        ...prev,
        allSuggestionsRaw: allSuggestions,
        parsedCategories: parsed,
        step: 'review',
      }))
    } catch (e) {
      setWorkflowBError(e instanceof Error ? e.message : 'Workflow B failed')
    } finally {
      setWorkflowBRunning(false)
    }
  }, [])

  const runAnalysis = useCallback(async () => {
    const batches = batchTranscripts(state.transcripts)
    if (batches.length === 0) return

    cancelRef.current = false
    setWorkflowBError(null)
    setClusteringDone(false)

    const originalPrompt = state.originalPrompt

    setState((prev) => ({
      ...prev,
      step: 'analyzing',
      batches,
      allSuggestionsRaw: [],
      parsedCategories: [],
      optimizedPrompt: '',
      diffChunks: [],
      hasManualEdits: false,
      error: null,
    }))

    const allSuggestions: unknown[] = []
    let failedCount = 0

    for (let i = 0; i < batches.length; i++) {
      if (cancelRef.current) break

      updateBatch(i, { status: 'running' })

      const attempt = async (isRetry: boolean): Promise<boolean> => {
        try {
          const batchText = formatBatch(batches[i])
          const outputs = await callDify(import.meta.env.VITE_DIFY_WORKFLOW_A_KEY as string, {
            original_prompt: originalPrompt,
            batch_transcripts: batchText,
          })
          const raw = extractStringOutput(outputs, 'suggestions')
          const parsed = parseSuggestionsArray(raw)
          allSuggestions.push(...parsed)
          updateBatch(i, { status: 'done', suggestionsExtracted: parsed.length })
          return true
        } catch (e) {
          if (!isRetry) {
            updateBatch(i, { status: 'running', retryCount: 1, error: 'Retrying...' })
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
            return attempt(true)
          }
          updateBatch(i, {
            status: 'failed',
            retryCount: 1,
            error: e instanceof Error ? e.message : 'Unknown error',
          })
          return false
        }
      }

      const success = await attempt(false)
      if (!success) failedCount++
    }

    if (cancelRef.current) return

    if (failedCount === batches.length) {
      setState((prev) => ({
        ...prev,
        error: 'All batches failed. Check your Dify API configuration.',
      }))
      return
    }

    await runWorkflowB(allSuggestions)
  }, [state.transcripts, state.originalPrompt, updateBatch, runWorkflowB])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
    setState((prev) => ({ ...prev, step: 'upload' }))
  }, [])

  const handleToggleSuggestion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      parsedCategories: prev.parsedCategories.map((cat) => ({
        ...cat,
        suggestions: cat.suggestions.map((s) =>
          s.id === id ? { ...s, approved: !s.approved } : s
        ),
      })),
    }))
  }, [])

  const handleSelectAllCategory = useCallback((categoryName: string, value: boolean) => {
    setState((prev) => ({
      ...prev,
      parsedCategories: prev.parsedCategories.map((cat) =>
        cat.name === categoryName
          ? { ...cat, suggestions: cat.suggestions.map((s) => ({ ...s, approved: value })) }
          : cat
      ),
    }))
  }, [])

  const handleSelectAll = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      parsedCategories: prev.parsedCategories.map((cat) => ({
        ...cat,
        suggestions: cat.suggestions.map((s) => ({ ...s, approved: value })),
      })),
    }))
  }, [])

  const handleGeneratePrompt = useCallback(async () => {
    setWorkflowCError(null)
    setWorkflowCRunning(true)
    try {
      const approvedText = reconstructApprovedSuggestions(state.parsedCategories)
      const outputs = await callDify(import.meta.env.VITE_DIFY_WORKFLOW_C_KEY as string, {
        original_prompt: state.originalPrompt,
        approved_suggestions: approvedText,
      })
      const optimized = extractStringOutput(outputs, 'optimized_prompt')
      const chunks = computeDiffChunks(state.originalPrompt, optimized)
      setState((prev) => ({
        ...prev,
        optimizedPrompt: optimized,
        diffChunks: chunks,
        hasManualEdits: false,
        step: 'output',
      }))
    } catch (e) {
      setWorkflowCError(e instanceof Error ? e.message : 'Workflow C failed')
    } finally {
      setWorkflowCRunning(false)
    }
  }, [state.parsedCategories, state.originalPrompt])

  const handleChunkToggle = useCallback((ids: string[], accepted: boolean) => {
    setState((prev) => {
      const updated = prev.diffChunks.map((c) =>
        ids.includes(c.id) ? { ...c, accepted } : c
      ) as DiffChunk[]
      return {
        ...prev,
        diffChunks: updated,
        optimizedPrompt: reconstructPromptFromChunks(updated),
        hasManualEdits: false,
      }
    })
  }, [])

  const handleManualEdit = useCallback((text: string) => {
    setState((prev) => ({ ...prev, optimizedPrompt: text, hasManualEdits: true }))
  }, [])

  const handleResetToAI = useCallback(() => {
    setState((prev) => ({
      ...prev,
      optimizedPrompt: reconstructPromptFromChunks(prev.diffChunks),
      hasManualEdits: false,
    }))
  }, [])

  const handleBackToReview = useCallback(() => {
    if (
      state.hasManualEdits &&
      !window.confirm(
        'You have unsaved edits to the optimized prompt. Going back to select more suggestions will discard these edits and regenerate the prompt from scratch. Continue?'
      )
    ) {
      return
    }
    setState((prev) => ({
      ...prev,
      step: 'review',
      optimizedPrompt: '',
      diffChunks: [],
      hasManualEdits: false,
    }))
  }, [state.hasManualEdits])

  const handleStepNavigate = useCallback(
    (step: AppStep) => {
      if (step === 'analyzing') return
      const currentIndex = STEP_ORDER.indexOf(state.step)
      const targetIndex = STEP_ORDER.indexOf(step)
      if (targetIndex >= currentIndex) return

      if (
        state.step === 'output' &&
        state.hasManualEdits &&
        !window.confirm(
          'You have unsaved edits to the optimized prompt. Going back will discard these edits. Continue?'
        )
      ) {
        return
      }

      setState((prev) => ({
        ...prev,
        step,
        ...(targetIndex < STEP_ORDER.indexOf('output')
          ? { optimizedPrompt: '', diffChunks: [], hasManualEdits: false }
          : {}),
      }))
    },
    [state.step, state.hasManualEdits]
  )

  const handleReset = useCallback(() => {
    cancelRef.current = true
    setState(initialState)
    setWorkflowBError(null)
    setWorkflowCError(null)
    setClusteringDone(false)
  }, [])

  return (
    <div className="min-h-screen bg-[#f0f4f2]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#065f46]">TwinX Prompt Optimizer</h1>
          <p className="text-gray-500 text-sm mt-1">
            Analyze call transcripts and generate an improved voice bot system prompt
          </p>
        </div>

        <Stepper currentStep={state.step} onNavigate={handleStepNavigate} />

        <div className="mt-8">
          {state.step === 'upload' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadZone
                transcripts={state.transcripts}
                onChange={(transcripts: Transcript[]) =>
                  setState((prev) => ({ ...prev, transcripts }))
                }
              />
              <PromptInput
                value={state.originalPrompt}
                onChange={(originalPrompt: string) =>
                  setState((prev) => ({ ...prev, originalPrompt }))
                }
              />
              <div className="md:col-span-2 flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full py-3 px-6 bg-[#10b981] text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#059669] transition-colors text-sm"
                  disabled={
                    state.transcripts.filter((t) => t.status === 'ok').length === 0 ||
                    !state.originalPrompt.trim()
                  }
                  onClick={runAnalysis}
                >
                  Run Analysis →
                </button>
                {state.transcripts.length > 0 &&
                  state.transcripts.filter((t) => t.status === 'ok').length === 0 && (
                    <p className="text-xs text-red-600 text-center">
                      No transcripts parsed successfully.
                    </p>
                  )}
              </div>
            </div>
          )}

          {state.step === 'analyzing' && (
            <AnalysisProgress
              batches={state.batches}
              workflowBRunning={workflowBRunning}
              workflowBError={workflowBError}
              clusteringDone={clusteringDone}
              clusteringSuggestionCount={clusteringSuggestionCount}
              clusteringCategoryCount={clusteringCategoryCount}
              globalError={state.error}
              onCancel={handleCancel}
              onRetryWorkflowB={() => runWorkflowB(state.allSuggestionsRaw)}
              onRetryAll={runAnalysis}
            />
          )}

          {state.step === 'review' && (
            <div className="flex flex-col gap-4">
              {workflowCError && (
                <ErrorPanel
                  message="Workflow C failed"
                  detail={workflowCError}
                  onRetry={handleGeneratePrompt}
                />
              )}
              <SuggestionReview
                parsedCategories={state.parsedCategories}
                originalPrompt={state.originalPrompt}
                workflowCRunning={workflowCRunning}
                onToggle={handleToggleSuggestion}
                onSelectAll={handleSelectAll}
                onSelectAllCategory={handleSelectAllCategory}
                onGenerate={handleGeneratePrompt}
              />
            </div>
          )}

          {state.step === 'output' && (
            <PromptOutput
              originalPrompt={state.originalPrompt}
              optimizedPrompt={state.optimizedPrompt}
              diffChunks={state.diffChunks}
              hasManualEdits={state.hasManualEdits}
              onChunkToggle={handleChunkToggle}
              onManualEdit={handleManualEdit}
              onResetToAI={handleResetToAI}
              onBack={handleBackToReview}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  )
}
