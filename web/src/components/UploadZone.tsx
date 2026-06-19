import { useCallback, useRef, useState, DragEvent, ChangeEvent } from 'react'
import React from 'react'
import { Transcript } from '../types'
import { extractTextFromDocx } from '../lib/mammothLoader'
import { batchTranscripts } from '../lib/batchTranscripts'
import {
  UPLOAD_TRANSCRIPTS_LABEL,
  UPLOAD_FOLDER_HINT,
  CLEAR_ALL_BUTTON,
  UPLOAD_FOLDER_BUTTON,
} from '../constants/copy'

interface UploadZoneProps {
  transcripts: Transcript[]
  onChange: (transcripts: Transcript[]) => void
}

export function UploadZone({ transcripts, onChange }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[]) => {
      const filtered = files.filter(
        (f) => f.name.endsWith('.docx') || f.name.endsWith('.txt')
      )
      if (!filtered.length) return

      const results = await Promise.all(
        filtered.map(async (f): Promise<Transcript> => {
          try {
            let text = ''
            if (f.name.endsWith('.docx')) {
              text = await extractTextFromDocx(f)
            } else {
              text = await f.text()
            }
            return { name: f.name, text, charCount: text.length, status: 'ok' }
          } catch (e) {
            return {
              name: f.name,
              text: '',
              charCount: 0,
              status: 'error',
              errorMessage: e instanceof Error ? e.message : `Failed to parse ${f.name}`,
            }
          }
        })
      )

      onChange([
        ...transcripts.filter((t) => !results.find((r) => r.name === t.name)),
        ...results,
      ])
    },
    [transcripts, onChange]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      processFiles(Array.from(e.dataTransfer.files))
    },
    [processFiles]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      processFiles(Array.from(e.target.files ?? []))
      e.target.value = ''
    },
    [processFiles]
  )

  const estimatedBatches = batchTranscripts(transcripts).length
  const totalChars = transcripts.reduce((s, t) => s + t.charCount, 0)
  const shown = transcripts.slice(0, 20)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-[#065f46]">Transcripts</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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
        <p className="text-gray-500 text-sm">{UPLOAD_TRANSCRIPTS_LABEL}</p>
        <p className="text-gray-400 text-xs mt-1">.docx or .txt files</p>
        <p className="text-gray-400 text-xs">{UPLOAD_FOLDER_HINT}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          onClick={() => folderInputRef.current?.click()}
        >
          {UPLOAD_FOLDER_BUTTON}
        </button>
        {transcripts.length > 0 && (
          <button
            type="button"
            className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
            onClick={() => onChange([])}
          >
            {CLEAR_ALL_BUTTON}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.txt"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      {/* folder input — webkitdirectory set imperatively to avoid TS error */}
      <input
        ref={(el) => {
          ;(folderInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
          if (el) el.setAttribute('webkitdirectory', '')
        }}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {transcripts.length > 0 && (
        <>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            {transcripts.length} files · {totalChars.toLocaleString()} total chars ·{' '}
            {estimatedBatches} batch{estimatedBatches !== 1 ? 'es' : ''} estimated
          </div>
          <ul className="text-sm divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {shown.map((t) => (
              <li key={t.name} className="flex items-center justify-between py-1.5 gap-2">
                <span className="truncate text-gray-700 flex-1">{t.name}</span>
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  {t.charCount.toLocaleString()} chars
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    t.status === 'ok'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {t.status === 'ok' ? '✓' : '✗'}
                </span>
                <button
                  type="button"
                  className="text-gray-300 hover:text-red-400 text-sm leading-none shrink-0"
                  title="Remove this transcript"
                  onClick={() => onChange(transcripts.filter((x) => x.name !== t.name))}
                >
                  ×
                </button>
              </li>
            ))}
            {transcripts.length > 20 && (
              <li className="py-1.5 text-gray-400 text-xs">
                +{transcripts.length - 20} more
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
