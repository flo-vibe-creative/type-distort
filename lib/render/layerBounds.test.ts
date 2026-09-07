import { describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import { warpedBounds } from '@/lib/render/layerBounds'
import { createWarp } from '@/lib/warp/registry'

function layer(width: number, height: number): Layer {
  return {
    id: 'a',
    name: 'a',
    visible: true,
    source: { kind: 'vector', shapes: [], bounds: { minX: 0, minY: 0, maxX: width, maxY: height } },
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    warp: createWarp('arc'),
  }
}

describe('warpedBounds', () => {
  it('왜곡이 없으면 원본 크기 그대로다', () => {
    const b = warpedBounds(layer(200, 100))
    expect(b.minX).toBeCloseTo(0, 6)
    expect(b.minY).toBeCloseTo(0, 6)
    expect(b.maxX).toBeCloseTo(200, 6)
    expect(b.maxY).toBeCloseTo(100, 6)
  })

  it('아크를 걸면 세로로 더 커진다', () => {
    const target = layer(200, 100)
    if (target.warp.type !== 'arc') throw new Error('arc 여야 한다')
    target.warp.params.angle = 120
    const b = warpedBounds(target)
    expect(b.maxY - b.minY).toBeGreaterThan(100)
  })

  it('볼록을 걸면 가로세로 모두 커진다', () => {
    const target = layer(200, 200)
    target.warp = createWarp('bulge')
    if (target.warp.type !== 'bulge') throw new Error('bulge 여야 한다')
    target.warp.params.strength = 0.6
    target.warp.params.radius = 2
    const b = warpedBounds(target)
    expect(b.maxX - b.minX).toBeGreaterThan(200)
    expect(b.maxY - b.minY).toBeGreaterThan(200)
  })

  it('크기가 0인 레이어도 유효한 사각형을 돌려준다', () => {
    const b = warpedBounds(layer(0, 0))
    expect(Number.isFinite(b.minX)).toBe(true)
    expect(b.maxX).toBeGreaterThanOrEqual(b.minX)
  })
})
