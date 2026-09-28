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

  describe('기준점', () => {
    it('기준점 자리는 아무리 휘어도 제자리에 남는다', () => {
      const params = {
        ...FAN_DEFAULT,
        centerX: 0.3,
        centerY: 0.7,
        topBend: 0.6,
        bottomBend: -0.4,
        spread: 0.5,
        skew: 0.3,
      }
      const p = warpFan(0.3, 0.7, params, ctx)
      expect(p.x).toBeCloseTo(0.3 * ctx.width, 6)
      expect(p.y).toBeCloseTo(0.7 * ctx.height, 6)
    })

    it('기준점을 옮기면 눌리는 자리도 함께 옮겨진다', () => {
      const params = { ...FAN_DEFAULT, centerX: 0.25, topBend: 0.5 }
      const heightAtTop = (u: number) => warpFan(u, 0, params, ctx).y
      expect(heightAtTop(0.25)).toBeCloseTo(0, 6)
      // 기준점에서 먼 오른쪽 끝이 가장 많이 솟는다
      expect(heightAtTop(1)).toBeCloseTo(-50, 6)
      expect(heightAtTop(0)).toBeCloseTo(-50, 6)
      expect(heightAtTop(0.5)).toBeLessThan(0)
      expect(heightAtTop(0.5)).toBeGreaterThan(-50)
    })

    it('기준점 높이가 퍼짐의 축이 된다', () => {
      const params = { ...FAN_DEFAULT, centerY: 0.8, spread: 0.5 }
      // 기준점 높이에서는 가로로 밀리지 않고, 그보다 위는 바깥으로 간다
      expect(warpFan(1, 0.8, params, ctx).x).toBeCloseTo(200, 6)
      expect(warpFan(1, 0, params, ctx).x).toBeGreaterThan(200)
    })
  })

  describe('위아래로 밀기', () => {
    it('위아래 퍼짐은 글자 왼쪽과 오른쪽을 서로 반대로 민다', () => {
      const params = { ...FAN_DEFAULT, spreadY: 0.5 }
      // 아래쪽 끝에서 왼쪽은 더 아래로, 오른쪽은 위로 간다
      expect(warpFan(0, 1, params, ctx).y).toBeGreaterThan(100)
      expect(warpFan(1, 1, params, ctx).y).toBeLessThan(100)
      expect(warpFan(0.5, 1, params, ctx).y).toBeCloseTo(100, 6)
    })

    it('위아래 기울기는 전체를 같은 방향으로 기울인다', () => {
      const params = { ...FAN_DEFAULT, skewY: 0.5 }
      expect(warpFan(0, 0.4, params, ctx).y - 40).toBeCloseTo(25, 6)
      expect(warpFan(0, 0.9, params, ctx).y - 90).toBeCloseTo(25, 6)
      expect(warpFan(1, 0.4, params, ctx).y - 40).toBeCloseTo(-25, 6)
    })

    it('여러 값을 함께 걸어도 기준점은 제자리에 남는다', () => {
      const params = {
        ...FAN_DEFAULT,
        centerX: 0.35,
        centerY: 0.6,
        topBend: 0.4,
        bottomBend: -0.3,
        spread: 0.5,
        skew: 0.2,
        spreadY: -0.4,
        skewY: 0.25,
      }
      const p = warpFan(0.35, 0.6, params, ctx)
      expect(p.x).toBeCloseTo(0.35 * ctx.width, 6)
      expect(p.y).toBeCloseTo(0.6 * ctx.height, 6)
    })
  })
})
