import { describe, expect, it } from 'vitest'
import { BULGE_DEFAULT, MAX_PEAK_RATIO, bulgeGeometry, warpBulge } from '@/lib/warp/bulge'

const ctx = { width: 200, height: 200 }

describe('warpBulge', () => {
  it('기본값(세기 0)에서는 원본 좌표를 그대로 돌려준다', () => {
    const p = warpBulge(0.25, 0.75, BULGE_DEFAULT, ctx)
    expect(p.x).toBeCloseTo(50, 6)
    expect(p.y).toBeCloseTo(150, 6)
  })

  it('중심점은 세기와 무관하게 움직이지 않는다', () => {
    const params = { ...BULGE_DEFAULT, strength: 0.8 }
    const p = warpBulge(params.cx, params.cy, params, ctx)
    expect(p.x).toBeCloseTo(ctx.width * params.cx, 6)
    expect(p.y).toBeCloseTo(ctx.height * params.cy, 6)
  })

  it('영향 반경 밖의 점은 움직이지 않는다', () => {
    const params = { ...BULGE_DEFAULT, strength: 0.8, radius: 0.2 }
    const p = warpBulge(0, 0, params, ctx)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(0, 6)
  })

  it('세기가 양수면 중심에서 바깥으로 밀려난다', () => {
    const params = { ...BULGE_DEFAULT, strength: 0.5, radius: 1 }
    const before = { x: ctx.width * 0.75, y: ctx.height * 0.5 }
    const after = warpBulge(0.75, 0.5, params, ctx)
    const center = ctx.width * params.cx
    expect(after.x - center).toBeGreaterThan(before.x - center)
  })

  it('세기가 음수면 중심으로 빨려든다', () => {
    const params = { ...BULGE_DEFAULT, strength: -0.5, radius: 1 }
    const after = warpBulge(0.75, 0.5, params, ctx)
    const center = ctx.width * params.cx
    expect(after.x - center).toBeLessThan(ctx.width * 0.75 - center)
    expect(after.x - center).toBeGreaterThan(0)
  })

  it('파동 수가 0이면 순수 볼록이라 반경 안 모든 점이 바깥으로만 밀린다', () => {
    const params = { ...BULGE_DEFAULT, strength: 0.5, radius: 1, waves: 0 }
    for (const u of [0.55, 0.65, 0.75, 0.85, 0.95]) {
      const after = warpBulge(u, 0.5, params, ctx)
      expect(after.x).toBeGreaterThanOrEqual(ctx.width * u - 1e-9)
    }
  })

  it('파동 수가 1 이상이면 안쪽으로 되돌아오는 구간이 생긴다', () => {
    const params = { ...BULGE_DEFAULT, strength: 0.5, radius: 1, waves: 2 }
    const samples = [0.55, 0.65, 0.75, 0.85, 0.95].map(
      (u) => warpBulge(u, 0.5, params, ctx).x - ctx.width * u
    )
    expect(Math.max(...samples)).toBeGreaterThan(0)
    expect(Math.min(...samples)).toBeLessThan(0)
  })

  describe('중앙점을 원 중심에서 비껴 둘 때', () => {
    const shifted = { ...BULGE_DEFAULT, strength: 0.6, radius: 0.5, peakX: 0.15, peakY: 0 }
    const radiusPx = 0.5 * (Math.hypot(ctx.width, ctx.height) / 2)

    it('중앙점 자리는 움직이지 않는다', () => {
      const p = warpBulge(0.65, 0.5, shifted, ctx)
      expect(p.x).toBeCloseTo(130, 6)
      expect(p.y).toBeCloseTo(100, 6)
    })

    it('점선 원 경계 근처는 거의 움직이지 않는다 (원이 제자리)', () => {
      for (const angle of [0, 0.8, 1.6, 2.4, 3.14, 4, 5]) {
        const x = 100 + Math.cos(angle) * radiusPx * 0.999
        const y = 100 + Math.sin(angle) * radiusPx * 0.999
        const p = warpBulge(x / ctx.width, y / ctx.height, shifted, ctx)
        expect(Math.hypot(p.x - x, p.y - y)).toBeLessThan(0.5)
      }
    })

    it('원 밖은 전혀 움직이지 않는다', () => {
      const x = 100 - radiusPx - 1
      const p = warpBulge(x / ctx.width, 0.5, shifted, ctx)
      expect(p.x).toBeCloseTo(x, 6)
    })

    it('중앙점 바로 옆이 원 중심 옆보다 더 크게 밀려난다', () => {
      const nearPeak = warpBulge(0.7, 0.5, shifted, ctx).x - 140
      const centered = { ...shifted, peakX: 0 }
      const nearCenter = warpBulge(0.55, 0.5, centered, ctx).x - 110
      expect(nearPeak).toBeGreaterThan(0)
      expect(nearCenter).toBeGreaterThan(0)
      // 비껴 둔 쪽은 경계까지 거리가 짧아 같은 거리에서도 변형이 빨리 줄어든다 — 방향만 확인
      const farSide = warpBulge(0.45, 0.5, shifted, ctx).x - 90
      expect(farSide).toBeLessThan(0)
    })

    it('한 방향으로 늘어선 점들의 순서가 뒤집히지 않는다', () => {
      let previous = -Infinity
      for (let i = 0; i <= 200; i += 1) {
        const p = warpBulge(i / 200, 0.5, { ...shifted, strength: 1 }, ctx)
        expect(p.x).toBeGreaterThanOrEqual(previous - 1e-9)
        previous = p.x
      }
    })

    it('반경을 줄여도 중앙점은 원 안에 머문다', () => {
      const geometry = bulgeGeometry({ ...shifted, radius: 0.1, peakX: 0.4 }, ctx)
      const offset = Math.hypot(geometry.peak.x - geometry.center.x, geometry.peak.y - geometry.center.y)
      expect(offset).toBeLessThanOrEqual(geometry.radius * MAX_PEAK_RATIO + 1e-9)
    })
  })
})
