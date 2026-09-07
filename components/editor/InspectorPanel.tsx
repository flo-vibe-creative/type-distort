'use client'

import { NumberField } from '@/components/editor/NumberField'
import { SliderField } from '@/components/editor/SliderField'
import { Text } from '@/components/ui/Text'
import { glyphCountOf } from '@/lib/render/letterSpacing'
import { WARP_EFFECTS, WARP_TYPES } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

/** 효과마다 캔버스에서 무엇을 끌면 되는지 알려준다 */
const WARP_GUIDE: Record<WarpType, string> = {
  arc: '양 끝의 흰 점을 위아래로 끌면 휘는 정도가 바뀌고, 가운데 보라색 점을 끌면 글자가 곡선의 어디에 올라앉을지(기준선)가 바뀝니다. 아래로 내리면 곡선 위에 서고, 위로 올리면 매달립니다.',
  mesh: '격자의 점 16개를 각각 끌어 자유롭게 변형합니다. 빈 곳에서 끌어 사각형으로 감싸거나 Shift를 누른 채 눌러 여러 점을 고를 수 있고, 그 상태에서 하나를 끌면 전부 함께 움직입니다. 네 귀퉁이 점은 모서리와 정확히 붙어 움직입니다.',
  perspective: '네 모서리 점을 끌어 원근을 만듭니다. 빈 곳에서 끌어 감싸거나 Shift를 누른 채 눌러 여러 모서리를 골라 함께 옮길 수 있습니다. 위쪽을 좁히면 멀어지는 느낌이 납니다.',
  bulge: '가운데 점을 끌어 중심을 옮기고, 오른쪽 점을 끌어 영향 범위를 정합니다. 세기를 음수로 하면 오목해집니다.',
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-3">
      <div className="mb-2">
        <Text variant="caption12" as="h3" color="text-fg-tertiary">
          {title}
        </Text>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

export function InspectorPanel() {
  const mode = useEditorStore((state) => state.mode)
  const setMode = useEditorStore((state) => state.setMode)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const layer = useEditorStore((state) =>
    state.document.layers.find((item) => item.id === state.selectedLayerId)
  )
  const updateTransform = useEditorStore((state) => state.updateTransform)
  const setWarpType = useEditorStore((state) => state.setWarpType)
  const updateWarpParams = useEditorStore((state) => state.updateWarpParams)
  const setLetterSpacing = useEditorStore((state) => state.setLetterSpacing)

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border">
      <div className="flex shrink-0 border-b border-border">
        {(['transform', 'warp'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`flex-1 border-b-2 px-4 py-3 ${
              mode === tab ? 'border-fg-primary' : 'border-transparent'
            }`}
          >
            <Text
              variant="ui14"
              as="span"
              color={mode === tab ? 'text-fg-primary' : 'text-fg-tertiary'}
            >
              {tab === 'transform' ? '배치' : '왜곡'}
            </Text>
          </button>
        ))}
      </div>

      {!layer || !selectedLayerId ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <Text variant="ui13" align="center" color="text-fg-tertiary">
            레이어를 선택하면
            <br />
            설정이 표시됩니다
          </Text>
        </div>
      ) : mode === 'transform' ? (
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

          <PanelSection title="크기">
            <NumberField
              label="가로"
              suffix="%"
              value={layer.transform.scaleX * 100}
              onChange={(percent) => updateTransform(layer.id, { scaleX: percent / 100 })}
            />
            <NumberField
              label="세로"
              suffix="%"
              value={layer.transform.scaleY * 100}
              onChange={(percent) => updateTransform(layer.id, { scaleY: percent / 100 })}
            />
          </PanelSection>

          <PanelSection title="회전">
            <NumberField
              label="각도"
              suffix="°"
              value={layer.transform.rotation}
              onChange={(rotation) => updateTransform(layer.id, { rotation })}
            />
          </PanelSection>

          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() =>
                updateTransform(layer.id, { scaleX: 1, scaleY: 1, rotation: 0 })
              }
              className="w-full rounded-md border border-border py-2 hover:bg-surface-minimal"
            >
              <Text variant="ui13" as="span" color="text-fg-secondary">
                크기·회전 초기화
              </Text>
            </button>
          </div>
        </>
      ) : (
        <>
          <PanelSection title="효과">
            <select
              value={layer.warp.type}
              onChange={(event) => setWarpType(layer.id, event.target.value as WarpType)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] leading-[18px] outline-none focus:border-blue-800"
            >
              {WARP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {WARP_EFFECTS[type].label}
                </option>
              ))}
            </select>
          </PanelSection>

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
                  {glyphCountOf(layer.source.shapes)}개의 글자로 나뉘었습니다. 숫자가 실제와
                  다르면 글자끼리 겹쳐 있는 것이니, 디자인 툴에서 자간을 조금 벌려 다시
                  내보내 주세요.
                </Text>
              </>
            ) : (
              <Text variant="caption12" color="text-fg-tertiary">
                이미지 레이어는 글자 단위를 알 수 없어 자간을 조절할 수 없습니다. SVG로 가져오면
                조절할 수 있습니다.
              </Text>
            )}
          </PanelSection>

          {WARP_EFFECTS[layer.warp.type].sliders.length > 0 && (
            <PanelSection title="세부 조절">
              {WARP_EFFECTS[layer.warp.type].sliders.map((slider) => (
                <SliderField
                  key={slider.key}
                  label={slider.label}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  suffix={slider.unit}
                  displayScale={slider.displayScale}
                  value={Number((layer.warp.params as unknown as Record<string, number>)[slider.key] ?? 0)}
                  onChange={(value) => updateWarpParams(layer.id, { [slider.key]: value })}
                />
              ))}
            </PanelSection>
          )}

          <PanelSection title="조작 방법">
            <Text variant="caption12" color="text-fg-tertiary">
              {WARP_GUIDE[layer.warp.type]}
            </Text>
          </PanelSection>

          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setWarpType(layer.id, layer.warp.type)}
              className="w-full rounded-md border border-border py-2 hover:bg-surface-minimal"
            >
              <Text variant="ui13" as="span" color="text-fg-secondary">
                왜곡 초기화
              </Text>
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
