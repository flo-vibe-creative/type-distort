import { describe, expect, it } from 'vitest'
import { PERSPECTIVE_DEFAULT, warpPerspective } from '@/lib/warp/perspective'

const ctx = { width: 400, height: 200 }

describe('warpPerspective', () => {
  it('기본 네 모서리에서는 원본 좌표를 그대로 돌려준다', () => {
    const p = warpPerspective(0.25, 0.5, PERSPECTIVE_DEFAULT, ctx)
    expect(p.x).toBeCloseTo(100, 6)
    expect(p.y).toBeCloseTo(100, 6)
  })

  it('모서리를 옮기면 그 지점이 정확히 그 자리로 간다', () => {
    const params = {
      corners: [
        { x: 0.2, y: 0 },
        { x: 0.8, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    }
    const tl = warpPerspective(0, 0, params, ctx)
    expect(tl.x).toBeCloseTo(0.2 * ctx.width, 6)
    expect(tl.y).toBeCloseTo(0, 6)

    const tr = warpPerspective(1, 0, params, ctx)
    expect(tr.x).toBeCloseTo(0.8 * ctx.width, 6)
  })

  it('위쪽을 좁힌 사다리꼴에서는 가로 중앙선이 위로 갈수록 좁아진다', () => {
    const params = {
      corners: [
        { x: 0.25, y: 0 },
        { x: 0.75, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    }
    const top = warpPerspective(0, 0, params, ctx)
    const bottom = warpPerspective(0, 1, params, ctx)
    expect(top.x).toBeGreaterThan(bottom.x)
  })
})
