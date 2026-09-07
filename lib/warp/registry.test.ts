import { describe, expect, it } from 'vitest'
import { WARP_EFFECTS, WARP_TYPES, applyWarp, createWarp } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'

const ctx = { width: 320, height: 180 }

describe('왜곡 효과 목록', () => {
  it('네 가지 효과가 모두 등록되어 있다', () => {
    expect(WARP_TYPES).toEqual(['arc', 'mesh', 'perspective', 'bulge'])
    WARP_TYPES.forEach((type) => {
      expect(WARP_EFFECTS[type].label).toBeTruthy()
    })
  })

  it('모든 효과는 기본값에서 원본을 그대로 돌려준다', () => {
    WARP_TYPES.forEach((type) => {
      const warp = createWarp(type)
      for (const [u, v] of [
        [0, 0],
        [0.5, 0.5],
        [1, 1],
        [0.2, 0.9],
      ]) {
        const p = applyWarp(warp, u, v, ctx)
        expect(p.x).toBeCloseTo(u * ctx.width, 6)
        expect(p.y).toBeCloseTo(v * ctx.height, 6)
      }
    })
  })

  it('효과를 바꿔도 매번 새 파라미터 객체를 만들어 서로 간섭하지 않는다', () => {
    const a = createWarp('arc')
    const b = createWarp('arc')
    expect(a.params).not.toBe(b.params)
  })

  it('applyWarp는 종류에 맞는 계산식으로 넘긴다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc 여야 한다')
    warp.params.angle = 180
    const mid = applyWarp(warp, 0.5, 0.5, ctx)
    const left = applyWarp(warp, 0, 0.5, ctx)
    expect(left.y - mid.y).toBeCloseTo(ctx.width / Math.PI, 6)
  })

  it('슬라이더 정의의 키는 모두 해당 효과의 기본 파라미터에 존재한다', () => {
    WARP_TYPES.forEach((type: WarpType) => {
      const effect = WARP_EFFECTS[type]
      effect.sliders.forEach((slider) => {
        expect(Object.keys(effect.defaults)).toContain(slider.key)
      })
    })
  })
})
