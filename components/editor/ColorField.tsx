'use client'

import { useEffect, useState } from 'react'
import { Text } from '@/components/ui/Text'
import { normalizeHexColor } from '@/lib/format/color'

interface ColorFieldProps {
  label: string
  /** 지금 색. null이면 색이 없는 상태(투명 등) */
  value: string | null
  /** 색이 없을 때 색 견본에 보여줄 기본값 */
  fallback?: string
  onChange: (color: string) => void
}

/** 색 견본과 코드 입력을 함께 둔 항목 */
export function ColorField({ label, value, fallback = '#000000', onChange }: ColorFieldProps) {
  const current = value ?? fallback
  const [draft, setDraft] = useState(current)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(current)
  }, [current, editing])

  const commit = () => {
    setEditing(false)
    const parsed = normalizeHexColor(draft)
    if (parsed) {
      setDraft(parsed)
      if (parsed !== value) onChange(parsed)
    } else {
      setDraft(current)
    }
  }

  return (
    <label className="flex items-center justify-between gap-2">
      <Text variant="ui13" as="span" color="text-fg-secondary">
        {label}
      </Text>
      <span className="flex items-center gap-1.5">
        <input
          type="color"
          value={current}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} 색 고르기`}
          className="h-6 w-6 cursor-pointer rounded border border-border bg-surface p-0.5"
        />
        <input
          type="text"
          inputMode="text"
          value={draft}
          aria-label={label}
          onFocus={(event) => {
            setEditing(true)
            event.target.select()
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setDraft(current)
              setEditing(false)
              event.currentTarget.blur()
            }
          }}
          className="w-[86px] rounded border border-border bg-surface px-2 py-1 text-right text-[13px] leading-[18px] outline-none focus:border-blue-800"
        />
      </span>
    </label>
  )
}
