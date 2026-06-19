export type Category =
  | 'objection_handling'
  | 'asr_correction'
  | 'compliance'
  | 'qualifying_questions'
  | 'voicemail_detection'
  | 'tone'
  | 'other'

export type ChangeType = 'add' | 'replace' | 'remove'
export type Confidence = 'high' | 'medium'
export type OutputMode = 'preview' | 'diff' | 'edit'

export type Transcript = {
  name: string
  text: string
  charCount: number
  status: 'ok' | 'error'
  errorMessage?: string
}

export type Batch = {
  index: number
  transcripts: Transcript[]
  charCount: number
  status: 'pending' | 'running' | 'done' | 'failed'
  suggestionsExtracted?: number
  error?: string
  retryCount: number
}

export type ParsedSuggestion = {
  id: string
  confidence: Confidence
  changeType: ChangeType
  category: Category
  issue: string
  promptSection: string
  existingText: string
  recommendation: string
  evidence: string
  approved: boolean
}

export type ParsedCategory = {
  name: string
  displayName: string
  suggestions: ParsedSuggestion[]
}

export type DiffChunk = {
  id: string
  type: 'added' | 'removed' | 'unchanged'
  originalText: string
  newText: string
  accepted: boolean
}

export type AppStep = 'upload' | 'analyzing' | 'review' | 'output'

export type AppState = {
  step: AppStep
  transcripts: Transcript[]
  originalPrompt: string
  batches: Batch[]
  allSuggestionsRaw: unknown[]
  parsedCategories: ParsedCategory[]
  optimizedPrompt: string
  diffChunks: DiffChunk[]
  hasManualEdits: boolean
  error: string | null
}
