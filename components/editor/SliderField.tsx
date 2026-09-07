'use client'

import { Text } from '@/components/ui/Text'
import { useEditorStore } from '@/store/editorStore'

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  /** 화면에 보여줄 때 곱할 배수 (0~1 값을 퍼센트로 보여줄 때) */
  displayScale?: number
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
  displayScale = 1,
  onChange,
}: SliderFieldProps) {
  const displayStep = step * displayScale
  const decimals = displayStep < 1 ? 2 : 0
  const shown = value * displayScale

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Text variant="ui13" as="span" color="text-fg-secondary">
          {label}
        </Text>
        <Text variant="caption12" as="span" color="text-fg-tertiary">
          {shown.toFixed(decimals)}
          {suffix ?? ''}
        </Text>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => useEditorStore.getState().beginGesture()}
        onPointerUp={() => useEditorStore.getState().endGesture()}
        onKeyDown={() => useEditorStore.getState().beginGesture()}
        onKeyUp={() => useEditorStore.getState().endGesture()}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-surface-quaternary accent-blue-800"
      />
    </div>
  )
}
