import type { PathCommand } from '@/lib/svg/pathData'
import type { Point } from '@/lib/warp/types'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boundsOfPoints(points: readonly Point[]): Bounds | null {
  if (points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a) return b
  if (!b) return a
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/**
 * 경로가 실제로 지나가는 범위를 구한다.
 * 곡선은 제어점이 아니라 곡선이 닿는 지점(미분이 0이 되는 곳)까지 따져
 * 경계가 실제보다 넓어지지 않게 한다.
 */
export function boundsOfCommands(commands: readonly PathCommand[]): Bounds | null {
  let bounds: Bounds | null = null
  let cursor: Point = { x: 0, y: 0 }
  let subpathStart: Point = { x: 0, y: 0 }

  const include = (p: Point) => {
    bounds = mergeBounds(bounds, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y })
  }

  for (const command of commands) {
    switch (command.type) {
      case 'M':
        cursor = { x: command.x, y: command.y }
        subpathStart = { ...cursor }
        include(cursor)
        break
      case 'L':
        cursor = { x: command.x, y: command.y }
        include(cursor)
        break
      case 'C': {
        const end = { x: command.x, y: command.y }
        include(end)
        includeCubicExtremes(
          cursor,
          { x: command.x1, y: command.y1 },
          { x: command.x2, y: command.y2 },
          end,
          include
        )
        cursor = end
        break
      }
      case 'Z':
        cursor = { ...subpathStart }
        break
    }
  }

  return bounds
}

/** 3차 곡선에서 x, y가 최대·최소가 되는 지점을 찾아 경계에 반영한다 */
function includeCubicExtremes(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  include: (p: Point) => void
): void {
  for (const axis of ['x', 'y'] as const) {
    // 곡선의 미분 = a·t² + b·t + c. 이 값이 0이 되는 t가 최대·최소 지점이다.
    const a = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]
    const b = 2 * (p0[axis] - 2 * p1[axis] + p2[axis])
    const c = -p0[axis] + p1[axis]

    for (const t of solveQuadratic(a, b, c)) {
      if (t > 0 && t < 1) include(cubicAt(p0, p1, p2, p3, t))
    }
  }
}

function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return []
    return [-c / b]
  }
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return []
  const root = Math.sqrt(discriminant)
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)]
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const s = 1 - t
  const w0 = s * s * s
  const w1 = 3 * s * s * t
  const w2 = 3 * s * t * t
  const w3 = t * t * t
  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  }
}
