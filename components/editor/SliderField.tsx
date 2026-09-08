'use client'

import { Text } from '@/components/ui/Text'
import { useNumericDraft } from '@/hooks/useNumericDraft'
import { useEditorStore } from '@/store/editorStore'

/** 슬라이더 값을 실제로 바꾸는 키들 — 이때만 조작 한 번으로 묶는다 */
const VALUE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])

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

/**
 * 슬라이더와 숫자 입력 칸이 함께 놓인 조절 항목.
 * 슬라이더로 훑어보고, 값을 정확히 맞추고 싶을 때는 숫자를 직접 쳐 넣는다.
 */
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
  // 화면에 보이는 값은 배수를 곱한 것이므로 자릿수와 범위도 같은 기준으로 맞춘다
  const displayStep = step * displayScale
  const decimals = displayStep < 1 ? 2 : 0

  const input = useNumericDraft(value * displayScale, {
    decimals,
    min: Math.min(min, max) * displayScale,
    max: Math.max(min, max) * displayScale,
    step: displayStep,
    onCommit: (shown) => onChange(shown / displayScale),
  })

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Text variant="ui13" as="span" color="text-fg-secondary">
          {label}
        </Text>
        <span className="flex items-center gap-0.5">
          <input
            aria-label={label}
            {...input}
            className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-[12px] leading-[18px] text-fg-tertiary outline-none hover:border-border focus:border-blue-800 focus:text-fg-primary"
          />
          {suffix && (
            <Text variant="caption12" as="span" color="text-fg-tertiary">
              {suffix}
            </Text>
          )}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => useEditorStore.getState().beginGesture()}
        onPointerUp={() => useEditorStore.getState().endGesture()}
        onKeyDown={(event) => {
          // Cmd+Z 같은 단축키까지 조작으로 잡으면 기록이 멈춘 채 남는다
          if (event.metaKey || event.ctrlKey || event.altKey) return
          if (VALUE_KEYS.has(event.key)) useEditorStore.getState().beginGesture()
        }}
        onKeyUp={(event) => {
          if (VALUE_KEYS.has(event.key)) useEditorStore.getState().endGesture()
        }}
        onBlur={() => useEditorStore.getState().endGesture()}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-surface-quaternary accent-blue-800"
      />
    </div>
  )
}
