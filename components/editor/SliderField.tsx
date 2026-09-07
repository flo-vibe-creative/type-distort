'use client'

import { Text } from '@/components/ui/Text'

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}

/** 슬라이더와 숫자 표시를 함께 두어 값이 얼마인지 항상 보이게 한다 */
export function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: SliderFieldProps) {
  const decimals = step < 1 ? 2 : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Text variant="ui13" as="span" color="text-fg-secondary">
          {label}
        </Text>
        <Text variant="caption12" as="span" color="text-fg-tertiary">
          {value.toFixed(decimals)}
          {suffix ?? ''}
        </Text>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-surface-quaternary accent-blue-800"
      />
    </div>
  )
}
