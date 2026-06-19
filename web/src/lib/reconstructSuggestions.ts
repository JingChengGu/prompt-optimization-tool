import { ParsedCategory } from '../types'

export function reconstructApprovedSuggestions(categories: ParsedCategory[]): string {
  const sections: string[] = []

  for (const cat of categories) {
    const approved = cat.suggestions.filter((s) => s.approved)
    if (approved.length === 0) continue

    const sorted = [...approved].sort((a, b) =>
      a.confidence === b.confidence ? 0 : a.confidence === 'high' ? -1 : 1
    )

    const header = [
      '═══════════════════════════════════════',
      cat.displayName.toUpperCase(),
      '═══════════════════════════════════════',
    ].join('\n')

    const blocks = sorted.map((s) =>
      [
        '───────────────────────────────────────',
        `[confidence: ${s.confidence} | change: ${s.changeType}]`,
        `Category: ${s.category}`,
        `Issue: ${s.issue}`,
        `Prompt Section: ${s.promptSection}`,
        `Existing Text: ${s.existingText}`,
        `Recommendation:`,
        s.recommendation,
        `Evidence: ${s.evidence}`,
        '───────────────────────────────────────',
      ].join('\n')
    )

    sections.push([header, ...blocks].join('\n'))
  }

  return sections.join('\n\n')
}
