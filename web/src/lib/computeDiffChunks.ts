import { diffLines } from 'diff'
import { v4 as uuidv4 } from 'uuid'
import { DiffChunk } from '../types'

export function computeDiffChunks(original: string, optimized: string): DiffChunk[] {
  const changes = diffLines(original, optimized)
  return changes.map((change) => {
    if (change.added) {
      return { id: uuidv4(), type: 'added' as const, originalText: '', newText: change.value, accepted: true }
    } else if (change.removed) {
      return { id: uuidv4(), type: 'removed' as const, originalText: change.value, newText: '', accepted: true }
    } else {
      return { id: uuidv4(), type: 'unchanged' as const, originalText: change.value, newText: change.value, accepted: true }
    }
  })
}

export function reconstructPromptFromChunks(chunks: DiffChunk[]): string {
  return chunks
    .map((chunk) => {
      if (chunk.type === 'unchanged') return chunk.newText
      return chunk.accepted ? chunk.newText : chunk.originalText
    })
    .join('')
}
