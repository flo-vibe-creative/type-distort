'use client'

import { useEffect, useRef, useState } from 'react'
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

/** 레이어 이름을 그 자리에서 고치는 칸 — 열리면 바로 글자가 다 골라진 채로 시작한다 */
function NameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      aria-label="레이어 이름"
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onBlur={onCommit}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') onCommit()
        if (event.key === 'Escape') onCancel()
      }}
      className="w-full rounded border border-blue-800 bg-surface px-1 py-0.5 text-[13px] leading-[18px] outline-none"
    />
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
  const renameLayer = useEditorStore((state) => state.renameLayer)
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock)
  const editingWarpLayerId = useEditorStore((state) => state.editingWarpLayerId)
  // 이름을 고치고 있는 레이어와, 고치는 동안의 글자
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null)

  // 배열 뒤쪽이 화면에서 위에 그려지므로 목록은 뒤집어 보여준다
  const ordered = [...layers].reverse()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Text variant="caption12" as="h2" color="text-fg-tertiary">
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
                  onDoubleClick={() => setRenaming({ id: layer.id, draft: layer.name })}
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
                    {renaming?.id === layer.id ? (
                      <NameInput
                        value={renaming.draft}
                        onChange={(draft) => setRenaming({ id: layer.id, draft })}
                        onCommit={() => {
                          renameLayer(layer.id, renaming.draft)
                          setRenaming(null)
                        }}
                        onCancel={() => setRenaming(null)}
                      />
                    ) : (
                      <Text
                        variant="ui13"
                        truncate
                        color={
                          layer.visible && !layer.locked ? 'text-fg-primary' : 'text-fg-disabled'
                        }
                      >
                        {layer.name}
                      </Text>
                    )}
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
                    title={layer.locked ? '잠금 풀기' : '잠그기 — 대지에서 고를 수 없게 합니다'}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleLayerLock(layer.id)
                    }}
                    className={`shrink-0 px-1 ${
                      layer.locked ? '' : 'opacity-30 group-hover:opacity-100'
                    }`}
                  >
                    <Text variant="caption12" as="span">
                      {layer.locked ? '🔒' : '🔓'}
                    </Text>
                  </button>

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
