import { describe, expect, it } from 'vitest'
import { BULGE_DEFAULT, warpBulge } from '@/lib/warp/bulge'

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
})
