import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface Props {
  originalPrompt: string
  targetSection: string
  isOpen: boolean
  onClose: () => void
}

export function OriginalPromptViewer({ originalPrompt, targetSection, isOpen, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [noMatch, setNoMatch] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setNoMatch(false)
      return
    }
    const lower = targetSection.toLowerCase().trim()
    if (!lower || lower === 'new section') {
      setNoMatch(true)
      return
    }
    const timer = setTimeout(() => {
      if (!scrollRef.current) return
      const headings = scrollRef.current.querySelectorAll('h1, h2, h3')
      let matched: HTMLElement | null = null
      headings.forEach((el) => {
        if (!matched && el.textContent?.toLowerCase().includes(lower)) {
          matched = el as HTMLElement
        }
      })
      if (!matched) {
        setNoMatch(true)
        return
      }
      setNoMatch(false)
      matched.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const el = matched
      el.style.backgroundColor = '#fef08a'
      setTimeout(() => {
        el.style.transition = 'background-color 1s'
        el.style.backgroundColor = ''
      }, 2000)
    }, 150)
    return () => clearTimeout(timer)
  }, [isOpen, targetSection])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <div>
            <span className="font-semibold text-[#065f46] text-sm">Original Prompt</span>
            {targetSection && (
              <span className="ml-2 text-xs text-gray-400">→ {targetSection}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none"
          >
            ×
          </button>
        </div>

        {noMatch && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
            {targetSection.toLowerCase() === 'new section' || !targetSection
              ? 'This is a new section — no existing match found in the original prompt.'
              : `No heading matching "${targetSection}" was found. Showing full prompt.`}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 prose max-w-none text-sm">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-[#065f46] font-bold text-2xl mt-4 mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[#065f46] font-bold text-xl mt-4 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[#047857] font-semibold text-lg mt-3 mb-1">{children}</h3>
              ),
              hr: () => <hr className="border-[#d1fae5] my-4" />,
              code: ({ children }) => (
                <code className="bg-[#f4f7f5] rounded px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-[#f4f7f5] rounded-lg p-4 overflow-x-auto text-xs">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#d1fae5] pl-4 text-gray-600 italic">
                  {children}
                </blockquote>
              ),
              th: ({ children }) => (
                <th className="bg-[#d1fae5] px-3 py-2 text-left font-semibold text-[#065f46] text-xs">
                  {children}
                </th>
              ),
            }}
          >
            {originalPrompt}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
