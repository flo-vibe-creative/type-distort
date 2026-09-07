'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToLocal } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { dragWarpHandles, supportsMultiSelect } from '@/lib/warp/handles'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

interface WarpDrag {
  layerId: string
  handleId: string
  /** 함께 움직일 조작점들 */
  selection: string[]
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

  const beginWarpDrag = useCallback((layerId: string, handleId: string, additive: boolean) => {
    const state = useEditorStore.getState()
    const layer = state.document.layers.find((item) => item.id === layerId)
    if (!layer) return

    const multiSelectable = supportsMultiSelect(layer.warp.type)
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
    dragRef.current = { layerId, handleId, selection }
    setActive(true)
  }, [])

  useEffect(() => {
    if (!active) return

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const state = useEditorStore.getState()
      const layer = state.document.layers.find((item) => item.id === drag.layerId)
      if (!layer) return

      const local = canvasToLocal(layer.transform, toCanvasPoint(event))
      const patch = dragWarpHandles(
        layer.warp,
        warpDomainSize(layer),
        drag.handleId,
        drag.selection,
        local
      )
      if (patch) state.updateWarpParams(drag.layerId, patch)
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
