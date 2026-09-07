import { describe, expect, it } from 'vitest'
import { flattenPath } from '@/lib/svg/flatten'
import { parsePathData } from '@/lib/svg/pathData'

describe('flattenPath', () => {
  it('직선만 있는 경로는 점을 늘리지 않는다', () => {
    const subpaths = flattenPath(parsePathData('M 0 0 L 10 0 L 10 10'), 0.1)
    expect(subpaths).toHaveLength(1)
    expect(subpaths[0].closed).toBe(false)
    expect(subpaths[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
  })

  it('Z가 있으면 닫힌 하위 경로로 표시한다', () => {
    const subpaths = flattenPath(parsePathData('M 0 0 L 10 0 L 10 10 Z'), 0.1)
    expect(subpaths[0].closed).toBe(true)
    // 닫힘 표시로 충분하므로 시작점을 중복해 넣지 않는다
    expect(subpaths[0].points).toHaveLength(3)
  })

  it('M이 여러 번 나오면 하위 경로가 나뉜다 (글자의 구멍 처리)', () => {
    const subpaths = flattenPath(parsePathData('M 0 0 L 5 0 Z M 1 1 L 2 1 Z'), 0.1)
    expect(subpaths).toHaveLength(2)
    expect(subpaths[1].points[0]).toEqual({ x: 1, y: 1 })
  })

  it('곡선은 점열로 쪼개지고, 시작점과 끝점은 정확히 보존된다', () => {
    const subpaths = flattenPath(parsePathData('M 0 0 C 0 20 20 20 20 0'), 0.5)
    const points = subpaths[0].points
    expect(points.length).toBeGreaterThan(2)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]).toEqual({ x: 20, y: 0 })
  })

  it('허용 오차를 줄이면 점이 더 많아진다', () => {
    const d = parsePathData('M 0 0 C 0 40 40 40 40 0')
    const coarse = flattenPath(d, 2).at(0)!.points.length
    const fine = flattenPath(d, 0.05).at(0)!.points.length
    expect(fine).toBeGreaterThan(coarse)
  })

  it('쪼갠 점들이 실제 곡선 위에 허용 오차 안으로 들어온다', () => {
    const tolerance = 0.2
    const points = flattenPath(parsePathData('M 0 0 C 0 40 40 40 40 0'), tolerance).at(0)!.points
    // 곡선의 정확한 중간점 (t = 0.5) 과 가장 가까운 근사점의 거리
    const exactMid = { x: 20, y: 30 }
    const nearest = Math.min(...points.map((p) => Math.hypot(p.x - exactMid.x, p.y - exactMid.y)))
    expect(nearest).toBeLessThan(tolerance)
  })

  it('M 없이 시작하는 경로는 무시한다', () => {
    expect(flattenPath(parsePathData('L 10 10'), 0.1)).toEqual([])
  })

  it('점이 하나뿐인 하위 경로는 그릴 것이 없으므로 버린다', () => {
    expect(flattenPath(parsePathData('M 5 5 M 1 1 L 2 2'), 0.1)).toHaveLength(1)
  })
})
