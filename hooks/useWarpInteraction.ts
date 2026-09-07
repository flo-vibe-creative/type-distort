'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sourceSize } from '@/lib/document/types'
import { canvasToLocal } from '@/lib/render/layerFrame'
import { dragWarpHandle } from '@/lib/warp/handles'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

interface WarpDrag {
  layerId: string
  handleId: string
}

/**
 * 왜곡 조작점을 끄는 동안 파라미터를 계속 갱신한다.
 * 포인터 위치를 레이어 좌표로 되돌린 뒤 각 효과의 규칙에 맞춰 값으로 바꾼다.
 */
export function useWarpInteraction(toCanvasPoint: (event: PointerEvent) => Point) {
  const [active, setActive] = useState(false)
  const dragRef = useRef<WarpDrag | null>(null)

  const beginWarpDrag = useCallback((layerId: string, handleId: string) => {
    useEditorStore.getState().beginGesture()
    dragRef.current = { layerId, handleId }
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
      const patch = dragWarpHandle(layer.warp, sourceSize(layer.source), drag.handleId, local)
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
