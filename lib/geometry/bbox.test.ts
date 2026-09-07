import { describe, expect, it } from 'vitest'
import { boundsOfCommands, boundsOfPoints, mergeBounds } from '@/lib/geometry/bbox'
import { parsePathData } from '@/lib/svg/pathData'

describe('boundsOfPoints', () => {
  it('점들을 감싸는 사각형을 구한다', () => {
    const b = boundsOfPoints([
      { x: 1, y: 5 },
      { x: -3, y: 2 },
      { x: 4, y: 9 },
    ])
    expect(b).toEqual({ minX: -3, minY: 2, maxX: 4, maxY: 9 })
  })

  it('점이 없으면 null이다', () => {
    expect(boundsOfPoints([])).toBeNull()
  })
})

describe('boundsOfCommands', () => {
  it('직선 경로의 경계를 구한다', () => {
    expect(boundsOfCommands(parsePathData('M 0 0 L 10 20 L -5 3'))).toEqual({
      minX: -5,
      minY: 0,
      maxX: 10,
      maxY: 20,
    })
  })

  it('곡선은 실제로 지나가는 범위로 계산해 제어점 때문에 부풀지 않는다', () => {
    // 제어점 y는 30까지 올라가지만 곡선이 실제 닿는 최고점은 22.5다
    const b = boundsOfCommands(parsePathData('M 0 0 C 0 30 20 30 20 0'))
    expect(b).not.toBeNull()
    expect(b!.maxY).toBeCloseTo(22.5, 3)
    expect(b!.minX).toBeCloseTo(0, 6)
    expect(b!.maxX).toBeCloseTo(20, 6)
  })
})

describe('mergeBounds', () => {
  it('두 경계를 합친다', () => {
    const merged = mergeBounds(
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { minX: 5, minY: -5, maxX: 20, maxY: 8 }
    )
    expect(merged).toEqual({ minX: 0, minY: -5, maxX: 20, maxY: 10 })
  })

  it('한쪽이 없으면 나머지를 돌려준다', () => {
    const b = { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    expect(mergeBounds(null, b)).toEqual(b)
    expect(mergeBounds(b, null)).toEqual(b)
    expect(mergeBounds(null, null)).toBeNull()
  })
})
