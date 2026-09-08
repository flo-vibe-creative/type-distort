'use client'

import { useRef } from 'react'
import { ColorField } from '@/components/editor/ColorField'
import { PanelSection } from '@/components/editor/PanelSection'
import { SliderField } from '@/components/editor/SliderField'
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
  cover: '대지를 꽉 채우고 넘치는 부분은 잘립니다. 아래에서 어느 쪽을 남길지 정할 수 있고, 어떻게 옮겨도 여백은 생기지 않습니다.',
  contain: '이미지 전체가 보이도록 넣고 남는 곳은 배경색이 비칩니다.',
  stretch: '비율을 무시하고 대지에 정확히 맞춥니다.',
}

/** 항목 이름과 조작을 한 줄로 놓는다 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Text variant="ui13" as="span" color="text-fg-secondary">
        {label}
      </Text>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-border px-2 py-1 hover:bg-surface-minimal"
    >
      <Text variant="caption12" as="span" color="text-fg-secondary">
        {children}
      </Text>
    </button>
  )
}

/** 대지 배경 — 색과 이미지를 한 자리에서 정한다 (레이어를 고르지 않았을 때 보인다) */
export function CanvasBackgroundSection() {
  const canvas = useEditorStore((state) => state.document.canvas)
  const setCanvasBackground = useEditorStore((state) => state.setCanvasBackground)
  const setBackgroundHidden = useEditorStore((state) => state.setBackgroundHidden)
  const setCanvasImage = useEditorStore((state) => state.setCanvasImage)
  const setCanvasImageFit = useEditorStore((state) => state.setCanvasImageFit)
  const setCanvasImagePosition = useEditorStore((state) => state.setCanvasImagePosition)
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
    <PanelSection title="배경 채우기">
      <ColorField label="색" value={canvas.background} onChange={setCanvasBackground} />

      <Row label="이미지">
        {canvas.image ? (
          <>
            <SmallButton onClick={() => inputRef.current?.click()}>바꾸기</SmallButton>
            <SmallButton onClick={() => setCanvasImage(null)}>빼기</SmallButton>
          </>
        ) : (
          <SmallButton onClick={() => inputRef.current?.click()}>고르기</SmallButton>
        )}
      </Row>

      {canvas.image && (
        <>
          {previewUrl && (
            <div
              className="h-16 w-full rounded border border-border"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: 'cover',
                backgroundPosition:
                  canvas.imageFit === 'cover'
                    ? `${canvas.imagePosition.x * 100}% ${canvas.imagePosition.y * 100}%`
                    : 'center',
              }}
            />
          )}

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

          {canvas.imageFit === 'cover' && (
            <>
              <SliderField
                label="가로 위치"
                min={0}
                max={1}
                step={0.01}
                suffix="%"
                displayScale={100}
                value={canvas.imagePosition.x}
                onChange={(x) => setCanvasImagePosition({ ...canvas.imagePosition, x })}
              />
              <SliderField
                label="세로 위치"
                min={0}
                max={1}
                step={0.01}
                suffix="%"
                displayScale={100}
                value={canvas.imagePosition.y}
                onChange={(y) => setCanvasImagePosition({ ...canvas.imagePosition, y })}
              />
              <button
                type="button"
                onClick={() => setCanvasImagePosition({ x: 0.5, y: 0.5 })}
                className="rounded-md border border-border py-1.5 hover:bg-surface-minimal"
              >
                <Text variant="caption12" as="span" color="text-fg-secondary">
                  가운데로
                </Text>
              </button>
            </>
          )}
        </>
      )}

      <Row label="투명하게">
        <input
          type="checkbox"
          checked={canvas.backgroundHidden}
          onChange={(event) => setBackgroundHidden(event.target.checked)}
          className="h-4 w-4 accent-blue-800"
        />
      </Row>

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
  )
}
