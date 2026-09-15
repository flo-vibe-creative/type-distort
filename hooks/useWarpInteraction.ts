'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToLocal } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { dragWarpHandles, supportsMultiSelect, warpHandlePosition } from '@/lib/warp/handles'
import { invertStackPoint, splitStack } from '@/lib/warp/stack'
import { activeWarpOf } from '@/lib/warp/stackHandles'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

interface WarpDrag {
  layerId: string
  /** 끄고 있는 왜곡 효과 */
  effectId: string
  handleId: string
  /** 함께 움직일 조작점들 */
  selection: string[]
  /** 잡은 자리와 조작점 사이 간격 (레이어 좌표) — 잡는 순간 조작점이 포인터로 튀지 않게 한다 */
  grabOffset: Point
  /** 직전에 역계산한 자리 — 다음 역계산의 시작점으로 써서 빨리, 튀지 않게 수렴시킨다 */
  lastSolved: Point
}

/**
 * 왜곡 조작점을 고르고 끄는 동작.
 *
 * 피그마처럼 그냥 누르면 하나만 골라지고, Shift를 누른 채 누르면 골라 둔 것에 더하거나 뺀다.
 * 여러 개를 골라 둔 상태에서 그중 하나를 끌면 나머지도 같은 거리만큼 함께 움직인다.
 */
export function useWarpInteraction(toCanvasPoint: (event: PointerEvent) => Point) {
  const [active, setActive] = useState(false)
  const dragRef = useRef<WarpDrag | null>(null)

  const beginWarpDrag = useCallback(
    (layerId: string, handleId: string, additive: boolean, pointer?: Point) => {
      const state = useEditorStore.getState()
      const layer = state.document.layers.find((item) => item.id === layerId)
      if (!layer) return
      const size = warpDomainSize(layer)
      const activeWarp = activeWarpOf(layer.warps, state.activeWarpId, size)
      if (!activeWarp) return
      const { effect } = activeWarp

      const multiSelectable = supportsMultiSelect(effect.type)
      const current = multiSelectable ? state.selectedWarpHandles : []
      let selection: string[]

      if (additive && multiSelectable) {
        if (current.includes(handleId)) {
          // 이미 골라 둔 점을 Shift로 다시 누르면 선택에서 뺀다 (끌지는 않는다)
          state.setWarpHandleSelection(current.filter((id) => id !== handleId))
          return
        }
        selection = [...current, handleId]
      } else {
        // 이미 여러 개를 골라 둔 상태에서 그중 하나를 누르면 선택을 유지한 채 함께 끈다
        selection = current.includes(handleId) ? current : [handleId]
      }

      state.setWarpHandleSelection(selection)
      state.beginGesture()

      // 화면에 보이는 자리는 뒤 효과까지 거친 자리라, 이 효과 기준 자리로 거꾸로 풀어 간격을 잰다
      let grabOffset = { x: 0, y: 0 }
      const handlePosition = warpHandlePosition(effect, size, handleId)
      let lastSolved = handlePosition ?? { x: 0, y: 0 }
      if (pointer && handlePosition) {
        const grabbed = invertStackPoint(
          activeWarp.after,
          canvasToLocal(layer.transform, pointer),
          size,
          handlePosition
        )
        grabOffset = { x: handlePosition.x - grabbed.x, y: handlePosition.y - grabbed.y }
        lastSolved = grabbed
      }

      dragRef.current = {
        layerId,
        effectId: effect.id,
        handleId,
        selection,
        grabOffset,
        lastSolved,
      }
      setActive(true)
    },
    []
  )

  useEffect(() => {
    if (!active) return

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const state = useEditorStore.getState()
      const layer = state.document.layers.find((item) => item.id === drag.layerId)
      if (!layer) return
      const split = splitStack(layer.warps, drag.effectId)
      if (!split) return

      const size = warpDomainSize(layer)
      const solved = invertStackPoint(
        split.after,
        canvasToLocal(layer.transform, toCanvasPoint(event)),
        size,
        drag.lastSolved
      )
      drag.lastSolved = solved
      const local = { x: solved.x + drag.grabOffset.x, y: solved.y + drag.grabOffset.y }
      const patch = dragWarpHandles(split.effect, size, drag.handleId, drag.selection, local)
      if (patch) state.updateWarpParams(drag.layerId, drag.effectId, patch)
    }

    const onUp = () => {
      dragRef.current = null
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

  return { dragging: active, beginWarpDrag }
}
