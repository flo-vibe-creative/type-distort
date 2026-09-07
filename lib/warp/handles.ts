import { MESH_SIZE } from '@/lib/warp/mesh'
import { applyWarp, type WarpState } from '@/lib/warp/registry'
import type { Point, WarpContext } from '@/lib/warp/types'

/** 캔버스에 그려지는 왜곡 조작점 하나 */
export interface WarpHandle {
  id: string
  /** 레이어 좌표계에서의 위치 */
  local: Point
  /** 점을 옮기는 핸들인지, 반경을 정하는 핸들인지 — 그리는 모양이 다르다 */
  role: 'point' | 'radius'
}

/** 현재 왜곡 상태에서 조작점들이 놓일 자리 */
export function warpHandles(warp: WarpState, size: WarpContext): WarpHandle[] {
  switch (warp.type) {
    case 'arc':
      return [
        { id: 'arc-start', local: applyWarp(warp, 0, 0.5, size), role: 'point' },
        { id: 'arc-end', local: applyWarp(warp, 1, 0.5, size), role: 'point' },
      ]

    case 'bulge': {
      const center = { x: warp.params.cx * size.width, y: warp.params.cy * size.height }
      const halfDiagonal = Math.hypot(size.width, size.height) / 2
      return [
        { id: 'bulge-center', local: center, role: 'point' },
        {
          id: 'bulge-radius',
          local: { x: center.x + warp.params.radius * halfDiagonal, y: center.y },
          role: 'radius',
        },
      ]
    }

    case 'perspective':
      return warp.params.corners.map((corner, index) => ({
        id: `perspective-${index}`,
        local: { x: corner.x * size.width, y: corner.y * size.height },
        role: 'point',
      }))

    case 'mesh':
      return warp.params.points.map((point, index) => ({
        id: `mesh-${index}`,
        local: { x: point.x * size.width, y: point.y * size.height },
        role: 'point',
      }))
  }
}

/** 아크 각도를 찾을 때 훑어보는 범위와 간격 (도) */
const ARC_SEARCH_LIMIT = 359
const ARC_COARSE_STEP = 1
const ARC_REFINE_STEP = 0.05
/** 반경이 0이 되면 왜곡이 사라지므로 최소값을 둔다 */
const MIN_BULGE_RADIUS = 0.02

/**
 * 조작점을 끌었을 때 바뀌어야 할 파라미터를 구한다.
 *
 * 모서리·제어점은 끈 자리가 곧 값이지만, 아크의 각도는 끈 자리로부터 거꾸로 계산할 수 없다.
 * 그래서 각도를 훑어보며 끝점이 포인터에 가장 가까워지는 각도를 찾는다.
 *
 * @param localPoint 포인터 위치 (레이어 좌표계)
 * @returns 바꿀 파라미터만 담은 값. 다룰 수 없는 핸들이면 null.
 */
export function dragWarpHandle(
  warp: WarpState,
  size: WarpContext,
  handleId: string,
  localPoint: Point
): Record<string, unknown> | null {
  if (size.width <= 0 || size.height <= 0) return null

  switch (warp.type) {
    case 'arc': {
      const u = handleId === 'arc-start' ? 0 : handleId === 'arc-end' ? 1 : null
      if (u === null) return null
      return { angle: findArcAngle(warp, size, u, localPoint) }
    }

    case 'bulge': {
      if (handleId === 'bulge-center') {
        return { cx: localPoint.x / size.width, cy: localPoint.y / size.height }
      }
      if (handleId === 'bulge-radius') {
        const center = { x: warp.params.cx * size.width, y: warp.params.cy * size.height }
        const halfDiagonal = Math.hypot(size.width, size.height) / 2
        const distance = Math.hypot(localPoint.x - center.x, localPoint.y - center.y)
        return { radius: Math.max(MIN_BULGE_RADIUS, distance / halfDiagonal) }
      }
      return null
    }

    case 'perspective': {
      const index = indexFrom(handleId, 'perspective-', warp.params.corners.length)
      if (index === null) return null
      const corners = warp.params.corners.map((corner) => ({ ...corner }))
      corners[index] = { x: localPoint.x / size.width, y: localPoint.y / size.height }
      return { corners }
    }

    case 'mesh': {
      const index = indexFrom(handleId, 'mesh-', MESH_SIZE * MESH_SIZE)
      if (index === null) return null
      const points = warp.params.points.map((point) => ({ ...point }))
      points[index] = { x: localPoint.x / size.width, y: localPoint.y / size.height }
      return { points }
    }
  }
}

function indexFrom(handleId: string, prefix: string, count: number): number | null {
  if (!handleId.startsWith(prefix)) return null
  const index = Number.parseInt(handleId.slice(prefix.length), 10)
  if (!Number.isInteger(index) || index < 0 || index >= count) return null
  return index
}

/** 끝점이 포인터에 가장 가까워지는 각도를 찾는다 (거친 탐색 후 그 주변을 다시 훑는다) */
function findArcAngle(
  warp: Extract<WarpState, { type: 'arc' }>,
  size: WarpContext,
  u: number,
  target: Point
): number {
  const distanceAt = (angle: number) => {
    const point = applyWarp({ type: 'arc', params: { ...warp.params, angle } }, u, 0.5, size)
    return Math.hypot(point.x - target.x, point.y - target.y)
  }

  let best = 0
  let bestDistance = Infinity
  for (let angle = -ARC_SEARCH_LIMIT; angle <= ARC_SEARCH_LIMIT; angle += ARC_COARSE_STEP) {
    const distance = distanceAt(angle)
    if (distance < bestDistance) {
      bestDistance = distance
      best = angle
    }
  }

  for (
    let angle = best - ARC_COARSE_STEP;
    angle <= best + ARC_COARSE_STEP;
    angle += ARC_REFINE_STEP
  ) {
    const distance = distanceAt(angle)
    if (distance < bestDistance) {
      bestDistance = distance
      best = angle
    }
  }

  return Math.round(best * 100) / 100
}
