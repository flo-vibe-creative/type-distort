'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayerTransform } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { warpedBounds } from '@/lib/render/layerBounds'
import { resizeTransform, rotateTransform, type HandleId } from '@/lib/render/layerFrame'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

type InteractionKind = 'move' | 'resize' | 'rotate'

interface Interaction {
  kind: InteractionKind
  layerId: string
  handle: HandleId | null
  startTransform: LayerTransform
  bounds: Bounds
  startPointer: Point
}

/**
 * 캔버스 위에서 레이어를 옮기고, 늘리고, 돌리는 조작을 한곳에서 다룬다.
 *
 * 드래그가 캔버스 밖으로 나가도 끊기지 않도록 창 전체에서 포인터를 좇는다.
 * @param toCanvasPoint 화면 좌표를 캔버스 좌표로 바꾸는 함수
 */
export function useLayerInteraction(toCanvasPoint: (event: PointerEvent) => Point) {
  const [active, setActive] = useState(false)
  const interactionRef = useRef<Interaction | null>(null)

  const begin = useCallback(
    (kind: InteractionKind, layerId: string, handle: HandleId | null, pointer: Point) => {
      const layer = useEditorStore.getState().document.layers.find((l) => l.id === layerId)
      if (!layer) return
      useEditorStore.getState().beginGesture()
      interactionRef.current = {
        kind,
        layerId,
        handle,
        startTransform: { ...layer.transform },
        bounds: warpedBounds(layer),
        startPointer: pointer,
      }
      setActive(true)
    },
    []
  )

  useEffect(() => {
    if (!active) return

    const onMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return
      const pointer = toCanvasPoint(event)
      const { startTransform, bounds, startPointer } = interaction

      if (interaction.kind === 'move') {
        let dx = pointer.x - startPointer.x
        let dy = pointer.y - startPointer.y
        // Shift를 누르면 더 많이 움직인 방향으로만 간다
        if (event.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        useEditorStore.getState().updateTransform(interaction.layerId, {
          x: startTransform.x + dx,
          y: startTransform.y + dy,
        })
        return
      }

      if (interaction.kind === 'resize' && interaction.handle) {
        const next = resizeTransform(startTransform, bounds, interaction.handle, pointer, {
          preserveRatio: event.shiftKey,
        })
        useEditorStore.getState().updateTransform(interaction.layerId, next)
        return
      }

      const next = rotateTransform(startTransform, bounds, startPointer, pointer, event.shiftKey)
      useEditorStore.getState().updateTransform(interaction.layerId, next)
    }

    const onUp = () => {
      interactionRef.current = null
      useEditorStore.getState().endGesture()
      setActive(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [active, toCanvasPoint])

  return {
    /** 조작 중인지 — 렌더 정밀도를 낮춰 반응 속도를 지키는 데 쓴다 */
    dragging: active,
    beginMove: (layerId: string, pointer: Point) => begin('move', layerId, null, pointer),
    beginResize: (layerId: string, handle: HandleId, pointer: Point) =>
      begin('resize', layerId, handle, pointer),
    beginRotate: (layerId: string, pointer: Point) => begin('rotate', layerId, null, pointer),
  }
}
