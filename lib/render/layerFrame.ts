import type { LayerTransform } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { MIN_SCALE } from '@/store/editorStore'
import type { Point } from '@/lib/warp/types'

/** 배치 핸들 여덟 곳 */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLE_IDS: readonly HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const OPPOSITE: Record<HandleId, HandleId> = {
  nw: 'se',
  n: 's',
  ne: 'sw',
  e: 'w',
  se: 'nw',
  s: 'n',
  sw: 'ne',
  w: 'e',
}

function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }
}

/** 레이어 좌표 → 캔버스 좌표 (SVG의 translate → rotate → scale 순서와 같다) */
export function localToCanvas(transform: LayerTransform, p: Point): Point {
  const scaled = { x: p.x * transform.scaleX, y: p.y * transform.scaleY }
  const rotated = rotatePoint(scaled, transform.rotation)
  return { x: rotated.x + transform.x, y: rotated.y + transform.y }
}

/** 캔버스 좌표 → 레이어 좌표 */
export function canvasToLocal(transform: LayerTransform, p: Point): Point {
  const moved = { x: p.x - transform.x, y: p.y - transform.y }
  const unrotated = rotatePoint(moved, -transform.rotation)
  return { x: unrotated.x / transform.scaleX, y: unrotated.y / transform.scaleY }
}

/** 핸들이 놓이는 레이어 좌표 */
export function handleLocalPoint(bounds: Bounds, handle: HandleId): Point {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const x = handle.includes('w') ? bounds.minX : handle.includes('e') ? bounds.maxX : centerX
  const y = handle.includes('n') ? bounds.minY : handle.includes('s') ? bounds.maxY : centerY
  return { x, y }
}

/** 선택 상자의 네 모서리를 캔버스 좌표로 (좌상 → 우상 → 우하 → 좌하) */
export function frameCorners(transform: LayerTransform, bounds: Bounds): Point[] {
  return (['nw', 'ne', 'se', 'sw'] as const).map((handle) =>
    localToCanvas(transform, handleLocalPoint(bounds, handle))
  )
}

function clampScale(value: number, previous: number): number {
  if (!Number.isFinite(value) || value === 0) return previous
  const sign = value < 0 ? -1 : 1
  return sign * Math.max(MIN_SCALE, Math.abs(value))
}

export interface ResizeOptions {
  /** Shift를 누르고 있을 때 — 가로세로 비율을 유지한다 */
  preserveRatio: boolean
}

/**
 * 모서리·변 핸들을 끌었을 때의 새 배치 값을 구한다.
 *
 * 반대쪽 핸들은 화면에서 움직이지 않아야 하므로, 확대율을 바꾼 뒤
 * 그 지점이 제자리에 남도록 위치를 되맞춘다.
 */
export function resizeTransform(
  start: LayerTransform,
  bounds: Bounds,
  handle: HandleId,
  pointer: Point,
  options: ResizeOptions
): LayerTransform {
  const dragLocal = handleLocalPoint(bounds, handle)
  const anchorLocal = handleLocalPoint(bounds, OPPOSITE[handle])
  const anchorCanvas = localToCanvas(start, anchorLocal)

  // 회전을 되돌린 좌표계에서 보면 확대율 계산이 단순한 나눗셈이 된다
  const delta = rotatePoint(
    { x: pointer.x - anchorCanvas.x, y: pointer.y - anchorCanvas.y },
    -start.rotation
  )
  const spanX = dragLocal.x - anchorLocal.x
  const spanY = dragLocal.y - anchorLocal.y

  let scaleX = spanX === 0 ? start.scaleX : clampScale(delta.x / spanX, start.scaleX)
  let scaleY = spanY === 0 ? start.scaleY : clampScale(delta.y / spanY, start.scaleY)

  if (options.preserveRatio && spanX !== 0 && spanY !== 0) {
    const ratio = Math.max(
      Math.abs(scaleX / start.scaleX),
      Math.abs(scaleY / start.scaleY)
    )
    scaleX = Math.sign(scaleX) * Math.abs(start.scaleX) * ratio
    scaleY = Math.sign(scaleY) * Math.abs(start.scaleY) * ratio
  }

  const anchorAfter = rotatePoint(
    { x: anchorLocal.x * scaleX, y: anchorLocal.y * scaleY },
    start.rotation
  )

  return {
    ...start,
    scaleX,
    scaleY,
    x: anchorCanvas.x - anchorAfter.x,
    y: anchorCanvas.y - anchorAfter.y,
  }
}

/** 회전 중 Shift를 누르면 이 각도 단위로 딱딱 맞춘다 */
export const ROTATION_SNAP_DEGREES = 15

/**
 * 선택 상자 가운데를 축으로 돌린다.
 * 가운데가 제자리에 남도록 위치를 함께 보정한다.
 */
export function rotateTransform(
  start: LayerTransform,
  bounds: Bounds,
  pointerStart: Point,
  pointer: Point,
  snap: boolean
): LayerTransform {
  const centerLocal = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const center = localToCanvas(start, centerLocal)

  const angleBefore = Math.atan2(pointerStart.y - center.y, pointerStart.x - center.x)
  const angleAfter = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  const deltaDegrees = ((angleAfter - angleBefore) * 180) / Math.PI

  let rotation = start.rotation + deltaDegrees
  if (snap) {
    rotation = Math.round(rotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES
  }

  const centerAfter = rotatePoint(
    { x: centerLocal.x * start.scaleX, y: centerLocal.y * start.scaleY },
    rotation
  )

  return {
    ...start,
    rotation,
    x: center.x - centerAfter.x,
    y: center.y - centerAfter.y,
  }
}
