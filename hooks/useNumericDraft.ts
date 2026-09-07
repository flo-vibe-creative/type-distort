'use client'

import { useEffect, useState } from 'react'
import { formatNumber, parseNumberInput } from '@/lib/format/number'

interface Options {
  decimals: number
  min?: number
  max?: number
  /** 위아래 화살표 키로 한 번에 움직일 값 */
  step?: number
  onCommit: (value: number) => void
}

/** Shift를 누르고 화살표를 누르면 이 배수만큼 크게 움직인다 */
const FAST_STEP_MULTIPLIER = 10

/**
 * 숫자 입력 칸의 공통 동작.
 *
 * 타이핑하는 동안에는 사용자가 친 그대로 두고 (커서가 튀거나 "-"만 쳤을 때 값이 튀지 않도록),
 * 입력을 마쳤을 때만 값을 반영한다. 읽을 수 없는 값이면 원래 값으로 되돌린다.
 *
 * 입력 형식은 `text`다. `number`로 두면 브라우저가 "45%" 같은 입력을 통째로 버려서
 * 단위를 함께 친 값이 사라진다. 대신 위아래 화살표 조절을 직접 붙였다.
 */
export function useNumericDraft(value: number, { decimals, min, max, step, onCommit }: Options) {
  const [draft, setDraft] = useState(() => formatNumber(value, decimals))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(formatNumber(value, decimals))
  }, [value, decimals, editing])

  const clamp = (input: number) => {
    let result = input
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    // 소수점 자릿수에 맞춰 정리해 0.30000000000000004 같은 값이 남지 않게 한다
    return Number.parseFloat(formatNumber(result, decimals))
  }

  const commit = () => {
    setEditing(false)
    const parsed = parseNumberInput(draft, { min, max })
    if (parsed === null) {
      setDraft(formatNumber(value, decimals))
      return
    }
    setDraft(formatNumber(parsed, decimals))
    if (parsed !== value) onCommit(parsed)
  }

  const nudge = (direction: 1 | -1, fast: boolean) => {
    if (step === undefined) return
    const base = parseNumberInput(draft, {}) ?? value
    const next = clamp(base + step * direction * (fast ? FAST_STEP_MULTIPLIER : 1))
    setDraft(formatNumber(next, decimals))
    if (next !== value) onCommit(next)
  }

  return {
    type: 'text' as const,
    inputMode: 'decimal' as const,
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      setEditing(true)
      event.target.select()
    },
    onBlur: commit,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur()
        return
      }
      if (event.key === 'Escape') {
        setDraft(formatNumber(value, decimals))
        setEditing(false)
        event.currentTarget.blur()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        nudge(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey)
      }
    },
  }
}
