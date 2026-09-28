import { describe, expect, it } from 'vitest'
import { ACCORDION_DEFAULT, accordionFolds, warpAccordion } from '@/lib/warp/accordion'

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

  it('판이 만나는 자리가 한 칸 걸러 아래로 밀린다', () => {
    const params = { ...ACCORDION_DEFAULT, centerX: 0, panels: 3, offset: 0.6 }
    const middleOf = (u: number) => warpAccordion(u, 0.5, params, ctx).y
    // 자르는 자리는 u = 0, 1/3, 2/3, 1 — 기준점이 있는 자리는 그대로다
    expect(middleOf(0)).toBeCloseTo(50, 6)
    expect(middleOf(1 / 3)).toBeCloseTo(50 - 60, 6)
    expect(middleOf(2 / 3)).toBeCloseTo(50, 6)
    expect(middleOf(1)).toBeCloseTo(50 - 60, 6)
  })

  it('판 안에서는 끊기지 않고 고르게 이어진다', () => {
    const params = { ...ACCORDION_DEFAULT, centerX: 0, panels: 2, offset: 0.5 }
    const quarter = warpAccordion(0.25, 0.5, params, ctx).y
    const start = warpAccordion(0, 0.5, params, ctx).y
    const end = warpAccordion(0.5, 0.5, params, ctx).y
    expect(quarter).toBeCloseTo((start + end) / 2, 6)
  })

  it('눌림을 주면 판마다 높이가 번갈아 달라진다', () => {
    const params = { ...ACCORDION_DEFAULT, centerX: 0, panels: 2, squeeze: 0.5 }
    const heightAt = (u: number) =>
      warpAccordion(u, 1, params, ctx).y - warpAccordion(u, 0, params, ctx).y
    expect(heightAt(0)).toBeCloseTo(100, 6)
    expect(heightAt(0.5)).toBeCloseTo(50, 6)
  })

  it('판 수는 소수로 들어와도 가까운 정수로 다룬다', () => {
    const rounded = { ...ACCORDION_DEFAULT, centerX: 0, panels: 2.4, offset: 0.6 }
    const exact = { ...ACCORDION_DEFAULT, centerX: 0, panels: 2, offset: 0.6 }
    expect(warpAccordion(0.3, 0.5, rounded, ctx).y).toBeCloseTo(
      warpAccordion(0.3, 0.5, exact, ctx).y,
      6
    )
  })

  describe('접히는 자리 기준점', () => {
    it('판 수보다 하나 많게, 고르게 놓인다', () => {
      expect(accordionFolds({ ...ACCORDION_DEFAULT, panels: 3 })).toEqual([
        { x: 0, y: 0.5 },
        { x: 1 / 3, y: 0.5 },
        { x: 2 / 3, y: 0.5 },
        { x: 1, y: 0.5 },
      ])
      expect(accordionFolds({ ...ACCORDION_DEFAULT, panels: 5 })).toHaveLength(6)
    })

    it('끌어 옮긴 자리를 그대로 쓴다', () => {
      const folds = [
        { x: 0, y: 0.5 },
        { x: 0.2, y: 0.1 },
        { x: 1, y: 0.9 },
      ]
      const params = { ...ACCORDION_DEFAULT, panels: 2, folds }
      // 옮겨 둔 자리가 그대로 결과에 나온다
      expect(warpAccordion(0.2, 0.5, params, ctx).y).toBeCloseTo(10, 6)
      expect(warpAccordion(1, 0.5, params, ctx).y).toBeCloseTo(90, 6)
      // 자리 사이는 고르게 이어진다
      expect(warpAccordion(0.1, 0.5, params, ctx).y).toBeCloseTo(30, 6)
    })

    it('판 수가 바뀌어 수가 맞지 않으면 고르게 다시 놓는다', () => {
      const folds = [
        { x: 0, y: 0.5 },
        { x: 0.2, y: 0.1 },
        { x: 1, y: 0.9 },
      ]
      const params = { ...ACCORDION_DEFAULT, panels: 4, folds }
      expect(accordionFolds(params).map((fold) => fold.x)).toEqual([0, 0.25, 0.5, 0.75, 1])
    })

    it('어긋남은 옮겨 둔 자리 위에 더해진다', () => {
      const folds = [
        { x: 0, y: 0.5 },
        { x: 0.5, y: 0.3 },
        { x: 1, y: 0.5 },
      ]
      const params = { ...ACCORDION_DEFAULT, panels: 2, offset: 0.4, folds }
      // 한 칸 걸러 있는 가운데 자리만 0.4만큼 위로 더 밀린다
      const ys = accordionFolds(params).map((fold) => fold.y)
      expect(ys[0]).toBeCloseTo(0.5, 6)
      expect(ys[1]).toBeCloseTo(-0.1, 6)
      expect(ys[2]).toBeCloseTo(0.5, 6)
    })
  })
})
