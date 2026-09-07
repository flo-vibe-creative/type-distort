'use client'

import { useEffect, useState } from 'react'
import { Text } from '@/components/ui/Text'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  suffix?: string
  /** 소수점 자릿수 */
  decimals?: number
}

/**
 * 숫자 입력 칸.
 * 타이핑 중에는 사용자가 친 그대로 두고, 값이 확정될 때만 반영해 커서가 튀지 않게 한다.
 */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  decimals = 0,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => value.toFixed(decimals))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(value.toFixed(decimals))
  }, [value, decimals, editing])

  const commit = () => {
    setEditing(false)
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) onChange(parsed)
    else setDraft(value.toFixed(decimals))
  }

  return (
    <label className="flex items-center justify-between gap-2">
      <Text variant="ui13" as="span" color="text-fg-secondary">
        {label}
      </Text>
      <span className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={draft}
          onFocus={() => setEditing(true)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          className="w-20 rounded border border-border bg-surface px-2 py-1 text-right text-[13px] leading-[18px] outline-none focus:border-blue-800"
        />
        {suffix && (
          <Text variant="caption12" as="span" color="text-fg-tertiary">
            {suffix}
          </Text>
        )}
      </span>
    </label>
  )
}
