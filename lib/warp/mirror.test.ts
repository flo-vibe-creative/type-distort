import { describe, expect, it } from 'vitest'
import { MIRROR_DEFAULT, warpMirror } from '@/lib/warp/mirror'

const ctx = { width: 200, height: 100 }

describe('warpMirror', () => {
  it('기본값에서는 원본 좌표를 그대로 돌려준다', () => {
    const p = warpMirror(0.25, 0.2, MIRROR_DEFAULT, ctx)
    expect(p.x).toBeCloseTo(50, 6)
    expect(p.y).toBeCloseTo(20, 6)
  })

  it('기준선 위의 점은 아무리 늘여도 제자리에 남는다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 4, curve: 0.5 }
    const p = warpMirror(0.5, 0.5, params, ctx)
    expect(p.x).toBeCloseTo(100, 6)
    expect(p.y).toBeCloseTo(50, 6)
  })

  it('늘이기를 올리면 기준선에서 멀어진 만큼 더 벌어진다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 3 }
    const p = warpMirror(0.5, 0.2, params, ctx)
    // 기준선(y=50)에서 30만큼 위에 있던 점이 3배인 90만큼 위로 간다
    expect(p.x).toBeCloseTo(100, 6)
    expect(p.y).toBeCloseTo(50 - 90, 6)
  })

  it('기준선 위아래가 거울처럼 대칭으로 움직인다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 2.5, curve: 0.6 }
    const above = warpMirror(0.4, 0.5 - 0.3, params, ctx)
    const below = warpMirror(0.4, 0.5 + 0.3, params, ctx)
    expect(above.x).toBeCloseTo(below.x, 6)
    expect(50 - above.y).toBeCloseTo(below.y - 50, 6)
  })

  it('퍼짐이 1보다 작으면 기준선 가까이 있던 점이 더 많이 밀려난다', () => {
    const spread = { ...MIRROR_DEFAULT, curve: 0.4 }
    const near = warpMirror(0.5, 0.45, spread, ctx)
    const plain = warpMirror(0.5, 0.45, MIRROR_DEFAULT, ctx)
    expect(50 - near.y).toBeGreaterThan(50 - plain.y)
  })

  it('기준선을 따라가는 방향으로는 움직이지 않는다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 4, curve: 0.5, taper: 0.8 }
    for (const u of [0, 0.3, 0.7, 1]) {
      expect(warpMirror(u, 0.1, params, ctx).x).toBeCloseTo(u * ctx.width, 6)
    }
  })

  it('기울기를 주면 끝점 쪽이 더 많이 늘어난다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 2, taper: 0.8 }
    const left = 50 - warpMirror(0.15, 0.2, params, ctx).y
    const right = 50 - warpMirror(0.85, 0.2, params, ctx).y
    expect(right).toBeGreaterThan(left)
  })

  it('기준선을 기울이면 그 선에 직각인 방향으로 늘어난다', () => {
    // 왼쪽 위에서 오른쪽 아래로 45도로 기운 기준선
    const params = { ...MIRROR_DEFAULT, ax: 0, ay: 0, bx: 1, by: 1, stretch: 2 }
    const p = warpMirror(0.5, 0.5, params, ctx)
    // 대각선 위의 점은 제자리에 남는다
    expect(p.x).toBeCloseTo(100, 6)
    expect(p.y).toBeCloseTo(50, 6)
  })

  it('두 점이 겹치면 왜곡하지 않는다', () => {
    const params = { ...MIRROR_DEFAULT, ax: 0.5, ay: 0.5, bx: 0.5, by: 0.5, stretch: 5 }
    const p = warpMirror(0.2, 0.9, params, ctx)
    expect(p.x).toBeCloseTo(40, 6)
    expect(p.y).toBeCloseTo(90, 6)
  })

  it('늘이기를 0으로 하면 모두 기준선 위로 납작해진다', () => {
    const params = { ...MIRROR_DEFAULT, stretch: 0 }
    expect(warpMirror(0.3, 0.1, params, ctx).y).toBeCloseTo(50, 6)
    expect(warpMirror(0.3, 0.9, params, ctx).y).toBeCloseTo(50, 6)
  })
})
