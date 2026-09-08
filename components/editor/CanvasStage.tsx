'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayerView } from '@/components/editor/LayerView'
import { MultiSelectionOutline, SelectionFrame } from '@/components/editor/SelectionFrame'
import { WarpHandles, type MeshLine } from '@/components/editor/WarpHandles'
import { Text } from '@/components/ui/Text'
import { useLayerInteraction } from '@/hooks/useLayerInteraction'
import { useLayerMarquee } from '@/hooks/useLayerMarquee'
import { useWarpInteraction } from '@/hooks/useWarpInteraction'
import { useWarpMarquee } from '@/hooks/useWarpMarquee'
import { boundsOfLayers } from '@/lib/render/canvasBounds'
import type { HandleId } from '@/lib/render/layerFrame'
import { overlayStyle, overlayViewBox } from '@/lib/render/overlay'
import { meshColumnHandleIds, meshRowHandleIds } from '@/lib/render/warpSelection'
import type { Point } from '@/lib/warp/types'
import { MAX_ZOOM, MIN_ZOOM, useEditorStore } from '@/store/editorStore'

/** 화면 맞춤 시 캔버스 둘레에 남기는 여백 (px) */
const FIT_PADDING = 64
/** 휠 한 번에 바뀌는 확대 비율 */
const ZOOM_STEP = 1.0015

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const document = useEditorStore((state) => state.document)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectedWarpHandles = useEditorStore((state) => state.selectedWarpHandles)
  const editingWarpLayerId = useEditorStore((state) => state.editingWarpLayerId)
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectLayers = useEditorStore((state) => state.selectLayers)
  const toggleLayerSelection = useEditorStore((state) => state.toggleLayerSelection)

  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  // 사용자가 직접 확대하거나 밀기 전까지는 창 크기에 맞춰 자동으로 다시 맞춘다
  const userAdjustedRef = useRef(false)

  /** 화면 좌표 → 캔버스 좌표 */
  const toCanvasPoint = useCallback((event: { clientX: number; clientY: number }): Point => {
    const container = containerRef.current
    const { zoom, panX, panY } = useEditorStore.getState().viewport
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left - panX) / zoom,
      y: (event.clientY - rect.top - panY) / zoom,
    }
  }, [])

  const interaction = useLayerInteraction(toCanvasPoint)
  const warpInteraction = useWarpInteraction(toCanvasPoint)
  const marquee = useLayerMarquee(toCanvasPoint)
  const warpMarquee = useWarpMarquee(toCanvasPoint)
  const dragging = interaction.dragging || warpInteraction.dragging

  const fitToView = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { clientWidth, clientHeight } = container
    if (clientWidth === 0 || clientHeight === 0) return

    const zoom = Math.min(
      (clientWidth - FIT_PADDING * 2) / document.canvas.width,
      (clientHeight - FIT_PADDING * 2) / document.canvas.height
    )
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
    setViewport({
      zoom: clamped,
      panX: (clientWidth - document.canvas.width * clamped) / 2,
      panY: (clientHeight - document.canvas.height * clamped) / 2,
    })
  }, [document.canvas.width, document.canvas.height, setViewport])

  // 창 크기가 정해지거나 바뀔 때마다 캔버스를 화면에 맞춘다.
  // 사용자가 한 번이라도 직접 확대하거나 화면을 밀었다면 그 시점부터는 건드리지 않는다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const tryFit = () => {
      if (userAdjustedRef.current) return
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      fitToView()
    }

    tryFit()
    const observer = new ResizeObserver(tryFit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [fitToView])

  // 스페이스를 누르고 있는 동안에만 화면을 밀 수 있다 (피그마와 같은 방식)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // 브라우저 기본 확대를 막기 위해 passive가 아닌 리스너로 직접 붙인다
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      userAdjustedRef.current = true
      const rect = container.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top

      const state = useEditorStore.getState().viewport
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom * ZOOM_STEP ** -event.deltaY))
      const ratio = next / state.zoom

      // 커서 아래에 있던 지점이 그대로 커서 아래에 남도록 이동 값을 보정한다
      useEditorStore.getState().setViewport({
        zoom: next,
        panX: pointerX - (pointerX - state.panX) * ratio,
        panY: pointerY - (pointerY - state.panY) * ratio,
      })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (spaceHeld || event.button === 1) {
      event.currentTarget.setPointerCapture(event.pointerId)
      userAdjustedRef.current = true
      setPanning(true)
      return
    }
    if (event.button !== 0) return

    // 실제로 그려진 도형을 눌렀는지 DOM으로 확인한다 — 보이는 그대로가 곧 선택 범위가 된다
    const hit = (event.target as HTMLElement).closest('[data-layer-id]')
    const layerId = hit?.getAttribute('data-layer-id') ?? null
    const state = useEditorStore.getState()

    // 점 편집 중에는 어디서 끌든 조작점을 감싸 고른다 (레이어는 움직이지 않는다)
    if (state.editingWarpLayerId) {
      if (layerId && layerId !== state.editingWarpLayerId) {
        selectLayers([layerId])
        interaction.beginMove(layerId, toCanvasPoint(event))
        return
      }
      warpMarquee.beginWarpMarquee(toCanvasPoint(event), event.shiftKey)
      return
    }

    // 빈 곳에서 끌면 사각형을 그려 레이어 여러 개를 고른다
    if (!layerId) {
      marquee.beginMarquee(toCanvasPoint(event), event.shiftKey)
      return
    }

    if (event.shiftKey) {
      toggleLayerSelection(layerId)
      return
    }

    // 이미 여러 개를 골라 둔 상태에서 그중 하나를 누르면 선택을 유지한 채 함께 옮긴다
    if (!state.selectedLayerIds.includes(layerId)) selectLayers([layerId])
    interaction.beginMove(layerId, toCanvasPoint(event))
  }

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const hit = (event.target as HTMLElement).closest('[data-layer-id]')
    const layerId = hit?.getAttribute('data-layer-id')
    if (layerId) useEditorStore.getState().beginWarpEditing(layerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    useEditorStore.getState().panBy(event.movementX, event.movementY)
  }

  const stopPanning = () => setPanning(false)

  const selectedLayers = useMemo(
    () => document.layers.filter((layer) => selectedLayerIds.includes(layer.id)),
    [document.layers, selectedLayerIds]
  )
  const singleSelected = selectedLayers.length === 1 ? selectedLayers[0] : null
  const multiBounds = useMemo(
    () => (selectedLayers.length > 1 ? boundsOfLayers(selectedLayers) : null),
    [selectedLayers]
  )

  const hasLayers = document.layers.length > 0
  const cursor = panning ? 'grabbing' : spaceHeld ? 'grab' : 'default'

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 flex-1 overflow-hidden bg-surface-minimal"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopPanning}
      onPointerCancel={stopPanning}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="absolute left-0 top-0 shadow-[0_2px_16px_rgba(0,0,0,0.08)]"
        style={{
          width: `${document.canvas.width}px`,
          height: `${document.canvas.height}px`,
          background: document.canvas.background ?? 'transparent',
          transformOrigin: '0 0',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {document.layers.map((layer) => (
          <LayerView
            key={layer.id}
            layer={layer}
            canvasWidth={document.canvas.width}
            canvasHeight={document.canvas.height}
            zoom={viewport.zoom}
            dragging={dragging}
          />
        ))}

        <svg
          viewBox={overlayViewBox(document.canvas.width, document.canvas.height)}
          className="pointer-events-none absolute"
          style={{
            ...overlayStyle(document.canvas.width, document.canvas.height),
            overflow: 'visible',
          }}
        >
          {marquee.marqueeRect && (
            <rect
              x={marquee.marqueeRect.minX}
              y={marquee.marqueeRect.minY}
              width={marquee.marqueeRect.maxX - marquee.marqueeRect.minX}
              height={marquee.marqueeRect.maxY - marquee.marqueeRect.minY}
              fill="rgba(63, 63, 255, 0.08)"
              stroke="#3f3fff"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {warpMarquee.warpMarqueeRect && (
            <rect
              x={warpMarquee.warpMarqueeRect.minX}
              y={warpMarquee.warpMarqueeRect.minY}
              width={warpMarquee.warpMarqueeRect.maxX - warpMarquee.warpMarqueeRect.minX}
              height={warpMarquee.warpMarqueeRect.maxY - warpMarquee.warpMarqueeRect.minY}
              fill="rgba(123, 63, 255, 0.08)"
              stroke="#7b3fff"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {multiBounds && <MultiSelectionOutline bounds={multiBounds} />}

          {!editingWarpLayerId &&
            selectedLayers.map((layer) => (
              <SelectionFrame
                key={layer.id}
                layer={layer}
                zoom={viewport.zoom}
                showHandles={selectedLayers.length === 1}
                onResizeStart={(handle: HandleId, event) => {
                  event.stopPropagation()
                  interaction.beginResize(layer.id, handle, toCanvasPoint(event))
                }}
                onRotateStart={(event) => {
                  event.stopPropagation()
                  interaction.beginRotate(layer.id, toCanvasPoint(event))
                }}
              />
            ))}

          {/* 왜곡 조작점은 하나만 골랐을 때, 선택 상자 위에 그려 먼저 잡히게 한다 */}
          {singleSelected && singleSelected.visible && (
            <WarpHandles
              layer={singleSelected}
              zoom={viewport.zoom}
              editing={editingWarpLayerId === singleSelected.id}
              selectedHandleIds={selectedWarpHandles}
              onHandleDown={(handleId, event) => {
                event.stopPropagation()
                warpInteraction.beginWarpDrag(singleSelected.id, handleId, event.shiftKey)
              }}
              onMeshLineDown={(line: MeshLine, event) => {
                event.stopPropagation()
                const ids =
                  line.kind === 'row' ? meshRowHandleIds(line.index) : meshColumnHandleIds(line.index)
                const additive = event.shiftKey
                // 줄을 눌렀다가 그대로 끌면 영역 선택, 그냥 놓으면 그 줄이 통째로 골라진다
                warpMarquee.beginWarpMarquee(toCanvasPoint(event), additive, () => {
                  const state = useEditorStore.getState()
                  const base = additive ? state.selectedWarpHandles : []
                  state.setWarpHandleSelection([
                    ...base,
                    ...ids.filter((id) => !base.includes(id)),
                  ])
                })
              }}
            />
          )}
        </svg>
      </div>

      {!hasLayers && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Text variant="ui13" align="center" color="text-fg-tertiary">
            SVG 또는 이미지 파일을 여기에 끌어다 놓으세요
          </Text>
        </div>
      )}

      <div
        className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Text variant="caption12" as="span" color="text-fg-secondary">
          {Math.round(viewport.zoom * 100)}%
        </Text>
        <button
          type="button"
          onClick={() => {
            // 다시 맞추면 창 크기를 따라가는 상태로 되돌린다
            userAdjustedRef.current = false
            fitToView()
          }}
          className="text-fg-secondary hover:text-fg-primary"
        >
          <Text variant="caption12" as="span">
            화면 맞춤
          </Text>
        </button>
      </div>
    </div>
  )
}
