import { describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import { handleIdsWithin, isDragMeaningful, rectFromPoints } from '@/lib/render/warpSelection'
import { createWarp } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'

function layer(type: WarpType, overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'a',
    name: 'a',
    visible: true,
    source: { kind: 'vector', shapes: [], bounds: { minX: 0, minY: 0, maxX: 300, maxY: 150 } },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp(type),
    letterSpacing: 0,
    ...overrides,
  }
}

describe('rectFromPoints', () => {
  it('어느 방향으로 끌어도 같은 사각형이 나온다', () => {
    const a = rectFromPoints({ x: 10, y: 20 }, { x: 50, y: 5 })
    const b = rectFromPoints({ x: 50, y: 5 }, { x: 10, y: 20 })
    expect(a).toEqual({ minX: 10, minY: 5, maxX: 50, maxY: 20 })
    expect(a).toEqual(b)
  })
})

describe('isDragMeaningful', () => {
  it('거의 움직이지 않았으면 끌기가 아니라 클릭으로 본다', () => {
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 1 }, 1)).toBe(false)
  })

  it('충분히 움직였으면 끌기로 본다', () => {
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 20, y: 0 }, 1)).toBe(true)
  })

  it('화면을 확대해 두면 같은 화면 거리라도 캔버스 거리는 짧아진다', () => {
    // 확대율 10에서는 캔버스 좌표 1만 움직여도 화면에서는 10px이라 끌기로 본다
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 0 }, 10)).toBe(true)
    expect(isDragMeaningful({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.1)).toBe(false)
  })
})

describe('handleIdsWithin', () => {
  it('메쉬 격자점 중 영역 안에 든 것만 골라낸다', () => {
    // 기본 격자는 300x150 안에 4x4로 고르게 놓인다 (x = 0, 100, 200, 300)
    const found = handleIdsWithin(layer('mesh'), { minX: -10, minY: -10, maxX: 110, maxY: 60 })
    expect(found).toEqual(['mesh-0', 'mesh-1', 'mesh-4', 'mesh-5'])
  })

  it('영역이 전체를 덮으면 모든 점이 골라진다', () => {
    expect(handleIdsWithin(layer('mesh'), { minX: -50, minY: -50, maxX: 350, maxY: 200 })).toHaveLength(16)
  })

  it('아무것도 들어오지 않으면 빈 목록이다', () => {
    expect(handleIdsWithin(layer('mesh'), { minX: 500, minY: 500, maxX: 600, maxY: 600 })).toEqual([])
  })

  it('레이어를 옮겨 두면 옮긴 자리를 기준으로 판단한다', () => {
    const moved = layer('mesh', { transform: { x: 1000, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } })
    expect(handleIdsWithin(moved, { minX: -10, minY: -10, maxX: 110, maxY: 60 })).toEqual([])
    expect(handleIdsWithin(moved, { minX: 990, minY: -10, maxX: 1110, maxY: 60 })).toEqual([
      'mesh-0',
      'mesh-1',
      'mesh-4',
      'mesh-5',
    ])
  })

  it('퍼스펙티브 모서리도 골라낸다', () => {
    expect(handleIdsWithin(layer('perspective'), { minX: -10, minY: -10, maxX: 10, maxY: 10 })).toEqual([
      'perspective-0',
    ])
  })

  it('여러 점을 묶을 수 없는 효과는 영역으로 골라도 아무것도 고르지 않는다', () => {
    const wide = { minX: -500, minY: -500, maxX: 900, maxY: 900 }
    expect(handleIdsWithin(layer('arc'), wide)).toEqual([])
    expect(handleIdsWithin(layer('bulge'), wide)).toEqual([])
  })
})
