export const UPLOAD_TRANSCRIPTS_LABEL = 'Drop transcript files here'
export const UPLOAD_FOLDER_HINT = 'or upload a folder'
export const UPLOAD_PROMPT_LABEL = 'Drop prompt file here'
export const RUN_ANALYSIS_BUTTON = 'Run Analysis →'
export const ANALYZING_HEADER = (n: number, m: number) =>
  `Analyzing ${n} transcripts across ${m} batches`
export const GENERATE_PROMPT_BUTTON = 'Generate Optimized Prompt →'
export const COPY_BUTTON = 'Copy to clipboard'
export const COPIED_BUTTON = 'Copied!'
export const START_NEW_RUN_BUTTON = 'Start new run'
export const SELECT_ALL = 'Select all'
export const DESELECT_ALL = 'Deselect all'
export const CANCEL_BUTTON = 'Cancel'
export const RETRY_BUTTON = 'Retry'
export const CLEAR_ALL_BUTTON = 'Clear all'
export const CLEAR_BUTTON = 'Clear'
export const PASTE_TEXT_TAB = 'Paste text'
export const UPLOAD_FILE_TAB = 'Upload file'
export const SHOW_MORE = 'Show more ↓'
export const SHOW_LESS = 'Show less ↑'
export const PREVIEW_TAB = 'Preview'
export const DIFF_TAB = 'Diff'
export const CLUSTERING_LABEL = 'Clustering suggestions with Workflow B...'
export const ALL_BATCHES_FAILED = 'All batches failed. Check your Dify API configuration.'
export const NO_SUGGESTIONS_APPROVED =
  'Select at least one suggestion to generate the optimized prompt.'
export const MIN_TRANSCRIPTS_REQUIRED = 'Upload at least one transcript.'
export const PROMPT_REQUIRED = 'Enter or upload the original prompt.'
export const UPLOAD_FOLDER_BUTTON = 'Upload folder'
export const SUGGESTIONS_CLUSTERED = (n: number, m: number) =>
  `${n} unique suggestions across ${m} categories`
export const APPROVED_COUNT = (n: number) => `${n} approved`
export const BATCH_ROW_LABEL = (i: number, t: number, c: number) =>
  `Batch ${i} · ${t} transcript${t !== 1 ? 's' : ''} · ${c.toLocaleString()} chars`
export const SUGGESTIONS_EXTRACTED = (n: number) => `→ ${n} suggestions extracted`
export const BATCH_FAILED = 'Failed'
export const BATCH_RETRYING = 'Retrying...'
export const BATCH_FAILED_AFTER_RETRY = 'Failed after retry'
export const STATS_BAR = (orig: number, opt: number, pct: string) =>
  `Original: ${orig.toLocaleString()} chars  →  Optimized: ${opt.toLocaleString()} chars  (${pct})`
export const REVIEW_INSTRUCTION =
  'Review each suggestion carefully. Nothing is applied until you check it.'
export const EDIT_TAB = 'Edit'
export const BACK_TO_SUGGESTIONS = '← Back to suggestions'
export const RESET_TO_AI = 'Reset to AI-generated version'
