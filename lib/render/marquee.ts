import type { Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { canvasBoundsOfLayer } from '@/lib/render/canvasBounds'
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
  return Math.hypot(end.x - start.x, end.y - start.y) * zoom >= DRAG_THRESHOLD_PX
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

/**
 * 영역에 걸친 레이어들을 고른다.
 * 완전히 감싸지 않고 스치기만 해도 고르는 편이 손에 익은 방식이라 그렇게 한다.
 */
export function layerIdsWithin(layers: readonly Layer[], rect: Bounds): string[] {
  return layers
    .filter((layer) => {
      if (!layer.visible) return false
      const bounds = canvasBoundsOfLayer(layer)
      return bounds !== null && intersects(bounds, rect)
    })
    .map((layer) => layer.id)
}
