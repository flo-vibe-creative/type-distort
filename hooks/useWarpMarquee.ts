'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bounds } from '@/lib/geometry/bbox'
import { isDragMeaningful, rectFromPoints } from '@/lib/render/marquee'
import { handleIdsWithin } from '@/lib/render/warpSelection'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

interface MarqueeState {
  start: Point
  /** Shift를 누른 채 시작했다면 이미 골라 둔 점들에 더한다 */
  additive: boolean
  base: string[]
  /** 끌지 않고 그냥 눌렀다 놓았을 때 할 일 (줄 단위 선택 등) */
  onTap: (() => void) | null
}

/**
 * 점 편집 중에 끌어 사각형을 그리면 그 안에 든 조작점들을 골라 준다.
 * 끄는 동안 선택이 바로바로 보이고, 거의 움직이지 않았다면 그냥 누른 것으로 처리한다.
 */
export function useWarpMarquee(toCanvasPoint: (event: PointerEvent) => Point) {
  const [rect, setRect] = useState<Bounds | null>(null)
  const marqueeRef = useRef<MarqueeState | null>(null)

  const beginMarquee = useCallback((point: Point, additive: boolean, onTap?: () => void) => {
    const state = useEditorStore.getState()
    marqueeRef.current = {
      start: point,
      additive,
      base: additive ? state.selectedWarpHandles : [],
      onTap: onTap ?? null,
    }
    setRect({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y })
  }, [])

  useEffect(() => {
    if (!rect) return

    const selectionFor = (area: Bounds) => {
      const marquee = marqueeRef.current
      const state = useEditorStore.getState()
      const layer = state.document.layers.find((item) => item.id === state.editingWarpLayerId)
      if (!marquee || !layer) return null

      const inside = handleIdsWithin(layer, area)
      if (!marquee.additive) return inside
      // 이미 골라 둔 것에 더하되 같은 점이 두 번 들어가지 않게 한다
      return [...marquee.base, ...inside.filter((id) => !marquee.base.includes(id))]
    }

    const onMove = (event: PointerEvent) => {
      const marquee = marqueeRef.current
      if (!marquee) return
      const area = rectFromPoints(marquee.start, toCanvasPoint(event))
      setRect(area)
      const selection = selectionFor(area)
      if (selection) useEditorStore.getState().setWarpHandleSelection(selection)
    }

    const onUp = (event: PointerEvent) => {
      const marquee = marqueeRef.current
      marqueeRef.current = null
      setRect(null)
      if (!marquee) return

      const end = toCanvasPoint(event)
      const state = useEditorStore.getState()
      if (!isDragMeaningful(marquee.start, end, state.viewport.zoom)) {
        if (marquee.onTap) marquee.onTap()
        else if (!marquee.additive) state.clearWarpHandleSelection()
        return
      }

      const selection = selectionFor(rectFromPoints(marquee.start, end))
      if (selection) state.setWarpHandleSelection(selection)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [rect, toCanvasPoint])

  return { warpMarqueeRect: rect, beginWarpMarquee: beginMarquee }
}
