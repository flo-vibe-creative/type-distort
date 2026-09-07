import { describe, expect, it } from 'vitest'
import { toleranceForZoom, warpCommandsToPathData, warpPointsOf } from '@/lib/render/warpShape'
import { parsePathData } from '@/lib/svg/pathData'
import { createWarp } from '@/lib/warp/registry'

const bounds = { minX: 20, minY: 10, maxX: 120, maxY: 60 }
const square = parsePathData('M 20 10 L 120 10 L 120 60 L 20 60 Z')

describe('warpCommandsToPathData', () => {
  it('왜곡이 없으면 기준 영역의 왼쪽 위를 원점으로 옮긴 경로가 된다', () => {
    const d = warpCommandsToPathData(square, bounds, createWarp('arc'), 0.1)
    expect(d).toBe('M0 0L100 0L100 50L0 50Z')
  })

  it('기준 영역이 0 크기여도 터지지 않는다', () => {
    const d = warpCommandsToPathData(
      parsePathData('M 5 5 L 5 5 L 5 5 Z'),
      { minX: 5, minY: 5, maxX: 5, maxY: 5 },
      createWarp('arc'),
      0.1
    )
    expect(typeof d).toBe('string')
  })

  it('왜곡을 걸면 경로가 실제로 달라진다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc 여야 한다')
    warp.params.angle = 90
    const distorted = warpCommandsToPathData(square, bounds, warp, 0.1)
    expect(distorted).not.toBe(warpCommandsToPathData(square, bounds, createWarp('arc'), 0.1))
  })

  it('아크 왜곡의 가운데는 위로 솟고 양 끝은 내려온다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc 여야 한다')
    warp.params.angle = 120
    const points = warpPointsOf(square, bounds, warp, 0.1).flatMap((s) => s.points)
    const left = points[0]
    const right = points.find((p) => p.x > left.x + 50)
    expect(right).toBeDefined()
    expect(right!.y).toBeCloseTo(left.y, 6)
  })
})

describe('toleranceForZoom', () => {
  it('확대할수록 더 잘게 쪼갠다', () => {
    expect(toleranceForZoom(4, 1, false)).toBeLessThan(toleranceForZoom(1, 1, false))
  })

  it('레이어를 키워 놓으면 그만큼 더 잘게 쪼갠다', () => {
    expect(toleranceForZoom(1, 4, false)).toBeLessThan(toleranceForZoom(1, 1, false))
  })

  it('드래그 중에는 거칠게 쪼개 실시간 반응을 유지한다', () => {
    expect(toleranceForZoom(1, 1, true)).toBeGreaterThan(toleranceForZoom(1, 1, false))
  })

  it('아무리 확대해도 한없이 잘게 쪼개지 않는다', () => {
    expect(toleranceForZoom(10000, 10000, false)).toBeGreaterThan(0)
  })
})
