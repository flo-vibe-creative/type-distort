import { sourceSize, type Layer, type VectorLayerSource } from '@/lib/document/types'
import { applyLetterSpacing, spacedBounds, type SpacedVector } from '@/lib/render/letterSpacing'

/** 자간을 반영한 벡터 레이어의 도형과 기준 영역 */
export function spacedVectorSource(source: VectorLayerSource, spacing: number): SpacedVector {
  return applyLetterSpacing(source.shapes, source.bounds, spacing)
}

/**
 * 왜곡이 걸리는 영역의 크기.
 * 자간을 벌리면 글자가 차지하는 폭이 넓어지므로, 왜곡도 그 넓어진 폭 전체에 고르게 걸린다.
 */
export function warpDomainSize(layer: Layer): { width: number; height: number } {
  if (layer.source.kind === 'raster') return sourceSize(layer.source)

  const bounds = spacedBounds(layer.source.shapes, layer.source.bounds, layer.letterSpacing)
  return { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY }
}
