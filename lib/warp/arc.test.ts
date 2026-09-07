import { describe, expect, it } from 'vitest'
import { ARC_DEFAULT, warpArc } from '@/lib/warp/arc'

const ctx = { width: 300, height: 100 }

describe('warpArc', () => {
  it('기본값(각도 0)에서는 원본 좌표를 그대로 돌려준다', () => {
    expect(warpArc(0, 0, ARC_DEFAULT, ctx)).toEqual({ x: 0, y: 0 })
    expect(warpArc(1, 1, ARC_DEFAULT, ctx)).toEqual({ x: 300, y: 100 })
    expect(warpArc(0.5, 0.5, ARC_DEFAULT, ctx)).toEqual({ x: 150, y: 50 })
  })

  it('세기가 0이면 각도가 있어도 원본 좌표를 그대로 돌려준다', () => {
    const params = { ...ARC_DEFAULT, angle: 120, strength: 0 }
    const p = warpArc(0.25, 0.5, params, ctx)
    expect(p.x).toBeCloseTo(75, 6)
    expect(p.y).toBeCloseTo(50, 6)
  })

  it('아주 작은 각도는 원본과 거의 같아 연속적으로 이어진다', () => {
    const p = warpArc(0.25, 0.5, { ...ARC_DEFAULT, angle: 0.001 }, ctx)
    expect(p.x).toBeCloseTo(75, 3)
    expect(p.y).toBeCloseTo(50, 3)
  })

  it('각도 180도에서 세로 중앙선이 반원을 그린다', () => {
    const params = { ...ARC_DEFAULT, angle: 180 }
    const R = ctx.width / Math.PI

    // 왼쪽 끝과 오른쪽 끝은 반지름만큼 벌어진 채 같은 높이에 놓인다
    const left = warpArc(0, 0.5, params, ctx)
    const right = warpArc(1, 0.5, params, ctx)
    expect(left.x).toBeCloseTo(ctx.width / 2 - R, 6)
    expect(right.x).toBeCloseTo(ctx.width / 2 + R, 6)
    expect(left.y).toBeCloseTo(right.y, 6)

    // 가운데가 호의 꼭대기 — 양 끝보다 반지름만큼 위에 있다
    const mid = warpArc(0.5, 0.5, params, ctx)
    expect(mid.x).toBeCloseTo(ctx.width / 2, 6)
    expect(left.y - mid.y).toBeCloseTo(R, 6)
  })

  it('각도 부호를 뒤집으면 호가 반대 방향으로 휜다', () => {
    const up = warpArc(0.5, 0.5, { ...ARC_DEFAULT, angle: 90 }, ctx)
    const down = warpArc(0.5, 0.5, { ...ARC_DEFAULT, angle: -90 }, ctx)
    expect(up.y - ctx.height / 2).toBeCloseTo(-(down.y - ctx.height / 2), 6)
  })

  it('각도를 키울수록 양 끝이 더 많이 내려와 곡률이 세진다', () => {
    const mild = warpArc(0, 0.5, { ...ARC_DEFAULT, angle: 45 }, ctx)
    const strong = warpArc(0, 0.5, { ...ARC_DEFAULT, angle: 120 }, ctx)
    expect(strong.y).toBeGreaterThan(mild.y)
  })

  it('호의 길이가 원본 너비와 같아 글자가 늘어나지 않는다', () => {
    const params = { ...ARC_DEFAULT, angle: 120 }
    const radius = ctx.width / ((120 * Math.PI) / 180)
    const start = warpArc(0, 0.5, params, ctx)
    const end = warpArc(1, 0.5, params, ctx)
    // 양 끝을 잇는 현의 길이 = 2R·sin(각도/2)
    const chord = Math.hypot(end.x - start.x, end.y - start.y)
    expect(chord).toBeCloseTo(2 * radius * Math.sin((120 * Math.PI) / 360), 6)
  })
})

describe('warpArc — 기준선', () => {
  it('기본 기준선은 글자 한가운데다', () => {
    expect(ARC_DEFAULT.baseline).toBe(0.5)
  })

  it('기준선을 어디에 두든 각도가 0이면 원본 그대로다', () => {
    for (const baseline of [0, 0.25, 0.5, 1]) {
      const p = warpArc(0.3, 0.7, { ...ARC_DEFAULT, angle: 0, baseline }, ctx)
      expect(p.x).toBeCloseTo(0.3 * ctx.width, 6)
      expect(p.y).toBeCloseTo(0.7 * ctx.height, 6)
    }
  })

  it('기준선 위의 점은 늘거나 줄지 않아 호의 길이가 원본 너비와 같다', () => {
    for (const baseline of [0, 0.5, 1]) {
      const params = { ...ARC_DEFAULT, angle: 120, baseline }
      const radius = ctx.width / ((120 * Math.PI) / 180)
      const start = warpArc(0, baseline, params, ctx)
      const end = warpArc(1, baseline, params, ctx)
      const chord = Math.hypot(end.x - start.x, end.y - start.y)
      expect(chord).toBeCloseTo(2 * radius * Math.sin((120 * Math.PI) / 360), 6)
    }
  })

  it('기준선을 아랫변에 두면 글자가 곡선 위에 올라앉는다', () => {
    const params = { ...ARC_DEFAULT, angle: 120, baseline: 1 }
    // 아랫변(v = 1)은 호를 따라가고, 윗변(v = 0)은 그보다 바깥으로 벌어진다
    const bottomEnd = warpArc(1, 1, params, ctx)
    const topEnd = warpArc(1, 0, params, ctx)
    const center = { x: ctx.width / 2, y: ctx.height + ctx.width / ((120 * Math.PI) / 180) }
    const bottomRadius = Math.hypot(bottomEnd.x - center.x, bottomEnd.y - center.y)
    const topRadius = Math.hypot(topEnd.x - center.x, topEnd.y - center.y)
    expect(topRadius).toBeGreaterThan(bottomRadius)
  })

  it('기준선 가운데 지점은 항상 그 높이에 그대로 머문다 (핸들이 붙는 자리)', () => {
    for (const baseline of [0, 0.3, 1]) {
      const p = warpArc(0.5, baseline, { ...ARC_DEFAULT, angle: 140, baseline }, ctx)
      expect(p.x).toBeCloseTo(ctx.width / 2, 6)
      expect(p.y).toBeCloseTo(baseline * ctx.height, 6)
    }
  })
})
