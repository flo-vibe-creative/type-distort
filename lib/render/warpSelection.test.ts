import { describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import {
  handleIdsWithin,
  meshColumnHandleIds,
  meshRowHandleIds,
} from '@/lib/render/warpSelection'
import type { WarpType } from '@/lib/warp/types'
import { createWarpEffect } from '@/lib/warp/stack'
import type { Bounds } from '@/lib/geometry/bbox'

function layer(type: WarpType, overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'a',
    name: 'a',
    visible: true,
    source: { kind: 'vector', shapes: [], bounds: { minX: 0, minY: 0, maxX: 300, maxY: 150 } },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warps: [createWarpEffect(type, 'fx-1')],
    letterSpacing: 0,
    fillOverride: null,
    ...overrides,
  }
}

/** 첫 효과를 펼친 상태로 영역 선택을 해 본다 */
const within = (target: Layer, rect: Bounds) => handleIdsWithin(target, rect, null)

describe('handleIdsWithin', () => {
  it('메쉬 격자점 중 영역 안에 든 것만 골라낸다', () => {
    // 기본 격자는 300x150 안에 4x4로 고르게 놓인다 (x = 0, 100, 200, 300)
    expect(within(layer('mesh'), { minX: -10, minY: -10, maxX: 110, maxY: 60 })).toEqual([
      'mesh-0',
      'mesh-1',
      'mesh-4',
      'mesh-5',
    ])
  })

  it('영역이 전체를 덮으면 모든 점이 골라진다', () => {
    expect(
      within(layer('mesh'), { minX: -50, minY: -50, maxX: 350, maxY: 200 })
    ).toHaveLength(16)
  })

  it('아무것도 들어오지 않으면 빈 목록이다', () => {
    expect(within(layer('mesh'), { minX: 500, minY: 500, maxX: 600, maxY: 600 })).toEqual([])
  })

  it('레이어를 옮겨 두면 옮긴 자리를 기준으로 판단한다', () => {
    const moved = layer('mesh', { transform: { x: 1000, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } })
    expect(within(moved, { minX: -10, minY: -10, maxX: 110, maxY: 60 })).toEqual([])
    expect(within(moved, { minX: 990, minY: -10, maxX: 1110, maxY: 60 })).toHaveLength(4)
  })

  it('퍼스펙티브 모서리도 골라낸다', () => {
    expect(
      within(layer('perspective'), { minX: -10, minY: -10, maxX: 10, maxY: 10 })
    ).toEqual(['perspective-0'])
  })

  it('여러 점을 묶을 수 없는 효과는 영역으로 골라도 아무것도 고르지 않는다', () => {
    const wide = { minX: -500, minY: -500, maxX: 900, maxY: 900 }
    expect(within(layer('arc'), wide)).toEqual([])
    expect(within(layer('bulge'), wide)).toEqual([])
  })
})

describe('줄 단위 선택', () => {
  it('가로줄은 그 줄의 네 점을 돌려준다', () => {
    expect(meshRowHandleIds(0)).toEqual(['mesh-0', 'mesh-1', 'mesh-2', 'mesh-3'])
    expect(meshRowHandleIds(2)).toEqual(['mesh-8', 'mesh-9', 'mesh-10', 'mesh-11'])
  })

  it('세로줄은 같은 자리의 네 점을 돌려준다', () => {
    expect(meshColumnHandleIds(0)).toEqual(['mesh-0', 'mesh-4', 'mesh-8', 'mesh-12'])
    expect(meshColumnHandleIds(3)).toEqual(['mesh-3', 'mesh-7', 'mesh-11', 'mesh-15'])
  })

  it('격자 밖 번호는 빈 목록이다', () => {
    expect(meshRowHandleIds(9)).toEqual([])
    expect(meshColumnHandleIds(-1)).toEqual([])
  })
})
