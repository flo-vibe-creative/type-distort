import type { Point, WarpFn } from '@/lib/warp/types'

/** 격자 한 변의 제어점 개수 (4 x 4 = 16개) */
export const MESH_SIZE = 4

export interface MeshParams {
  /**
   * 제어점 16개. 좌상단부터 행 우선 순서(0~3 = 첫 줄).
   * 0~1 정규화 좌표이며 경계 밖으로 나갈 수 있다.
   */
  points: readonly Point[]
}

function createDefaultPoints(): Point[] {
  const points: Point[] = []
  for (let row = 0; row < MESH_SIZE; row += 1) {
    for (let col = 0; col < MESH_SIZE; col += 1) {
      points.push({ x: col / (MESH_SIZE - 1), y: row / (MESH_SIZE - 1) })
    }
  }
  return points
}

export const MESH_DEFAULT: MeshParams = { points: createDefaultPoints() }

/** 3차 베른슈타인 기저 4개를 한 번에 계산한다 */
function cubicBasis(t: number): [number, number, number, number] {
  const s = 1 - t
  return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t]
}

/**
 * 4x4 제어점을 쓰는 3차 베지에 곡면(포토샵 뒤틀기와 같은 방식)으로 자유 변형한다.
 *
 * 제어점이 균일 격자(0, 1/3, 2/3, 1)면 곡면이 정확히 항등 변환이 되고,
 * 네 귀퉁이 제어점은 결과의 귀퉁이와 항상 일치한다.
 */
export const warpMesh: WarpFn<MeshParams> = (u, v, params, ctx) => {
  const bu = cubicBasis(u)
  const bv = cubicBasis(v)

  let x = 0
  let y = 0
  for (let row = 0; row < MESH_SIZE; row += 1) {
    for (let col = 0; col < MESH_SIZE; col += 1) {
      const weight = bu[col] * bv[row]
      if (weight === 0) continue
      const point = params.points[row * MESH_SIZE + col]
      x += weight * point.x
      y += weight * point.y
    }
  }

  return { x: x * ctx.width, y: y * ctx.height }
}
