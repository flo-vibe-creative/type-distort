'use client'

import { Text } from '@/components/ui/Text'
import type { Layer } from '@/lib/document/types'
import { useEditorStore } from '@/store/editorStore'

function LayerKindIcon({ layer }: { layer: Layer }) {
  const isVector = layer.source.kind === 'vector'
  return (
    <span
      title={isVector ? '벡터 — SVG로 저장할 수 있습니다' : '이미지 — SVG로 저장하면 그림으로 들어갑니다'}
      className={`flex h-5 shrink-0 items-center justify-center whitespace-nowrap rounded px-1.5 ${
        isVector ? 'bg-blue-50 text-blue-800' : 'bg-surface-primary text-fg-secondary'
      }`}
    >
      <Text variant="caption10" as="span">
        {isVector ? '벡터' : '그림'}
      </Text>
    </span>
  )
}

export function LayerPanel() {
  const layers = useEditorStore((state) => state.document.layers)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectLayers = useEditorStore((state) => state.selectLayers)
  const toggleLayerSelection = useEditorStore((state) => state.toggleLayerSelection)
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility)
  const reorderLayer = useEditorStore((state) => state.reorderLayer)
  const removeLayers = useEditorStore((state) => state.removeLayers)
  const beginWarpEditing = useEditorStore((state) => state.beginWarpEditing)
  const editingWarpLayerId = useEditorStore((state) => state.editingWarpLayerId)

  // 배열 뒤쪽이 화면에서 위에 그려지므로 목록은 뒤집어 보여준다
  const ordered = [...layers].reverse()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Text variant="ui14" as="h2">
          레이어
        </Text>
        <Text variant="caption12" as="span" color="text-fg-tertiary">
          {selectedLayerIds.length > 1
            ? `${selectedLayerIds.length}/${layers.length}개 선택`
            : `${layers.length}개`}
        </Text>
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <Text variant="ui13" align="center" color="text-fg-tertiary">
            아직 레이어가 없습니다
          </Text>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto py-1">
          {ordered.map((layer) => {
            const selected = selectedLayerIds.includes(layer.id)
            return (
              <li key={layer.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    // Shift를 누른 채 누르면 골라 둔 것에 더하거나 뺀다
                    if (event.shiftKey) toggleLayerSelection(layer.id)
                    else selectLayers([layer.id])
                  }}
                  onDoubleClick={() => beginWarpEditing(layer.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectLayers([layer.id])
                    }
                  }}
                  className={`group flex w-full items-center gap-2 px-3 py-2 text-left ${
                    layer.id === editingWarpLayerId
                      ? 'bg-blue-50 ring-1 ring-inset ring-blue-800'
                      : selected
                        ? 'bg-surface-primary'
                        : 'hover:bg-surface-minimal'
                  }`}
                >
                  <LayerKindIcon layer={layer} />
                  <span className="min-w-0 flex-1">
                    <Text
                      variant="ui13"
                      truncate
                      color={layer.visible ? 'text-fg-primary' : 'text-fg-disabled'}
                    >
                      {layer.name}
                    </Text>
                  </span>

                  <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
                    <button
                      type="button"
                      title="위로"
                      onClick={(event) => {
                        event.stopPropagation()
                        reorderLayer(layer.id, 'up')
                      }}
                      className="px-1 text-fg-tertiary hover:text-fg-primary"
                    >
                      <Text variant="caption12" as="span">
                        ↑
                      </Text>
                    </button>
                    <button
                      type="button"
                      title="아래로"
                      onClick={(event) => {
                        event.stopPropagation()
                        reorderLayer(layer.id, 'down')
                      }}
                      className="px-1 text-fg-tertiary hover:text-fg-primary"
                    >
                      <Text variant="caption12" as="span">
                        ↓
                      </Text>
                    </button>
                    <button
                      type="button"
                      title="삭제"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeLayers([layer.id])
                      }}
                      className="px-1 text-fg-tertiary hover:text-semantic-error"
                    >
                      <Text variant="caption12" as="span">
                        ✕
                      </Text>
                    </button>
                  </span>

                  <button
                    type="button"
                    title={layer.visible ? '숨기기' : '보이기'}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleLayerVisibility(layer.id)
                    }}
                    className="shrink-0 px-1 text-fg-tertiary hover:text-fg-primary"
                  >
                    <Text variant="caption12" as="span">
                      {layer.visible ? '👁' : '🚫'}
                    </Text>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
