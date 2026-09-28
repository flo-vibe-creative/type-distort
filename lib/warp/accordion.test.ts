import { describe, expect, it } from 'vitest'
import { ACCORDION_DEFAULT, warpAccordion } from '@/lib/warp/accordion'

const ctx = { width: 240, height: 100 }

describe('warpAccordion', () => {
  it('기본값에서는 원본 좌표를 그대로 돌려준다', () => {
    const p = warpAccordion(0.25, 0.75, ACCORDION_DEFAULT, ctx)
    expect(p.x).toBeCloseTo(60, 6)
    expect(p.y).toBeCloseTo(75, 6)
  })

  it('가로 위치는 건드리지 않는다', () => {
    const params = { ...ACCORDION_DEFAULT, offset: 0.8, squeeze: 0.5 }
    for (const u of [0, 0.3, 0.66, 1]) {
      expect(warpAccordion(u, 0.2, params, ctx).x).toBeCloseTo(u * ctx.width, 6)
    }
  })

  it('판이 만나는 자리가 번갈아 위아래로 어긋난다', () => {
    const params = { ...ACCORDION_DEFAULT, panels: 3, offset: 0.6 }
    const middleOf = (u: number) => warpAccordion(u, 0.5, params, ctx).y
    // 자르는 자리는 u = 0, 1/3, 2/3, 1
    expect(middleOf(0)).toBeCloseTo(50 + 30, 6)
    expect(middleOf(1 / 3)).toBeCloseTo(50 - 30, 6)
    expect(middleOf(2 / 3)).toBeCloseTo(50 + 30, 6)
    expect(middleOf(1)).toBeCloseTo(50 - 30, 6)
  })

  it('판 안에서는 끊기지 않고 고르게 이어진다', () => {
    const params = { ...ACCORDION_DEFAULT, panels: 2, offset: 0.5 }
    const quarter = warpAccordion(0.25, 0.5, params, ctx).y
    const start = warpAccordion(0, 0.5, params, ctx).y
    const end = warpAccordion(0.5, 0.5, params, ctx).y
    expect(quarter).toBeCloseTo((start + end) / 2, 6)
  })

  it('눌림을 주면 판마다 높이가 번갈아 달라진다', () => {
    const params = { ...ACCORDION_DEFAULT, panels: 2, squeeze: 0.5 }
    const heightAt = (u: number) =>
      warpAccordion(u, 1, params, ctx).y - warpAccordion(u, 0, params, ctx).y
    expect(heightAt(0)).toBeCloseTo(125, 6)
    expect(heightAt(0.5)).toBeCloseTo(75, 6)
  })

  it('판 수는 소수로 들어와도 가까운 정수로 다룬다', () => {
    const rounded = { ...ACCORDION_DEFAULT, panels: 2.4, offset: 0.6 }
    const exact = { ...ACCORDION_DEFAULT, panels: 2, offset: 0.6 }
    expect(warpAccordion(0.3, 0.5, rounded, ctx).y).toBeCloseTo(
      warpAccordion(0.3, 0.5, exact, ctx).y,
      6
    )
  })
})
