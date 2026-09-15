import type { LayerTransform } from '@/lib/document/types'
import { normalizeDegrees } from '@/lib/geometry/angle'
import type { Bounds } from '@/lib/geometry/bbox'
import { MIN_SCALE } from '@/store/editorStore'
import type { Point } from '@/lib/warp/types'

/** 여러 레이어를 감싼 상자의 네 모서리 */
export type GroupCorner = 'nw' | 'ne' | 'se' | 'sw'

export const GROUP_CORNERS: readonly GroupCorner[] = ['nw', 'ne', 'se', 'sw']

const OPPOSITE: Record<GroupCorner, GroupCorner> = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' }

/** 함께 돌릴 때 Shift를 누르면 이 단위로 맞춘다 (도) */
const ROTATION_SNAP_DEGREES = 15

/** 여럿을 함께 줄일 때 사라지지 않도록 남기는 최소 배율 */
const MIN_GROUP_FACTOR = 0.02

export function groupCornerPoint(bounds: Bounds, corner: GroupCorner): Point {
  return {
    x: corner.includes('w') ? bounds.minX : bounds.maxX,
    y: corner.includes('n') ? bounds.minY : bounds.maxY,
  }
}

export function oppositeCorner(corner: GroupCorner): GroupCorner {
  return OPPOSITE[corner]
}

/**
 * 모서리를 끈 만큼 몇 배로 키울지 구한다.
 * 반대편 모서리에서 끈 모서리로 가는 대각선 위에 포인터를 비춰 재므로,
 * 대각선을 따라 끄는 대로 매끄럽게 커지고 줄어든다.
 */
export function groupScaleFactor(bounds: Bounds, corner: GroupCorner, pointer: Point): number {
  const anchor = groupCornerPoint(bounds, oppositeCorner(corner))
  const handle = groupCornerPoint(bounds, corner)
  const diagonal = { x: handle.x - anchor.x, y: handle.y - anchor.y }
  const lengthSquared = diagonal.x * diagonal.x + diagonal.y * diagonal.y
  if (lengthSquared === 0) return 1

  const projected =
    ((pointer.x - anchor.x) * diagonal.x + (pointer.y - anchor.y) * diagonal.y) / lengthSquared
  return Math.max(MIN_GROUP_FACTOR, projected)
}

function scaleKeepingSign(value: number, factor: number): number {
  const scaled = value * factor
  const sign = scaled < 0 ? -1 : 1
  return sign * Math.max(MIN_SCALE, Math.abs(scaled))
}

/**
 * 여러 레이어를 한 점을 기준으로 함께 키운다.
 *
 * 가로세로를 같은 비율로 키우므로 회전된 레이어가 섞여 있어도 모양이 틀어지지 않는다
 * (한쪽으로만 늘리면 회전된 레이어에 기울어짐이 생기는데, 레이어 배치 값으로는 표현할 수 없다).
 */
export function scaleLayersAbout(
  starts: Record<string, LayerTransform>,
  anchor: Point,
  factor: number
): Record<string, LayerTransform> {
  const result: Record<string, LayerTransform> = {}
  for (const [id, start] of Object.entries(starts)) {
    result[id] = {
      ...start,
      x: anchor.x + (start.x - anchor.x) * factor,
      y: anchor.y + (start.y - anchor.y) * factor,
      scaleX: scaleKeepingSign(start.scaleX, factor),
      scaleY: scaleKeepingSign(start.scaleY, factor),
    }
  }
  return result
}

/** 여러 레이어를 한 점을 축으로 함께 돌린다 */
export function rotateLayersAbout(
  starts: Record<string, LayerTransform>,
  center: Point,
  deltaDegrees: number
): Record<string, LayerTransform> {
  const rad = (deltaDegrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const result: Record<string, LayerTransform> = {}

  for (const [id, start] of Object.entries(starts)) {
    const dx = start.x - center.x
    const dy = start.y - center.y
    result[id] = {
      ...start,
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
      // 여러 번 돌려도 값이 한없이 쌓이지 않게 한 바퀴 안으로 정리한다 (보이는 모습은 같다)
      rotation: normalizeDegrees(start.rotation + deltaDegrees),
    }
  }
  return result
}

/** 끌기 시작점에서 지금 포인터까지 중심을 축으로 몇 도 돌았는지 */
export function groupRotationDelta(
  center: Point,
  startPointer: Point,
  pointer: Point,
  snap: boolean
): number {
  const before = Math.atan2(startPointer.y - center.y, startPointer.x - center.x)
  const after = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  const delta = normalizeDegrees(((after - before) * 180) / Math.PI)
  return snap ? Math.round(delta / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES : delta
}
