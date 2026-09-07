'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bounds } from '@/lib/geometry/bbox'
import { isDragMeaningful, layerIdsWithin, rectFromPoints } from '@/lib/render/marquee'
import type { Point } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

interface MarqueeState {
  start: Point
  /** Shift를 누른 채 시작했다면 이미 골라 둔 레이어에 더한다 */
  additive: boolean
  base: string[]
}

/**
 * 빈 곳에서 끌어 사각형을 그리면 그 안에 걸친 레이어들을 골라 준다.
 * 끄는 동안 선택이 바로바로 보이고, 거의 움직이지 않았다면 그냥 누른 것으로 보아 선택을 놓아준다.
 */
export function useLayerMarquee(toCanvasPoint: (event: PointerEvent) => Point) {
  const [rect, setRect] = useState<Bounds | null>(null)
  const marqueeRef = useRef<MarqueeState | null>(null)

  const beginMarquee = useCallback((point: Point, additive: boolean) => {
    const state = useEditorStore.getState()
    marqueeRef.current = {
      start: point,
      additive,
      base: additive ? state.selectedLayerIds : [],
    }
    setRect({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y })
  }, [])

  useEffect(() => {
    if (!rect) return

    const selectionFor = (area: Bounds) => {
      const marquee = marqueeRef.current
      if (!marquee) return null
      const inside = layerIdsWithin(useEditorStore.getState().document.layers, area)
      if (!marquee.additive) return inside
      // 이미 골라 둔 것에 더하되 같은 레이어가 두 번 들어가지 않게 한다
      return [...marquee.base, ...inside.filter((id) => !marquee.base.includes(id))]
    }

    const onMove = (event: PointerEvent) => {
      const marquee = marqueeRef.current
      if (!marquee) return
      const area = rectFromPoints(marquee.start, toCanvasPoint(event))
      setRect(area)
      const selection = selectionFor(area)
      if (selection) useEditorStore.getState().selectLayers(selection)
    }

    const onUp = (event: PointerEvent) => {
      const marquee = marqueeRef.current
      marqueeRef.current = null
      setRect(null)
      if (!marquee) return

      const end = toCanvasPoint(event)
      const state = useEditorStore.getState()
      // 거의 움직이지 않았다면 영역을 그린 것이 아니라 그냥 누른 것이다
      if (!isDragMeaningful(marquee.start, end, state.viewport.zoom)) {
        if (!marquee.additive) state.selectLayers([])
        return
      }

      const selection = selectionFor(rectFromPoints(marquee.start, end))
      if (selection) state.selectLayers(selection)
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

  return { marqueeRect: rect, beginMarquee }
}
