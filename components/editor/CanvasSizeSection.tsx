'use client'

import { NumberField } from '@/components/editor/NumberField'
import { PanelSection } from '@/components/editor/PanelSection'
import { Text } from '@/components/ui/Text'
import { describeAspectRatio } from '@/lib/format/ratio'
import { useEditorStore } from '@/store/editorStore'

/** 대지 크기 — 픽셀 값과 지금 비율을 함께 보여준다 */
export function CanvasSizeSection() {
  const canvas = useEditorStore((state) => state.document.canvas)
  const setCanvasSize = useEditorStore((state) => state.setCanvasSize)
  const fitCanvasToContent = useEditorStore((state) => state.fitCanvasToContent)

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
