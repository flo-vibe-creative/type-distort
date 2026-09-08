'use client'

import { NumberField } from '@/components/editor/NumberField'
import { PanelSection } from '@/components/editor/PanelSection'
import { Text } from '@/components/ui/Text'
import {
  CANVAS_PRESETS,
  matchesPreset,
  orientationOf,
  presetSize,
  type CanvasOrientation,
} from '@/lib/document/canvasPresets'
import { describeAspectRatio } from '@/lib/format/ratio'
import { useEditorStore } from '@/store/editorStore'

const ORIENTATION_LABEL: Record<CanvasOrientation, string> = {
  landscape: '가로형',
  portrait: '세로형',
}

/** 대지 크기 — 픽셀 값, 지금 비율, 자주 쓰는 비율을 함께 다룬다 */
export function CanvasSizeSection() {
  const canvas = useEditorStore((state) => state.document.canvas)
  const setCanvasSize = useEditorStore((state) => state.setCanvasSize)
  const fitCanvasToContent = useEditorStore((state) => state.fitCanvasToContent)

  const orientation = orientationOf(canvas.width, canvas.height)

  const applyOrientation = (next: CanvasOrientation) => {
    if (next === orientation) return
    // 방향만 바꾸는 것이므로 지금 크기를 그대로 눕히거나 세운다
    setCanvasSize(canvas.height, canvas.width)
  }

  return (
    <PanelSection title="대지 크기">
      <NumberField
        label="가로"
        suffix="px"
        value={canvas.width}
        onChange={(width) => setCanvasSize(width, canvas.height)}
      />
      <NumberField
        label="세로"
        suffix="px"
        value={canvas.height}
        onChange={(height) => setCanvasSize(canvas.width, height)}
      />

      <div className="flex items-center justify-between">
        <Text variant="ui13" as="span" color="text-fg-secondary">
          비율
        </Text>
        <Text variant="caption12" as="span" color="text-fg-tertiary">
          {describeAspectRatio(canvas.width, canvas.height)} ({canvas.width} × {canvas.height}px)
        </Text>
      </div>

      <div className="mt-1 flex gap-1">
        {(['landscape', 'portrait'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => applyOrientation(option)}
            className={`flex-1 rounded border py-1 ${
              orientation === option
                ? 'border-blue-800 bg-blue-50'
                : 'border-border hover:bg-surface-minimal'
            }`}
          >
            <Text
              variant="caption12"
              as="span"
              color={orientation === option ? 'text-blue-800' : 'text-fg-secondary'}
            >
              {ORIENTATION_LABEL[option]}
            </Text>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        {CANVAS_PRESETS.map((preset) => {
          const size = presetSize(preset, orientation)
          const selected = matchesPreset(preset, orientation, canvas.width, canvas.height)
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCanvasSize(size.width, size.height)}
              className={`rounded border px-2 py-1.5 text-left ${
                selected ? 'border-blue-800 bg-blue-50' : 'border-border hover:bg-surface-minimal'
              }`}
            >
              <Text
                variant="caption12"
                as="span"
                color={selected ? 'text-blue-800' : 'text-fg-primary'}
              >
                {describeAspectRatio(size.width, size.height)}
              </Text>
              <span className="block">
                <Text variant="caption10" as="span" color="text-fg-tertiary">
                  {size.width} × {size.height}
                </Text>
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => fitCanvasToContent(40)}
        className="mt-1 rounded-md border border-border py-1.5 hover:bg-surface-minimal"
      >
        <Text variant="caption12" as="span" color="text-fg-secondary">
          내용에 맞춰 자르기
        </Text>
      </button>
    </PanelSection>
  )
}
