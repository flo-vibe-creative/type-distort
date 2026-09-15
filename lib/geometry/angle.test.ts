import { describe, expect, it } from 'vitest'
import { normalizeDegrees } from '@/lib/geometry/angle'

describe('normalizeDegrees', () => {
  it('이미 범위 안이면 그대로 둔다', () => {
    expect(normalizeDegrees(30)).toBe(30)
    expect(normalizeDegrees(-90)).toBe(-90)
  })

  it('한 바퀴 넘게 센 값을 접는다', () => {
    expect(normalizeDegrees(-337.5)).toBeCloseTo(22.5, 6)
    expect(normalizeDegrees(358)).toBeCloseTo(-2, 6)
    expect(normalizeDegrees(725)).toBeCloseTo(5, 6)
  })

  it('반 바퀴는 180으로 맞춘다', () => {
    expect(normalizeDegrees(180)).toBe(180)
    expect(normalizeDegrees(-180)).toBe(180)
  })
})
