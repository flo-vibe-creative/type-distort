import type { Bounds } from '@/lib/geometry/bbox'
import { flattenPath, type Subpath } from '@/lib/svg/flatten'
import type { PathCommand } from '@/lib/svg/pathData'
import { serializeSubpaths } from '@/lib/svg/serialize'
import { applyWarp, type WarpState } from '@/lib/warp/registry'

/** 화면에서 이 정도 어긋나면 눈에 띈다고 보는 기준 (px) */
const SCREEN_TOLERANCE = 0.35
/** 드래그 중에는 이 배수만큼 거칠게 쪼개 반응 속도를 지킨다 */
const DRAGGING_FACTOR = 8
/** 확대를 아무리 해도 이보다 잘게 쪼개지 않는다 (점이 폭발하는 것을 막는다) */
const MIN_TOLERANCE = 0.002

/**
 * 원본 좌표계에서 얼마나 잘게 쪼갤지 정한다.
 * 화면 배율과 레이어 확대율을 모두 반영해, 확대할수록 곡선이 각져 보이지 않게 한다.
 */
export function toleranceForZoom(zoom: number, layerScale: number, dragging: boolean): number {
  const screenScale = Math.max(1e-6, zoom * layerScale)
  const base = SCREEN_TOLERANCE / screenScale
  return Math.max(MIN_TOLERANCE, dragging ? base * DRAGGING_FACTOR : base)
}

/**
 * 경로를 점열로 편 뒤 각 점을 왜곡 함수에 통과시킨다.
 * 결과는 기준 영역의 왼쪽 위를 원점으로 하는 좌표다.
 */
export function warpPointsOf(
  commands: readonly PathCommand[],
  bounds: Bounds,
  warp: WarpState,
  tolerance: number
): Subpath[] {
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  // 폭이나 높이가 0이면 정규화할 수 없으므로 왜곡 없이 원점으로만 옮긴다
  if (width <= 0 || height <= 0) {
    return flattenPath(commands, tolerance).map((subpath) => ({
      closed: subpath.closed,
      points: subpath.points.map((p) => ({ x: p.x - bounds.minX, y: p.y - bounds.minY })),
    }))
  }

  const context = { width, height }
  return flattenPath(commands, tolerance).map((subpath) => ({
    closed: subpath.closed,
    points: subpath.points.map((point) =>
      applyWarp(warp, (point.x - bounds.minX) / width, (point.y - bounds.minY) / height, context)
    ),
  }))
}

/** 왜곡한 결과를 SVG path의 `d` 문자열로 만든다 */
export function warpCommandsToPathData(
  commands: readonly PathCommand[],
  bounds: Bounds,
  warp: WarpState,
  tolerance: number
): string {
  return serializeSubpaths(warpPointsOf(commands, bounds, warp, tolerance))
}
