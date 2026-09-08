import { describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import { isDragMeaningful, layerIdsWithin, rectFromPoints } from '@/lib/render/marquee'
import { createWarp } from '@/lib/warp/registry'

function layer(id: string, x: number, y: number, visible = true): Layer {
  return {
    id,
    name: id,
    visible,
    source: { kind: 'vector', shapes: [], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 50 } },
    transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp('arc'),
    letterSpacing: 0,
    fillOverride: null,
  }
}

describe('rectFromPoints', () => {
  it('어느 방향으로 끌어도 같은 사각형이 나온다', () => {
    const a = rectFromPoints({ x: 10, y: 20 }, { x: 50, y: 5 })
    expect(a).toEqual({ minX: 10, minY: 5, maxX: 50, maxY: 20 })
    expect(rectFromPoints({ x: 50, y: 5 }, { x: 10, y: 20 })).toEqual(a)
  })
})

describe('isDragMeaningful', () => {
  it('거의 움직이지 않았으면 끌기가 아니라 클릭으로 본다', () => {
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 1 }, 1)).toBe(false)
  })

  it('충분히 움직였으면 끌기로 본다', () => {
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 20, y: 0 }, 1)).toBe(true)
  })

  it('화면 배율을 기준으로 판단해, 확대해 두면 짧게 움직여도 끌기가 된다', () => {
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 0 }, 10)).toBe(true)
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.1)).toBe(false)
  })
})

describe('layerIdsWithin', () => {
  const layers = [layer('a', 0, 0), layer('b', 200, 0), layer('c', 0, 200)]

  it('영역에 걸친 레이어를 고른다 (완전히 감싸지 않아도 된다)', () => {
    expect(layerIdsWithin(layers, { minX: 50, minY: 10, maxX: 250, maxY: 40 })).toEqual(['a', 'b'])
  })

  it('영역 전체를 덮으면 모두 고른다', () => {
    expect(layerIdsWithin(layers, { minX: -10, minY: -10, maxX: 400, maxY: 400 })).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('닿지 않으면 아무것도 고르지 않는다', () => {
    expect(layerIdsWithin(layers, { minX: 500, minY: 500, maxX: 600, maxY: 600 })).toEqual([])
  })

  it('숨긴 레이어는 고르지 않는다', () => {
    expect(layerIdsWithin([layer('a', 0, 0, false)], { minX: -10, minY: -10, maxX: 400, maxY: 400 })).toEqual([])
  })

  it('모서리만 스쳐도 걸린 것으로 본다', () => {
    expect(layerIdsWithin([layer('a', 0, 0)], { minX: 100, minY: 50, maxX: 200, maxY: 150 })).toEqual(['a'])
  })
})
