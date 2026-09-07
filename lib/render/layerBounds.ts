import type { Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { warpDomainSize } from '@/lib/render/layerSource'
import { applyWarp } from '@/lib/warp/registry'

/**
 * 왜곡된 모양이 차지하는 범위를 구한다 (레이어 자체 좌표계, 배치 적용 전).
 *
 * 원본 사각형 위에 격자를 촘촘히 깔고 각 점을 왜곡한 뒤 그 범위를 취한다.
 * 원본의 내용은 항상 이 사각형 안에 있으므로 왜곡한 결과도 이 안에 들어온다.
 */
const SAMPLE_STEPS = 16

export function warpedBounds(layer: Layer): Bounds {
  const size = warpDomainSize(layer)
  if (size.width <= 0 || size.height <= 0) {
    return { minX: 0, minY: 0, maxX: Math.max(0, size.width), maxY: Math.max(0, size.height) }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let row = 0; row <= SAMPLE_STEPS; row += 1) {
    const v = row / SAMPLE_STEPS
    for (let col = 0; col <= SAMPLE_STEPS; col += 1) {
      const point = applyWarp(layer.warp, col / SAMPLE_STEPS, v, size)
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      if (point.x < minX) minX = point.x
      if (point.y < minY) minY = point.y
      if (point.x > maxX) maxX = point.x
      if (point.y > maxY) maxY = point.y
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: size.width, maxY: size.height }
  }
  return { minX, minY, maxX, maxY }
}
