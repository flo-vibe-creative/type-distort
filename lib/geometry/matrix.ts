import type { Point } from '@/lib/warp/types'

/**
 * 원근(사영) 변환 계수.
 * x' = (a·u + b·v + c) / (g·u + h·v + 1)
 * y' = (d·u + e·v + f) / (g·u + h·v + 1)
 */
export interface Homography {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
  g: number
  h: number
}

export const IDENTITY_HOMOGRAPHY: Homography = { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0, g: 0, h: 0 }

/**
 * 단위 정사각형의 네 꼭짓점을 지정한 네 점으로 보내는 사영 변환을 구한다.
 *
 * @param corners [좌상, 우상, 우하, 좌하] 순서
 */
export function homographyFromUnitSquare(corners: readonly Point[]): Homography {
  const [p0, p1, p2, p3] = corners

  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y

  const denominator = dx1 * dy2 - dy1 * dx2

  // 평행사변형이면 원근 성분이 없어 아핀 변환으로 떨어진다
  if (Math.abs(dx3) < 1e-12 && Math.abs(dy3) < 1e-12) {
    return {
      a: p1.x - p0.x,
      b: p3.x - p0.x,
      c: p0.x,
      d: p1.y - p0.y,
      e: p3.y - p0.y,
      f: p0.y,
      g: 0,
      h: 0,
    }
  }

  if (Math.abs(denominator) < 1e-12) {
    return IDENTITY_HOMOGRAPHY
  }

  const g = (dx3 * dy2 - dy3 * dx2) / denominator
  const h = (dx1 * dy3 - dy1 * dx3) / denominator

  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  }
}

export function applyHomography(m: Homography, u: number, v: number): Point {
  const w = m.g * u + m.h * v + 1
  // 소실선 위의 점은 무한대로 날아가므로 0으로 나누는 것만 막는다
  const safeW = Math.abs(w) < 1e-12 ? 1e-12 : w
  return {
    x: (m.a * u + m.b * v + m.c) / safeW,
    y: (m.d * u + m.e * v + m.f) / safeW,
  }
}
