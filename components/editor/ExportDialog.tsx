'use client'

import { useState } from 'react'
import { NumberField } from '@/components/editor/NumberField'
import { SliderField } from '@/components/editor/SliderField'
import { Text } from '@/components/ui/Text'
import {
  downloadBlob,
  exportDocument,
  type ExportFormat,
} from '@/lib/export/exportDocument'
import { hasRasterLayer } from '@/lib/export/toSvg'
import { useEditorStore } from '@/store/editorStore'
import { useNoticeStore } from '@/store/noticeStore'

const FORMAT_LABEL: Record<ExportFormat, string> = {
  svg: 'SVG (벡터)',
  png: 'PNG',
  jpeg: 'JPEG',
}

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const document = useEditorStore((state) => state.document)
  const setCanvasSize = useEditorStore((state) => state.setCanvasSize)
  const fitCanvasToContent = useEditorStore((state) => state.fitCanvasToContent)
  const notify = useNoticeStore((state) => state.notify)

  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState(2)
  const [transparent, setTransparent] = useState(false)
  const [quality, setQuality] = useState(0.92)
  const [working, setWorking] = useState(false)

  const visibleLayers = document.layers.filter((layer) => layer.visible)
  const background = document.canvas.background ?? '#ffffff'
  const rasterMixed = hasRasterLayer(document)

  const run = async () => {
    if (visibleLayers.length === 0) {
      notify({
        reason: '내보낼 내용이 없습니다.',
        hint: '레이어를 하나 이상 가져오거나, 숨겨둔 레이어를 다시 켜 주세요.',
        tone: 'error',
      })
      return
    }

    setWorking(true)
    try {
      const result = await exportDocument(document, {
        format,
        scale,
        transparent,
        background,
        quality,
      })
      downloadBlob(result.blob, result.fileName)
      onClose()
    } catch {
      notify({
        reason: '내보내는 중 문제가 생겼습니다.',
        hint: '배율을 낮추거나 레이어 수를 줄인 뒤 다시 시도해 주세요.',
        tone: 'error',
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Text variant="ui16" as="h2">
            내보내기
          </Text>
          <button type="button" onClick={onClose} className="text-fg-tertiary hover:text-fg-primary">
            <Text variant="ui14" as="span">
              ✕
            </Text>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex gap-2">
            {(['svg', 'png', 'jpeg'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormat(option)}
                className={`flex-1 rounded-md border py-2 ${
                  format === option
                    ? 'border-blue-800 bg-blue-50'
                    : 'border-border hover:bg-surface-minimal'
                }`}
              >
                <Text
                  variant="ui13"
                  as="span"
                  color={format === option ? 'text-blue-800' : 'text-fg-secondary'}
                >
                  {FORMAT_LABEL[option]}
                </Text>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-surface-minimal px-3 py-3">
            <Text variant="caption12" as="h3" color="text-fg-tertiary">
              저장 크기
            </Text>
            <NumberField
              label="가로"
              suffix="px"
              value={document.canvas.width}
              onChange={(width) => setCanvasSize(width, document.canvas.height)}
            />
            <NumberField
              label="세로"
              suffix="px"
              value={document.canvas.height}
              onChange={(height) => setCanvasSize(document.canvas.width, height)}
            />
            <button
              type="button"
              onClick={() => fitCanvasToContent(40)}
              className="mt-1 rounded-md border border-border bg-surface py-1.5 hover:bg-surface-minimal"
            >
              <Text variant="caption12" as="span" color="text-fg-secondary">
                내용에 맞춰 자르기
              </Text>
            </button>
          </div>

          {format === 'png' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Text variant="ui13" as="span" color="text-fg-secondary">
                  배율
                </Text>
                <div className="flex gap-1">
                  {[1, 2, 4].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setScale(option)}
                      className={`rounded border px-2.5 py-1 ${
                        scale === option
                          ? 'border-blue-800 bg-blue-50'
                          : 'border-border hover:bg-surface-minimal'
                      }`}
                    >
                      <Text
                        variant="caption12"
                        as="span"
                        color={scale === option ? 'text-blue-800' : 'text-fg-secondary'}
                      >
                        {option}x
                      </Text>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between">
                <Text variant="ui13" as="span" color="text-fg-secondary">
                  투명 배경
                </Text>
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(event) => setTransparent(event.target.checked)}
                  className="h-4 w-4 accent-blue-800"
                />
              </label>
            </div>
          )}

          {format === 'jpeg' && (
            <div className="flex flex-col gap-3">
              <SliderField
                label="품질"
                value={quality}
                min={0.3}
                max={1}
                step={0.01}
                onChange={setQuality}
              />
              <Text variant="caption12" color="text-fg-tertiary">
                JPEG는 투명 배경을 담을 수 없어 캔버스 배경색({background})으로 채워집니다.
              </Text>
            </div>
          )}

          {format === 'svg' && rasterMixed && (
            <div className="rounded-lg border border-border bg-surface-minimal px-3 py-2">
              <Text variant="caption12" color="text-fg-secondary">
                이미지 레이어가 포함되어 있습니다. 벡터 레이어는 확대해도 선명한 경로로
                저장되지만, 이미지 레이어는 그림으로 구워져 들어갑니다.
              </Text>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 hover:bg-surface-minimal"
          >
            <Text variant="ui13" as="span" color="text-fg-secondary">
              취소
            </Text>
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={working}
            className="flex-1 rounded-md bg-blue-800 py-2 disabled:opacity-50"
          >
            <Text variant="ui13" as="span" color="text-fg-inverse">
              {working ? '만드는 중…' : '저장'}
            </Text>
          </button>
        </div>
      </div>
    </div>
  )
}
