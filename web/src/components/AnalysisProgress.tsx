import { Batch } from '../types'
import { ErrorPanel } from './ErrorPanel'
import {
  ANALYZING_HEADER,
  CANCEL_BUTTON,
  BATCH_ROW_LABEL,
  SUGGESTIONS_EXTRACTED,
  BATCH_FAILED,
  BATCH_RETRYING,
  BATCH_FAILED_AFTER_RETRY,
  CLUSTERING_LABEL,
  SUGGESTIONS_CLUSTERED,
} from '../constants/copy'

interface AnalysisProgressProps {
  batches: Batch[]
  workflowBRunning: boolean
  workflowBError: string | null
  clusteringDone: boolean
  clusteringSuggestionCount: number
  clusteringCategoryCount: number
  globalError: string | null
  onCancel: () => void
  onRetryWorkflowB: () => void
  onRetryAll: () => void
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
  )
}

export function AnalysisProgress({
  batches,
  workflowBRunning,
  workflowBError,
  clusteringDone,
  clusteringSuggestionCount,
  clusteringCategoryCount,
  globalError,
  onCancel,
  onRetryWorkflowB,
  onRetryAll,
}: AnalysisProgressProps) {
  const totalTranscripts = batches.reduce((s, b) => s + b.transcripts.length, 0)
  const doneBatches = batches.filter(
    (b) => b.status === 'done' || b.status === 'failed'
  ).length
  const progress = batches.length > 0 ? doneBatches / batches.length : 0

  if (globalError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ErrorPanel message={globalError} onRetry={onRetryAll} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#065f46]">
          {ANALYZING_HEADER(totalTranscripts, batches.length)}
        </h2>
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded"
          onClick={onCancel}
        >
          {CANCEL_BUTTON}
        </button>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-[#10b981] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 -mt-3">
        {doneBatches} / {batches.length} batches complete
      </p>

      <div className="flex flex-col gap-3">
        {batches.map((batch) => (
          <div key={batch.index} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 w-5 flex-shrink-0 flex items-center">
              {batch.status === 'pending' && (
                <span className="text-gray-300 text-lg leading-none">○</span>
              )}
              {batch.status === 'running' && <Spinner />}
              {batch.status === 'done' && (
                <span className="text-[#10b981] font-bold">✓</span>
              )}
              {batch.status === 'failed' && (
                <span className="text-red-500 font-bold">✗</span>
              )}
            </div>
            <div className="flex-1">
              <p className={batch.status === 'failed' ? 'text-red-600' : 'text-gray-700'}>
                {BATCH_ROW_LABEL(batch.index + 1, batch.transcripts.length, batch.charCount)}
              </p>
              {batch.status === 'done' && batch.suggestionsExtracted !== undefined && (
                <p className="text-[#10b981] text-xs">
                  {SUGGESTIONS_EXTRACTED(batch.suggestionsExtracted)}
                </p>
              )}
              {batch.status === 'failed' && (
                <p className="text-red-500 text-xs">
                  {batch.retryCount > 0 ? BATCH_FAILED_AFTER_RETRY : BATCH_FAILED}
                </p>
              )}
              {batch.status === 'running' && batch.retryCount > 0 && (
                <p className="text-amber-600 text-xs">{BATCH_RETRYING}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {(workflowBRunning || clusteringDone || workflowBError) && (
        <div className="border-t border-gray-100 pt-4">
          {workflowBError ? (
            <ErrorPanel
              message="Workflow B failed"
              detail={workflowBError}
              onRetry={onRetryWorkflowB}
            />
          ) : clusteringDone ? (
            <p className="text-[#10b981] text-sm font-medium">
              ✓ {SUGGESTIONS_CLUSTERED(clusteringSuggestionCount, clusteringCategoryCount)}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Spinner />
              {CLUSTERING_LABEL}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
