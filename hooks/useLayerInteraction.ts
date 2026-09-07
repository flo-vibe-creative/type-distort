'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayerTransform } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { frameBounds } from '@/lib/render/canvasBounds'
import { resizeTransform, rotateTransform, type HandleId } from '@/lib/render/layerFrame'
import { isDragMeaningful } from '@/lib/render/marquee'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

type InteractionKind = 'move' | 'resize' | 'rotate'

interface Interaction {
  kind: InteractionKind
  /** 크기 조절·회전의 기준이 되는 레이어 */
  layerId: string
  handle: HandleId | null
  startTransform: LayerTransform
  bounds: Bounds
  startPointer: Point
  /** 함께 옮길 레이어들의 처음 배치 */
  movingFrom: Record<string, LayerTransform>
  /**
   * 여러 개를 골라 둔 상태에서 그중 하나를 눌렀을 때, 끌지 않고 놓으면 그 하나만 남긴다.
   * 끌기 시작할 때 선택을 줄여버리면 함께 옮길 수가 없어 놓는 시점에 판단한다.
   */
  collapseTo: string | null
}

/**
 * 캔버스 위에서 레이어를 옮기고, 늘리고, 돌리는 조작.
 *
 * 여러 개를 골라 두었으면 옮기기는 전부 함께 움직이고,
 * 크기 조절과 회전은 기준이 하나여야 하므로 한 개만 골랐을 때만 쓸 수 있다.
 * 드래그가 캔버스 밖으로 나가도 끊기지 않도록 창 전체에서 포인터를 좇는다.
 */
export function useLayerInteraction(toCanvasPoint: (event: PointerEvent) => Point) {
  const [active, setActive] = useState(false)
  const interactionRef = useRef<Interaction | null>(null)

  const begin = useCallback(
    (kind: InteractionKind, layerId: string, handle: HandleId | null, pointer: Point) => {
      const state = useEditorStore.getState()
      const layer = state.document.layers.find((item) => item.id === layerId)
      if (!layer) return

      const movingIds = kind === 'move' ? state.selectedLayerIds : [layerId]
      const movingFrom: Record<string, LayerTransform> = {}
      for (const id of movingIds) {
        const target = state.document.layers.find((item) => item.id === id)
        if (target) movingFrom[id] = { ...target.transform }
      }

      state.beginGesture()
      interactionRef.current = {
        kind,
        layerId,
        handle,
        startTransform: { ...layer.transform },
        bounds: frameBounds(layer, state.viewport.zoom),
        startPointer: pointer,
        movingFrom,
        collapseTo: kind === 'move' && movingIds.length > 1 ? layerId : null,
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
        const updates: Record<string, Partial<LayerTransform>> = {}
        for (const [id, from] of Object.entries(interaction.movingFrom)) {
          updates[id] = { x: from.x + dx, y: from.y + dy }
        }
        useEditorStore.getState().updateTransforms(updates)
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

    const onUp = (event: PointerEvent) => {
      const interaction = interactionRef.current
      interactionRef.current = null
      const state = useEditorStore.getState()
      state.endGesture()
      setActive(false)

      // 끌지 않고 그냥 눌렀다 놓은 것이라면 누른 레이어 하나만 골라 둔다
      if (
        interaction?.collapseTo &&
        !isDragMeaningful(interaction.startPointer, toCanvasPoint(event), state.viewport.zoom)
      ) {
        state.selectLayers([interaction.collapseTo])
      }
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
