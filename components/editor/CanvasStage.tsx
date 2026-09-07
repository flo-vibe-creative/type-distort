'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LayerView } from '@/components/editor/LayerView'
import { TransformHandles } from '@/components/editor/TransformHandles'
import { Text } from '@/components/ui/Text'
import { WarpHandles } from '@/components/editor/WarpHandles'
import { useLayerInteraction } from '@/hooks/useLayerInteraction'
import { useWarpInteraction } from '@/hooks/useWarpInteraction'
import type { HandleId } from '@/lib/render/layerFrame'
import { overlayStyle, overlayViewBox } from '@/lib/render/overlay'
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
  const mode = useEditorStore((state) => state.mode)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const setMode = useEditorStore((state) => state.setMode)

  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  const fittedRef = useRef(false)

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

  // 처음 열렸을 때 캔버스가 화면에 꽉 차게 맞춘다.
  // 레이아웃이 잡히기 전에는 크기가 0이므로, 크기가 정해지는 순간을 지켜보다 한 번만 맞춘다.
  useEffect(() => {
    const container = containerRef.current
    if (!container || fittedRef.current) return

    const tryFit = () => {
      if (fittedRef.current) return
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      fittedRef.current = true
      fitToView()
    }

    tryFit()
    if (fittedRef.current) return

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
      setPanning(true)
      return
    }
    if (event.button !== 0) return

    // 실제로 그려진 도형을 눌렀는지 DOM으로 확인한다 — 보이는 그대로가 곧 선택 범위가 된다
    const hit = (event.target as HTMLElement).closest('[data-layer-id]')
    const layerId = hit?.getAttribute('data-layer-id') ?? null

    if (!layerId) {
      selectLayer(null)
      return
    }

    selectLayer(layerId)
    // 배치 모드에서만 곧바로 끌어 옮긴다 (왜곡 모드에서는 핸들 조작이 우선이다)
    if (useEditorStore.getState().mode === 'transform') {
      interaction.beginMove(layerId, toCanvasPoint(event))
    }
  }

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const hit = (event.target as HTMLElement).closest('[data-layer-id]')
    const layerId = hit?.getAttribute('data-layer-id')
    if (!layerId) return
    selectLayer(layerId)
    setMode('warp')
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    useEditorStore.getState().panBy(event.movementX, event.movementY)
  }

  const stopPanning = () => setPanning(false)

  const selectedLayer = document.layers.find((layer) => layer.id === selectedLayerId) ?? null
  const editable = selectedLayer !== null && selectedLayer.visible
  const showTransformHandles = editable && mode === 'transform'
  const showWarpHandles = editable && mode === 'warp'

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

        {(showTransformHandles || showWarpHandles) && selectedLayer && (
          <svg
            viewBox={overlayViewBox(document.canvas.width, document.canvas.height)}
            className="pointer-events-none absolute"
            style={{
              ...overlayStyle(document.canvas.width, document.canvas.height),
              overflow: 'visible',
            }}
          >
            {showTransformHandles ? (
              <TransformHandles
                layer={selectedLayer}
                zoom={viewport.zoom}
                onResizeStart={(handle: HandleId, event) => {
                  event.stopPropagation()
                  interaction.beginResize(selectedLayer.id, handle, toCanvasPoint(event))
                }}
                onRotateStart={(event) => {
                  event.stopPropagation()
                  interaction.beginRotate(selectedLayer.id, toCanvasPoint(event))
                }}
              />
            ) : (
              <WarpHandles
                layer={selectedLayer}
                zoom={viewport.zoom}
                onHandleDown={(handleId, event) => {
                  event.stopPropagation()
                  warpInteraction.beginWarpDrag(selectedLayer.id, handleId)
                }}
              />
            )}
          </svg>
        )}
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
        <button type="button" onClick={fitToView} className="text-fg-secondary hover:text-fg-primary">
          <Text variant="caption12" as="span">
            화면 맞춤
          </Text>
        </button>
      </div>
    </div>
  )
}
