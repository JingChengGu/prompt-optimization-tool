import { v4 as uuidv4 } from 'uuid'
import { Category, ChangeType, Confidence, ParsedCategory, ParsedSuggestion } from '../types'

const CATEGORY_MAP: Record<string, string> = {
  objection_handling: 'Objection Handling',
  asr_correction: 'ASR Correction',
  compliance: 'Compliance',
  qualifying_questions: 'Qualifying Questions',
  voicemail_detection: 'Voicemail Detection',
  tone: 'Tone',
  other: 'Other',
}

export function getCategoryDisplayName(category: string): string {
  const key = category.toLowerCase().replace(/\s+/g, '_')
  return (
    CATEGORY_MAP[key] ??
    category
      .split(/[_ ]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

function toCategory(raw: string): Category {
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, '_')
  const valid: Category[] = [
    'objection_handling',
    'asr_correction',
    'compliance',
    'qualifying_questions',
    'voicemail_detection',
    'tone',
    'other',
  ]
  return valid.includes(normalized as Category) ? (normalized as Category) : 'other'
}

function toChangeType(raw: string): ChangeType {
  const v = raw.toLowerCase().trim()
  if (v === 'add' || v === 'replace' || v === 'remove') return v
  return 'add'
}

function toConfidence(raw: string): Confidence {
  return raw.toLowerCase().trim() === 'medium' ? 'medium' : 'high'
}

function parseHeader(line: string): { confidence: Confidence; changeType: ChangeType } | null {
  // New format: [confidence: high/medium | change: add/replace/remove]
  const m = line.match(/\[confidence:\s*(\w+)\s*\|\s*change:\s*(\w+)\]/)
  if (!m) return null
  return {
    confidence: toConfidence(m[1]),
    changeType: toChangeType(m[2]),
  }
}

function parseSuggestionBlock(block: string): ParsedSuggestion | null {
  const lines = block.split('\n')
  const nonEmpty = lines.filter((l) => l.trim())
  if (!nonEmpty.length) return null

  const header = parseHeader(nonEmpty[0])
  if (!header) return null

  const fields: Record<string, string> = {}
  let currentField = ''
  let currentValue: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const fieldMatch = line.match(
      /^(Category|Issue|Prompt Section|Existing Text|Recommendation|Evidence):\s*(.*)$/
    )
    if (fieldMatch) {
      if (currentField) {
        fields[currentField] = currentValue.join('\n').trim()
      }
      currentField = fieldMatch[1]
      currentValue = fieldMatch[2] ? [fieldMatch[2]] : []
    } else if (currentField) {
      currentValue.push(line)
    }
  }
  if (currentField) {
    fields[currentField] = currentValue.join('\n').trim()
  }

  try {
    return {
      id: uuidv4(),
      ...header,
      category: toCategory(fields['Category'] ?? 'other'),
      issue: fields['Issue'] ?? '',
      promptSection: fields['Prompt Section'] ?? '',
      existingText: fields['Existing Text'] ?? '',
      recommendation: fields['Recommendation'] ?? '',
      evidence: fields['Evidence'] ?? '',
      approved: false,
    }
  } catch {
    console.warn('Failed to parse suggestion block', block)
    return null
  }
}

export function parseSuggestions(text: string): ParsedCategory[] {
  // ═══ lines surround the category title, so splitting produces alternating
  // [header chunk, blocks chunk, header chunk, blocks chunk, ...]
  const parts = text.split(/^═{3,}$/m).filter((s) => s.trim())
  const categories: ParsedCategory[] = []

  for (let i = 0; i + 1 < parts.length; i += 2) {
    const categoryName = parts[i].trim().split('\n')[0].trim()
    if (!categoryName) continue

    const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '_')
    const blocks = parts[i + 1].split(/^─{3,}$/m).filter((b) => b.trim())

    const suggestions: ParsedSuggestion[] = []
    for (const block of blocks) {
      try {
        const suggestion = parseSuggestionBlock(block.trim())
        if (suggestion) suggestions.push(suggestion)
      } catch (e) {
        console.warn('Skipping unparseable suggestion block:', e)
      }
    }

    if (suggestions.length > 0) {
      categories.push({
        name: categoryKey,
        displayName: getCategoryDisplayName(categoryKey),
        // high confidence first, then medium
        suggestions: suggestions.sort((a, b) =>
          a.confidence === b.confidence ? 0 : a.confidence === 'high' ? -1 : 1
        ),
      })
    }
  }

  return categories
}
