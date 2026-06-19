import { useCallback, useRef, useState, DragEvent, ChangeEvent } from 'react'
import { UPLOAD_PROMPT_LABEL } from '../constants/copy'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
}

export function PromptInput({ value, onChange }: PromptInputProps) {
  const [filename, setFilename] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        onChange(text)
        setFilename(file.name)
      } catch {
        // ignore
      }
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) loadFile(file)
    },
    [loadFile]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) loadFile(file)
      e.target.value = ''
    },
    [loadFile]
  )

  const handleClear = useCallback(() => {
    onChange('')
    setFilename(null)
  }, [onChange])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-[#065f46]">Original Prompt</h2>

      {!value ? (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[#10b981] bg-[#d1fae5]' : 'border-gray-300 hover:border-[#10b981]'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-gray-500 text-sm">{UPLOAD_PROMPT_LABEL}</p>
            <p className="text-gray-400 text-xs mt-1">.md or .txt</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-emerald-600 text-sm">✓</span>
              <span className="text-gray-700 text-sm truncate">{filename ?? 'prompt.md'}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-gray-400 text-xs">{value.length.toLocaleString()} chars</span>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-sm leading-none"
                onClick={handleClear}
                title="Remove and upload a different file"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
