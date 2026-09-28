import { describe, expect, it } from 'vitest'
import { FAN_DEFAULT, warpFan } from '@/lib/warp/fan'

const ctx = { width: 200, height: 100 }

describe('warpFan', () => {
  it('기본값에서는 원본 좌표를 그대로 돌려준다', () => {
    const p = warpFan(0.25, 0.75, FAN_DEFAULT, ctx)
    expect(p.x).toBeCloseTo(50, 6)
    expect(p.y).toBeCloseTo(75, 6)
  })

  it('윗선 휨을 주면 양 끝이 위로 솟고 가운데는 그대로다', () => {
    const params = { ...FAN_DEFAULT, topBend: 0.5 }
    expect(warpFan(0, 0, params, ctx).y).toBeCloseTo(-50, 6)
    expect(warpFan(1, 0, params, ctx).y).toBeCloseTo(-50, 6)
    expect(warpFan(0.5, 0, params, ctx).y).toBeCloseTo(0, 6)
  })

  it('아랫선 휨은 아랫변만 움직인다', () => {
    const params = { ...FAN_DEFAULT, bottomBend: 0.4 }
    expect(warpFan(0, 1, params, ctx).y).toBeCloseTo(140, 6)
    expect(warpFan(0, 0, params, ctx).y).toBeCloseTo(0, 6)
  })

  it('두 휨을 같은 방향으로 주면 가운데가 눌리고 양 끝이 커진다', () => {
    const params = { ...FAN_DEFAULT, topBend: 0.5, bottomBend: 0.5 }
    const edge = warpFan(0, 1, params, ctx).y - warpFan(0, 0, params, ctx).y
    const middle = warpFan(0.5, 1, params, ctx).y - warpFan(0.5, 0, params, ctx).y
    expect(edge).toBeGreaterThan(middle)
    expect(middle).toBeCloseTo(100, 6)
  })

  it('퍼짐을 주면 글자 윗부분이 바깥으로 벌어진다', () => {
    const params = { ...FAN_DEFAULT, spread: 0.5 }
    // 오른쪽 끝은 위가 더 오른쪽으로, 왼쪽 끝은 위가 더 왼쪽으로 간다
    expect(warpFan(1, 0, params, ctx).x).toBeGreaterThan(200)
    expect(warpFan(1, 1, params, ctx).x).toBeLessThan(200)
    expect(warpFan(0, 0, params, ctx).x).toBeLessThan(0)
    // 가운데와 세로 한가운데는 가로로 움직이지 않는다
    expect(warpFan(0.5, 0, params, ctx).x).toBeCloseTo(100, 6)
    expect(warpFan(0.2, 0.5, params, ctx).x).toBeCloseTo(40, 6)
  })

  it('기울기는 전체를 한쪽으로 같은 만큼 기울인다', () => {
    const params = { ...FAN_DEFAULT, skew: 0.5 }
    const shiftAtTop = warpFan(0.3, 0, params, ctx).x - 60
    expect(shiftAtTop).toBeCloseTo(50, 6)
    expect(warpFan(0.8, 0, params, ctx).x - 160).toBeCloseTo(shiftAtTop, 6)
    expect(warpFan(0.3, 1, params, ctx).x - 60).toBeCloseTo(-shiftAtTop, 6)
  })

  it('휨이 음수면 반대로 가운데가 솟는다', () => {
    const params = { ...FAN_DEFAULT, topBend: -0.5 }
    expect(warpFan(0, 0, params, ctx).y).toBeCloseTo(50, 6)
  })
})
