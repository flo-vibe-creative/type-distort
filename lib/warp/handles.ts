import type { ArcParams } from '@/lib/warp/arc'
import { MESH_SIZE } from '@/lib/warp/mesh'
import { applyWarp, type WarpState } from '@/lib/warp/registry'
import type { Point, WarpContext, WarpType } from '@/lib/warp/types'

/** 캔버스에 그려지는 왜곡 조작점 하나 */
export interface WarpHandle {
  id: string
  /** 레이어 좌표계에서의 위치 */
  local: Point
  /** 핸들 종류 — 그리는 모양이 다르다 */
  role: 'point' | 'radius' | 'anchor'
}

/** 현재 왜곡 상태에서 조작점들이 놓일 자리 */
export function warpHandles(warp: WarpState, size: WarpContext): WarpHandle[] {
  switch (warp.type) {
    case 'arc': {
      const { baseline, anchor } = warp.params
      return [
        { id: 'arc-start', local: applyWarp(warp, 0, baseline, size), role: 'point' },
        // 기준점은 곡선 위 어디에나 놓일 수 있다
        { id: 'arc-anchor', local: applyWarp(warp, anchor, baseline, size), role: 'anchor' },
        { id: 'arc-end', local: applyWarp(warp, 1, baseline, size), role: 'point' },
      ]
    }

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
/** 기준선을 글자 밖으로도 조금은 뺄 수 있게 하되, 뒤집힐 만큼 멀리는 못 가게 막는다 */
export const BASELINE_MIN = -0.5
export const BASELINE_MAX = 1.5

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
      if (handleId === 'arc-anchor') {
        return dragArcAnchor(warp.params, size, localPoint)
      }
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
    const point = applyWarp(
      { type: 'arc', params: { ...warp.params, angle } },
      u,
      warp.params.baseline,
      size
    )
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

/**
 * 여러 점을 한꺼번에 골라 함께 옮길 수 있는 효과인지.
 *
 * 메쉬의 격자점과 퍼스펙티브의 모서리는 "그 자리 자체"가 값이라 함께 옮기는 것이 자연스럽다.
 * 반면 아크의 끝점(각도)이나 볼록의 반경 점은 각자 다른 뜻을 가진 조절점이라 묶이지 않는다.
 */
export function supportsMultiSelect(type: WarpType): boolean {
  return type === 'mesh' || type === 'perspective'
}

/** 여러 점을 골라 둔 상태에서 그중 하나를 끌었을 때, 나머지도 같은 거리만큼 함께 옮긴다 */
export function dragWarpHandles(
  warp: WarpState,
  size: WarpContext,
  primaryHandleId: string,
  selectedHandleIds: readonly string[],
  localPoint: Point
): Record<string, unknown> | null {
  const patch = dragWarpHandle(warp, size, primaryHandleId, localPoint)
  if (!patch) return null

  const others = selectedHandleIds.filter((id) => id !== primaryHandleId)
  if (others.length === 0 || !supportsMultiSelect(warp.type)) return patch

  if (warp.type === 'mesh') {
    return moveTogether(patch.points, warp.params.points, primaryHandleId, others, 'mesh-', 'points')
  }
  if (warp.type === 'perspective') {
    return moveTogether(
      patch.corners,
      warp.params.corners,
      primaryHandleId,
      others,
      'perspective-',
      'corners'
    )
  }
  return patch
}

/** 기준 점이 움직인 거리를 나머지 점에도 그대로 더한다 */
function moveTogether(
  updated: unknown,
  previous: readonly Point[],
  primaryHandleId: string,
  others: readonly string[],
  prefix: string,
  key: string
): Record<string, unknown> | null {
  const points = updated as Point[] | undefined
  if (!points) return null

  const primaryIndex = indexFrom(primaryHandleId, prefix, points.length)
  if (primaryIndex === null) return { [key]: points }

  const delta = {
    x: points[primaryIndex].x - previous[primaryIndex].x,
    y: points[primaryIndex].y - previous[primaryIndex].y,
  }

  for (const id of others) {
    const index = indexFrom(id, prefix, points.length)
    if (index === null) continue
    points[index] = { x: previous[index].x + delta.x, y: previous[index].y + delta.y }
  }

  return { [key]: points }
}

/** 이보다 작은 각도에서는 반지름이 발산해 원이 사실상 직선이 된다 */
const MIN_CURVED_ANGLE = 1

/**
 * 기준점을 끌었을 때의 기준점 위치와 기준선을 함께 구한다.
 *
 * 기준점은 휘기 전 자리에 그대로 남으므로, 끈 자리의 가로에서 글자의 몇 번째 지점인지를,
 * 세로에서 기준선을 읽으면 두 값이 한 번에 나온다. 회전은 건드리지 않는다.
 */
function dragArcAnchor(
  params: ArcParams,
  size: WarpContext,
  localPoint: Point
): Record<string, unknown> {
  const clampBaseline = (value: number) =>
    Math.min(BASELINE_MAX, Math.max(BASELINE_MIN, value))
  const clampAnchor = (value: number) => Math.min(1, Math.max(0, value))

  // 각도가 거의 없으면 원이 사실상 직선이라 회전을 셈에 넣을 필요가 없다
  if (Math.abs(params.angle) < MIN_CURVED_ANGLE) {
    return {
      anchor: clampAnchor(localPoint.x / size.width),
      baseline: clampBaseline(localPoint.y / size.height),
    }
  }

  const sweep = (params.angle * Math.PI) / 180
  const radius = size.width / sweep
  const spin = (params.rotation * Math.PI) / 180

  return {
    anchor: clampAnchor((localPoint.x - radius * Math.sin(spin)) / size.width),
    baseline: clampBaseline((localPoint.y - radius * (1 - Math.cos(spin))) / size.height),
  }
}
