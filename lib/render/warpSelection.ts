import type { Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { localToCanvas } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { supportsMultiSelect, warpHandles } from '@/lib/warp/handles'
import type { Point } from '@/lib/warp/types'

/** 화면에서 이만큼은 움직여야 영역 선택으로 본다 (px) */
const DRAG_THRESHOLD_PX = 4

/** 두 점을 마주 보는 꼭짓점으로 하는 사각형 */
export function rectFromPoints(a: Point, b: Point): Bounds {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

/** 영역을 그린 것인지, 그냥 한 번 누른 것인지 판단한다 */
export function isDragMeaningful(start: Point, end: Point, zoom: number): boolean {
  const distanceOnScreen = Math.hypot(end.x - start.x, end.y - start.y) * zoom
  return distanceOnScreen >= DRAG_THRESHOLD_PX
}

/**
 * 영역 안에 든 왜곡 조작점들을 골라낸다.
 *
 * 여러 개를 함께 옮길 수 없는 효과(아크·볼록)는 영역으로 골라도 소용이 없으므로 비워 둔다.
 */
export function handleIdsWithin(layer: Layer, rect: Bounds): string[] {
  if (!supportsMultiSelect(layer.warp.type)) return []

  const size = warpDomainSize(layer)
  return warpHandles(layer.warp, size)
    .filter((handle) => {
      const point = localToCanvas(layer.transform, handle.local)
      return (
        point.x >= rect.minX &&
        point.x <= rect.maxX &&
        point.y >= rect.minY &&
        point.y <= rect.maxY
      )
    })
    .map((handle) => handle.id)
}
