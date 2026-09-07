import { describe, expect, it } from 'vitest'
import { MESH_DEFAULT, MESH_SIZE, warpMesh } from '@/lib/warp/mesh'

const ctx = { width: 300, height: 150 }

describe('warpMesh', () => {
  it('격자가 4x4이고 기본값은 균일 배치다', () => {
    expect(MESH_SIZE).toBe(4)
    expect(MESH_DEFAULT.points).toHaveLength(16)
    expect(MESH_DEFAULT.points[0]).toEqual({ x: 0, y: 0 })
    expect(MESH_DEFAULT.points[15]).toEqual({ x: 1, y: 1 })
  })

  it('격자를 건드리지 않으면 원본 좌표를 그대로 돌려준다', () => {
    for (const [u, v] of [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
      [0.3, 0.8],
      [0.9, 0.15],
    ]) {
      const p = warpMesh(u, v, MESH_DEFAULT, ctx)
      expect(p.x).toBeCloseTo(u * ctx.width, 6)
      expect(p.y).toBeCloseTo(v * ctx.height, 6)
    }
  })

  it('네 귀퉁이 제어점은 결과의 귀퉁이와 정확히 일치한다', () => {
    const points = MESH_DEFAULT.points.map((p) => ({ ...p }))
    points[0] = { x: -0.5, y: 0.25 }
    const p = warpMesh(0, 0, { points }, ctx)
    expect(p.x).toBeCloseTo(-0.5 * ctx.width, 6)
    expect(p.y).toBeCloseTo(0.25 * ctx.height, 6)
  })

  it('가운데 제어점을 올리면 가운데가 따라 올라간다', () => {
    const points = MESH_DEFAULT.points.map((p) => ({ ...p }))
    // 5, 6, 9, 10 = 안쪽 4개 제어점
    for (const i of [5, 6, 9, 10]) points[i] = { ...points[i], y: points[i].y - 0.5 }
    const p = warpMesh(0.5, 0.5, { points }, ctx)
    expect(p.y).toBeLessThan(0.5 * ctx.height)
  })
})
