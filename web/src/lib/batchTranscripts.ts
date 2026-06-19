import { Batch, Transcript } from '../types'

const CHAR_CEILING = 8000

export function batchTranscripts(transcripts: Transcript[]): Batch[] {
  const sorted = [...transcripts]
    .filter((t) => t.status === 'ok')
    .sort((a, b) => a.name.localeCompare(b.name))

  const batches: Batch[] = []
  let current: Transcript[] = []
  let currentChars = 0

  for (const t of sorted) {
    if (current.length > 0 && currentChars + t.charCount > CHAR_CEILING) {
      batches.push(makeBatch(batches.length, current, currentChars))
      current = []
      currentChars = 0
    }
    current.push(t)
    currentChars += t.charCount
  }
  if (current.length > 0) {
    batches.push(makeBatch(batches.length, current, currentChars))
  }

  return batches
}

function makeBatch(index: number, transcripts: Transcript[], charCount: number): Batch {
  return { index, transcripts, charCount, status: 'pending', retryCount: 0 }
}

export function formatBatch(batch: Batch): string {
  return batch.transcripts
    .map((t) => `===TRANSCRIPT_START:${t.name}===\n${t.text}\n===TRANSCRIPT_END===`)
    .join('\n\n')
}
