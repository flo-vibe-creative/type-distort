'use client'

import { useRef } from 'react'
import { ColorField } from '@/components/editor/ColorField'
import { PanelSection } from '@/components/editor/PanelSection'
import { Text } from '@/components/ui/Text'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import type { CanvasImageFit } from '@/lib/document/types'
import { loadRasterFile } from '@/lib/raster/loadImage'
import { useEditorStore } from '@/store/editorStore'
import { useNoticeStore } from '@/store/noticeStore'

const FIT_LABEL: Record<CanvasImageFit, string> = {
  cover: '채우기',
  contain: '맞추기',
  stretch: '늘이기',
}

const FIT_HINT: Record<CanvasImageFit, string> = {
  cover: '캔버스를 꽉 채우고 넘치는 부분은 잘립니다.',
  contain: '이미지 전체가 보이도록 넣고 남는 곳은 배경색이 비칩니다.',
  stretch: '비율을 무시하고 캔버스에 정확히 맞춥니다.',
}

/** 캔버스 배경 — 색과 이미지를 정한다 (레이어를 고르지 않았을 때 보인다) */
export function CanvasBackgroundSection() {
  const canvas = useEditorStore((state) => state.document.canvas)
  const setCanvasBackground = useEditorStore((state) => state.setCanvasBackground)
  const setBackgroundHidden = useEditorStore((state) => state.setBackgroundHidden)
  const setCanvasImage = useEditorStore((state) => state.setCanvasImage)
  const setCanvasImageFit = useEditorStore((state) => state.setCanvasImageFit)
  const notify = useNoticeStore((state) => state.notify)

  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = useObjectUrl(canvas.image?.blob)

  const pickImage = async (file: File | undefined) => {
    if (!file) return
    const loaded = await loadRasterFile(file)
    if (!loaded.ok) {
      notify({ reason: loaded.reason, hint: loaded.hint, tone: 'error' })
      return
    }
    setCanvasImage({
      bitmap: loaded.image.bitmap,
      blob: loaded.image.blob,
      width: loaded.image.width,
      height: loaded.image.height,
    })
  }

  return (
    <>
      <PanelSection title="배경색">
        <ColorField label="색" value={canvas.background} onChange={setCanvasBackground} />
        <label className="flex items-center justify-between">
          <Text variant="ui13" as="span" color="text-fg-secondary">
            투명하게
          </Text>
          <input
            type="checkbox"
            checked={canvas.backgroundHidden}
            onChange={(event) => setBackgroundHidden(event.target.checked)}
            className="h-4 w-4 accent-blue-800"
          />
        </label>
        <Text variant="caption12" color="text-fg-tertiary">
          켜면 배경색과 배경 이미지가 모두 감춰져 투명해집니다. 골라 둔 값은 그대로 남아 있어
          체크를 풀면 곧바로 돌아옵니다.
        </Text>
      </PanelSection>

      <PanelSection title="배경 이미지">
        {canvas.image ? (
          <>
            <div className="overflow-hidden rounded border border-border">
              {/* 배경으로 깔린 그림을 그대로 미리 보여준다 */}
              {previewUrl && (
                <div
                  className="h-20 w-full"
                  style={{
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
            </div>

            <div className="flex gap-1">
              {(['cover', 'contain', 'stretch'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => setCanvasImageFit(fit)}
                  className={`flex-1 rounded border py-1 ${
                    canvas.imageFit === fit
                      ? 'border-blue-800 bg-blue-50'
                      : 'border-border hover:bg-surface-minimal'
                  }`}
                >
                  <Text
                    variant="caption12"
                    as="span"
                    color={canvas.imageFit === fit ? 'text-blue-800' : 'text-fg-secondary'}
                  >
                    {FIT_LABEL[fit]}
                  </Text>
                </button>
              ))}
            </div>
            <Text variant="caption12" color="text-fg-tertiary">
              {FIT_HINT[canvas.imageFit]}
            </Text>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 rounded-md border border-border py-1.5 hover:bg-surface-minimal"
              >
                <Text variant="caption12" as="span" color="text-fg-secondary">
                  다른 이미지
                </Text>
              </button>
              <button
                type="button"
                onClick={() => setCanvasImage(null)}
                className="flex-1 rounded-md border border-border py-1.5 hover:bg-surface-minimal"
              >
                <Text variant="caption12" as="span" color="text-fg-secondary">
                  이미지 빼기
                </Text>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-border py-1.5 hover:bg-surface-minimal"
          >
            <Text variant="ui13" as="span" color="text-fg-secondary">
              이미지 고르기
            </Text>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          hidden
          onChange={(event) => {
            void pickImage(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </PanelSection>
    </>
  )
}
