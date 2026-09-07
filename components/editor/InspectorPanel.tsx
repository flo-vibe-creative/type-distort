'use client'

import { NumberField } from '@/components/editor/NumberField'
import { Text } from '@/components/ui/Text'
import { useEditorStore } from '@/store/editorStore'

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
        <div className="flex flex-1 items-center justify-center px-4">
          <Text variant="ui13" align="center" color="text-fg-tertiary">
            다음 단계에서 구현합니다
          </Text>
        </div>
      )}
    </aside>
  )
}
