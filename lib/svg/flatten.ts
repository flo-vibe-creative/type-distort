import type { PathCommand } from '@/lib/svg/pathData'
import type { Point } from '@/lib/warp/types'

/** 이어진 점들의 묶음. 글자 하나는 바깥 윤곽과 구멍들로 이루어진 여러 개를 갖는다. */
export interface Subpath {
  points: Point[]
  /** Z로 닫힌 경로인지. 닫힌 경우에도 시작점을 끝에 중복해 넣지 않는다. */
  closed: boolean
}

/** 곡선을 무한히 쪼개지 않도록 두는 재귀 한계 */
const MAX_DEPTH = 20

/**
 * M/L/C/Z 명령을 점열로 편다.
 *
 * 곡선은 "이 조각이 직선이라고 봐도 허용 오차 안인가"를 따져 필요한 만큼만 쪼갠다.
 * 오차를 줄이면 점이 늘고, 늘리면 줄어든다. 화면 배율에 맞춰 호출 쪽에서 조절한다.
 */
export function flattenPath(commands: readonly PathCommand[], tolerance: number): Subpath[] {
  const subpaths: Subpath[] = []
  let current: Subpath | null = null
  let cursor: Point = { x: 0, y: 0 }

  const finish = () => {
    // 점이 하나뿐이면 선분이 하나도 없어 그릴 것이 없다
    if (current && current.points.length >= 2) subpaths.push(current)
    current = null
  }

  for (const command of commands) {
    switch (command.type) {
      case 'M': {
        finish()
        cursor = { x: command.x, y: command.y }
        current = { points: [{ ...cursor }], closed: false }
        break
      }
      case 'L': {
        if (!current) break
        cursor = { x: command.x, y: command.y }
        current.points.push({ ...cursor })
        break
      }
      case 'C': {
        if (!current) break
        const end = { x: command.x, y: command.y }
        flattenCubic(
          cursor,
          { x: command.x1, y: command.y1 },
          { x: command.x2, y: command.y2 },
          end,
          Math.max(tolerance, 1e-6),
          0,
          current.points
        )
        // 끝점은 재귀에서 넣지 않고 여기서 정확한 값으로 넣는다
        current.points.push({ ...end })
        cursor = end
        break
      }
      case 'Z': {
        if (!current) break
        current.closed = true
        cursor = { ...current.points[0] }
        finish()
        break
      }
    }
  }
  finish()

  return subpaths
}

/**
 * 3차 곡선을 반씩 나누며 점을 채운다. 끝점은 호출 쪽에서 넣으므로 여기서는 넣지 않는다.
 */
function flattenCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number,
  depth: number,
  out: Point[]
): void {
  if (depth >= MAX_DEPTH || isFlat(p0, p1, p2, p3, tolerance)) {
    return
  }

  // 드 카스텔조 분할
  const p01 = midpoint(p0, p1)
  const p12 = midpoint(p1, p2)
  const p23 = midpoint(p2, p3)
  const p012 = midpoint(p01, p12)
  const p123 = midpoint(p12, p23)
  const mid = midpoint(p012, p123)

  flattenCubic(p0, p01, p012, mid, tolerance, depth + 1, out)
  out.push(mid)
  flattenCubic(mid, p123, p23, p3, tolerance, depth + 1, out)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 두 제어점이 시작-끝을 잇는 직선에서 허용 오차 안쪽이면 직선으로 봐도 된다 */
function isFlat(p0: Point, p1: Point, p2: Point, p3: Point, tolerance: number): boolean {
  const dx = p3.x - p0.x
  const dy = p3.y - p0.y
  const chordLength = Math.hypot(dx, dy)

  if (chordLength < 1e-12) {
    // 시작점과 끝점이 같으면 제어점까지의 거리로 판단한다
    return (
      Math.hypot(p1.x - p0.x, p1.y - p0.y) <= tolerance &&
      Math.hypot(p2.x - p0.x, p2.y - p0.y) <= tolerance
    )
  }

  const d1 = Math.abs((p1.x - p0.x) * dy - (p1.y - p0.y) * dx) / chordLength
  const d2 = Math.abs((p2.x - p0.x) * dy - (p2.y - p0.y) * dx) / chordLength
  return Math.max(d1, d2) <= tolerance
}
