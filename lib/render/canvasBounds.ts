import type { EditorDocument, Layer } from '@/lib/document/types'
import { boundsOfPoints, mergeBounds, type Bounds } from '@/lib/geometry/bbox'
import { warpedBounds } from '@/lib/render/layerBounds'
import { frameCorners } from '@/lib/render/layerFrame'

/**
 * 선택 상자를 글자에서 이만큼 띄운다 (화면 기준 px).
 * 왜곡 조작점이 모서리에 딱 붙어 있어도 크기 조절 핸들과 겹치지 않게 하려는 여유다.
 */
export const FRAME_PADDING_PX = 9

/**
 * 선택 상자를 그릴 범위 (레이어 좌표계).
 * 화면에서 항상 같은 간격만큼 띄워 보이도록 확대율에 맞춰 여유를 조절한다.
 */
export function frameBounds(layer: Layer, zoom: number): Bounds {
  const bounds = warpedBounds(layer)
  const padX = FRAME_PADDING_PX / Math.max(1e-6, zoom * Math.abs(layer.transform.scaleX))
  const padY = FRAME_PADDING_PX / Math.max(1e-6, zoom * Math.abs(layer.transform.scaleY))
  return {
    minX: bounds.minX - padX,
    minY: bounds.minY - padY,
    maxX: bounds.maxX + padX,
    maxY: bounds.maxY + padY,
  }
}

/** 배치까지 적용한 뒤 레이어가 캔버스에서 차지하는 범위 */
export function canvasBoundsOfLayer(layer: Layer): Bounds | null {
  return boundsOfPoints(frameCorners(layer.transform, warpedBounds(layer)))
}

/** 여러 레이어를 한꺼번에 감싸는 범위 */
export function boundsOfLayers(layers: readonly Layer[]): Bounds | null {
  let bounds: Bounds | null = null
  for (const layer of layers) {
    bounds = mergeBounds(bounds, canvasBoundsOfLayer(layer))
  }
  return bounds
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
