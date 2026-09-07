import type { EditorDocument, Layer } from '@/lib/document/types'
import { boundsOfPoints, mergeBounds, type Bounds } from '@/lib/geometry/bbox'
import { warpedBounds } from '@/lib/render/layerBounds'
import { frameCorners } from '@/lib/render/layerFrame'

/** 배치까지 적용한 뒤 레이어가 캔버스에서 차지하는 범위 */
export function canvasBoundsOfLayer(layer: Layer): Bounds | null {
  return boundsOfPoints(frameCorners(layer.transform, warpedBounds(layer)))
}

/** 보이는 레이어 전체를 감싸는 범위. 보이는 레이어가 없으면 null. */
export function contentBounds(document: EditorDocument): Bounds | null {
  let bounds: Bounds | null = null
  for (const layer of document.layers) {
    if (!layer.visible) continue
    bounds = mergeBounds(bounds, canvasBoundsOfLayer(layer))
  }
  return bounds
}
