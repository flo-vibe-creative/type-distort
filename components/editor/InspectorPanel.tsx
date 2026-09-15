'use client'

import { CanvasBackgroundSection } from '@/components/editor/CanvasBackgroundSection'
import { CanvasSizeSection } from '@/components/editor/CanvasSizeSection'
import { ColorField } from '@/components/editor/ColorField'
import { NumberField } from '@/components/editor/NumberField'
import { PanelSection } from '@/components/editor/PanelSection'
import { SliderField } from '@/components/editor/SliderField'
import { WarpStackSection } from '@/components/editor/WarpStackSection'
import { Text } from '@/components/ui/Text'
import { glyphCountOf } from '@/lib/render/letterSpacing'
import { useEditorStore } from '@/store/editorStore'

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <Text variant="ui13" align="center" color="text-fg-tertiary">
        {children}
      </Text>
    </div>
  )
}

export function InspectorPanel() {
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const layers = useEditorStore((state) => state.document.layers)
  const updateTransform = useEditorStore((state) => state.updateTransform)
  const resetWarpEffects = useEditorStore((state) => state.resetWarpEffects)
  const setLetterSpacing = useEditorStore((state) => state.setLetterSpacing)
  const setLayerFill = useEditorStore((state) => state.setLayerFill)
  const editingWarpLayerId = useEditorStore((state) => state.editingWarpLayerId)
  const beginWarpEditing = useEditorStore((state) => state.beginWarpEditing)
  const endWarpEditing = useEditorStore((state) => state.endWarpEditing)

  const selected = layers.filter((layer) => selectedLayerIds.includes(layer.id))
  const layer = selected.length === 1 ? selected[0] : null
  const editing = layer !== null && layer.id === editingWarpLayerId

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border">
      {selected.length === 0 && (
        <>
          <div className="border-b border-border px-4 py-3">
            <Text variant="caption12" color="text-fg-tertiary">
              레이어를 클릭하면 그 레이어 설정이 나옵니다. 아래는 대지 전체에 걸리는 설정입니다.
            </Text>
          </div>
          <CanvasSizeSection />
          <CanvasBackgroundSection />
        </>
      )}

      {selected.length > 1 && (
        <EmptyMessage>
          레이어 {selected.length}개를 골랐습니다
          <br />
          끌어서 함께 옮기고, 모서리로 함께 키우고,
          <br />
          모서리 바깥에서 함께 돌릴 수 있습니다
          <br />
          세부 설정은 하나만 골랐을 때 조절합니다
        </EmptyMessage>
      )}

      {layer && editing && (
        <div className="border-b border-border bg-blue-50 px-4 py-3">
          <div className="mb-1 flex items-center justify-between">
            <Text variant="ui13" as="span" color="text-blue-800">
              점 편집 중
            </Text>
            <button
              type="button"
              onClick={endWarpEditing}
              className="rounded border border-blue-800 px-2 py-0.5 text-blue-800"
            >
              <Text variant="caption12" as="span" color="text-blue-800">
                나가기
              </Text>
            </button>
          </div>
          <Text variant="caption12" color="text-fg-secondary">
            어디서든 끌어 점을 감싸 고르고, Shift로 더하거나 뺍니다. 메쉬는 격자의 가로줄·세로줄을
            누르면 그 줄의 네 점이 통째로 골라집니다. 이 동안에는 레이어가 움직이지 않습니다. 글자
            바깥 빈 곳을 한 번 누르면 점 편집에서 나가고, 글자 위를 누르면 골라 둔 점만 놓아줍니다.
          </Text>
        </div>
      )}

      {layer && !editing && (
        <div className="border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => beginWarpEditing(layer.id)}
            className="w-full rounded-md border border-border py-1.5 hover:bg-surface-minimal"
          >
            <Text variant="ui13" as="span" color="text-fg-secondary">
              점 편집 (레이어 더블클릭)
            </Text>
          </button>
        </div>
      )}

      {layer && (
        <>
          <PanelSection title="위치">
            <NumberField
              label="X"
              value={layer.transform.x}
              onChange={(x) => updateTransform(layer.id, { x })}
            />
            <NumberField
              label="Y"
              value={layer.transform.y}
              onChange={(y) => updateTransform(layer.id, { y })}
            />
          </PanelSection>

          <PanelSection title="색">
            {layer.source.kind === 'vector' ? (
              <>
                <ColorField
                  label="글자 색"
                  value={layer.fillOverride}
                  fallback={layer.source.shapes[0]?.fill ?? '#000000'}
                  onChange={(color) => setLayerFill(layer.id, color)}
                />
                {layer.fillOverride !== null && (
                  <button
                    type="button"
                    onClick={() => setLayerFill(layer.id, null)}
                    className="rounded-md border border-border py-1.5 hover:bg-surface-minimal"
                  >
                    <Text variant="caption12" as="span" color="text-fg-secondary">
                      원래 색으로 되돌리기
                    </Text>
                  </button>
                )}
                <Text variant="caption12" color="text-fg-tertiary">
                  {layer.fillOverride === null
                    ? '지금은 가져온 SVG의 색을 그대로 쓰고 있습니다. 색을 고르면 글자 전체가 그 색으로 칠해집니다.'
                    : '가져온 SVG에 여러 색이 있었다면 모두 이 색으로 덮입니다.'}
                </Text>
              </>
            ) : (
              <Text variant="caption12" color="text-fg-tertiary">
                이미지 레이어는 색을 바꿀 수 없습니다. SVG로 가져오면 색을 고를 수 있습니다.
              </Text>
            )}
          </PanelSection>

          <WarpStackSection layer={layer} />

          <PanelSection title="글자">
            {layer.source.kind === 'vector' ? (
              <>
                <SliderField
                  label="자간"
                  min={-0.3}
                  max={1.5}
                  step={0.01}
                  suffix="%"
                  displayScale={100}
                  value={layer.letterSpacing}
                  onChange={(value) => setLetterSpacing(layer.id, value)}
                />
                <Text variant="caption12" color="text-fg-tertiary">
                  {glyphCountOf(layer.source.shapes)}개의 글자로 나뉘었습니다. 숫자가 실제와 다르면
                  글자끼리 겹쳐 있는 것이니, 디자인 툴에서 자간을 조금 벌려 다시 내보내 주세요.
                </Text>
              </>
            ) : (
              <Text variant="caption12" color="text-fg-tertiary">
                이미지 레이어는 글자 단위를 알 수 없어 자간을 조절할 수 없습니다. SVG로 가져오면
                조절할 수 있습니다.
              </Text>
            )}
          </PanelSection>

          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => resetWarpEffects(layer.id)}
              className="w-full rounded-md border border-border py-1.5 hover:bg-surface-minimal"
            >
              <Text variant="caption12" as="span" color="text-fg-secondary">
                왜곡 초기화
              </Text>
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
