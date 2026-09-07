'use client'

import { Text } from '@/components/ui/Text'
import { useNumericDraft } from '@/hooks/useNumericDraft'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  suffix?: string
  /** 소수점 자릿수 */
  decimals?: number
}

/** 이름과 숫자 입력 칸이 한 줄로 놓인 형태 */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  decimals = 0,
}: NumberFieldProps) {
  const input = useNumericDraft(value, { decimals, step, onCommit: onChange })

  return (
    <label className="flex items-center justify-between gap-2">
      <Text variant="ui13" as="span" color="text-fg-secondary">
        {label}
      </Text>
      <span className="flex items-center gap-1">
        <input
          {...input}
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
