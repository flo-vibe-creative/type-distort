import { describe, expect, it } from 'vitest'
import { applyHomography, homographyFromUnitSquare } from '@/lib/geometry/matrix'

describe('homographyFromUnitSquare', () => {
  it('네 모서리가 그대로면 항등 변환이 된다', () => {
    const h = homographyFromUnitSquare([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
    const p = applyHomography(h, 0.3, 0.7)
    expect(p.x).toBeCloseTo(0.3, 9)
    expect(p.y).toBeCloseTo(0.7, 9)
  })

  it('지정한 네 모서리로 정확히 보낸다', () => {
    const corners = [
      { x: 10, y: 20 },
      { x: 90, y: 5 },
      { x: 120, y: 80 },
      { x: 0, y: 100 },
    ]
    const h = homographyFromUnitSquare(corners)
    const mapped = [
      applyHomography(h, 0, 0),
      applyHomography(h, 1, 0),
      applyHomography(h, 1, 1),
      applyHomography(h, 0, 1),
    ]
    mapped.forEach((p, i) => {
      expect(p.x).toBeCloseTo(corners[i].x, 6)
      expect(p.y).toBeCloseTo(corners[i].y, 6)
    })
  })

  it('아핀 변환(평행사변형)도 특이점 없이 처리한다', () => {
    const h = homographyFromUnitSquare([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 1, y: 1 },
    ])
    const p = applyHomography(h, 0.5, 0.5)
    expect(p.x).toBeCloseTo(1.5, 6)
    expect(p.y).toBeCloseTo(0.5, 6)
  })
})
