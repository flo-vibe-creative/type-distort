import { describe, expect, it } from 'vitest'
import {
  dragWarpHandle,
  dragWarpHandles,
  supportsMultiSelect,
  warpHandles,
} from '@/lib/warp/handles'
import { createWarp } from '@/lib/warp/registry'
import { applyWarp } from '@/lib/warp/registry'

const size = { width: 200, height: 100 }

describe('아크 핸들', () => {
  it('양 끝과 기준점에 핸들이 놓인다', () => {
    const handles = warpHandles(createWarp('arc'), size)
    expect(handles.map((h) => h.id)).toEqual(['arc-start', 'arc-anchor', 'arc-end'])
    expect(handles[1].role).toBe('anchor')
  })

  it('핸들은 실제로 왜곡된 위치에 붙어 있다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 120
    const handles = warpHandles(warp, size)
    const expected = applyWarp(warp, 1, 0.5, size)
    expect(handles[2].local.x).toBeCloseTo(expected.x, 6)
    expect(handles[2].local.y).toBeCloseTo(expected.y, 6)
  })

  it('기준선을 옮기면 핸들 세 개가 모두 그 높이로 따라간다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.baseline = 1
    const handles = warpHandles(warp, size)
    handles.forEach((handle) => expect(handle.local.y).toBeCloseTo(size.height, 6))
  })

  it('기준점을 옮기면 그 자리로 핸들이 따라간다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 140
    warp.params.anchor = 0.2
    const handles = warpHandles(warp, size)
    expect(handles[1].local.x).toBeCloseTo(0.2 * size.width, 6)
  })

  it('각도가 없을 때는 끈 자리를 그대로 읽는다', () => {
    const patch = dragWarpHandle(createWarp('arc'), size, 'arc-anchor', { x: 40, y: 80 })
    expect(patch).toEqual({ anchor: 0.2, baseline: 0.8 })
  })

  it('기준점을 곡선 앞쪽·뒤쪽 어디로든 옮길 수 있다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 140

    for (const anchor of [0, 0.2, 0.75, 1]) {
      const target = applyWarp(
        { type: 'arc', params: { ...warp.params, anchor } },
        anchor,
        warp.params.baseline,
        size
      )
      const patch = dragWarpHandle(warp, size, 'arc-anchor', target)
      expect(patch!.anchor as number).toBeCloseTo(anchor, 3)
      expect(patch!.baseline as number).toBeCloseTo(warp.params.baseline, 3)
    }
  })

  it('기준점은 글자 밖으로 나가지 않는다', () => {
    const warp = createWarp('arc')
    expect(dragWarpHandle(warp, size, 'arc-anchor', { x: -500, y: 50 })!.anchor).toBe(0)
    expect(dragWarpHandle(warp, size, 'arc-anchor', { x: 5000, y: 50 })!.anchor).toBe(1)
  })

  it('끈 자리로 기준점이 정확히 따라온다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 150
    warp.params.rotation = 35

    const target = { x: size.width * 0.7, y: size.height * 0.4 }
    const patch = dragWarpHandle(warp, size, 'arc-anchor', target)
    const params = { ...warp.params, ...(patch as object) }
    const moved = applyWarp({ type: 'arc', params }, params.anchor, params.baseline, size)
    expect(moved.x).toBeCloseTo(target.x, 6)
    expect(moved.y).toBeCloseTo(target.y, 6)
  })




  it('기준선은 글자에서 너무 멀리 벗어나지 않는다', () => {
    const far = dragWarpHandle(createWarp('arc'), size, 'arc-anchor', { x: 0, y: 10000 })
    expect(far!.baseline as number).toBeLessThanOrEqual(1.5)
    const above = dragWarpHandle(createWarp('arc'), size, 'arc-anchor', { x: 0, y: -10000 })
    expect(above!.baseline as number).toBeGreaterThanOrEqual(-0.5)
  })

  it('기준선을 옮긴 뒤에도 끝점 핸들로 각도를 정확히 찾아낸다', () => {
    const target = createWarp('arc')
    if (target.type !== 'arc') throw new Error('arc')
    target.params.baseline = 1
    target.params.angle = 130
    const at = applyWarp(target, 1, 1, size)

    const current = createWarp('arc')
    if (current.type !== 'arc') throw new Error('arc')
    current.params.baseline = 1
    const patch = dragWarpHandle(current, size, 'arc-end', at)
    expect(patch!.angle as number).toBeCloseTo(130, 0)
  })

  it('핸들을 원래 자리로 끌면 각도가 그대로다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 90
    const at = applyWarp(warp, 1, 0.5, size)
    const patch = dragWarpHandle(warp, size, 'arc-end', at)
    expect(patch).not.toBeNull()
    expect(patch!.angle as number).toBeCloseTo(90, 0)
  })

  it('핸들을 다른 각도의 자리로 끌면 그 각도를 찾아낸다', () => {
    const target = createWarp('arc')
    if (target.type !== 'arc') throw new Error('arc')
    target.params.angle = -150
    const at = applyWarp(target, 1, 0.5, size)

    const current = createWarp('arc')
    const patch = dragWarpHandle(current, size, 'arc-end', at)
    expect(patch!.angle as number).toBeCloseTo(-150, 0)
  })

  it('왼쪽 핸들로도 각도를 바꿀 수 있다', () => {
    const target = createWarp('arc')
    if (target.type !== 'arc') throw new Error('arc')
    target.params.angle = 200
    const at = applyWarp(target, 0, 0.5, size)
    const patch = dragWarpHandle(createWarp('arc'), size, 'arc-start', at)
    expect(patch!.angle as number).toBeCloseTo(200, 0)
  })
})

describe('볼록 핸들', () => {
  it('중심점과 반경 핸들이 놓인다', () => {
    const handles = warpHandles(createWarp('bulge'), size)
    expect(handles.map((h) => h.id)).toEqual(['bulge-center', 'bulge-radius'])
  })

  it('중심점을 끌면 중심이 그 자리로 간다', () => {
    const patch = dragWarpHandle(createWarp('bulge'), size, 'bulge-center', { x: 50, y: 25 })
    expect(patch).toEqual({ cx: 0.25, cy: 0.25 })
  })

  it('반경 핸들을 끌면 거리에 맞춰 반경이 바뀐다', () => {
    const warp = createWarp('bulge')
    const half = Math.hypot(size.width, size.height) / 2
    const center = { x: size.width / 2, y: size.height / 2 }
    const patch = dragWarpHandle(warp, size, 'bulge-radius', { x: center.x + half, y: center.y })
    expect(patch!.radius as number).toBeCloseTo(1, 6)
  })

  it('반경은 0이 되지 않는다', () => {
    const warp = createWarp('bulge')
    const patch = dragWarpHandle(warp, size, 'bulge-radius', { x: 100, y: 50 })
    expect(patch!.radius as number).toBeGreaterThan(0)
  })
})

describe('퍼스펙티브 핸들', () => {
  it('네 모서리에 핸들이 놓인다', () => {
    const handles = warpHandles(createWarp('perspective'), size)
    expect(handles).toHaveLength(4)
    expect(handles[0].local).toEqual({ x: 0, y: 0 })
    expect(handles[2].local).toEqual({ x: 200, y: 100 })
  })

  it('모서리를 끌면 그 모서리만 움직인다', () => {
    const warp = createWarp('perspective')
    const patch = dragWarpHandle(warp, size, 'perspective-1', { x: 150, y: 20 })
    const corners = patch!.corners as { x: number; y: number }[]
    expect(corners[1]).toEqual({ x: 0.75, y: 0.2 })
    expect(corners[0]).toEqual({ x: 0, y: 0 })
  })
})

describe('메쉬 핸들', () => {
  it('제어점 열여섯 개가 격자로 놓인다', () => {
    const handles = warpHandles(createWarp('mesh'), size)
    expect(handles).toHaveLength(16)
    expect(handles[0].local).toEqual({ x: 0, y: 0 })
    expect(handles[15].local).toEqual({ x: 200, y: 100 })
  })

  it('제어점을 끌면 그 점만 움직인다', () => {
    const warp = createWarp('mesh')
    const patch = dragWarpHandle(warp, size, 'mesh-5', { x: 60, y: 10 })
    const points = patch!.points as { x: number; y: number }[]
    expect(points[5]).toEqual({ x: 0.3, y: 0.1 })
    expect(points[0]).toEqual({ x: 0, y: 0 })
  })
})

describe('잘못된 입력', () => {
  it('없는 핸들 이름이면 아무것도 바꾸지 않는다', () => {
    expect(dragWarpHandle(createWarp('mesh'), size, 'mesh-99', { x: 0, y: 0 })).toBeNull()
    expect(dragWarpHandle(createWarp('arc'), size, '엉뚱한-핸들', { x: 0, y: 0 })).toBeNull()
  })

  it('크기가 0이면 아무것도 바꾸지 않는다', () => {
    expect(
      dragWarpHandle(createWarp('mesh'), { width: 0, height: 0 }, 'mesh-5', { x: 1, y: 1 })
    ).toBeNull()
  })
})

describe('여러 점 함께 옮기기', () => {
  it('메쉬와 퍼스펙티브만 여러 점을 묶을 수 있다', () => {
    expect(supportsMultiSelect('mesh')).toBe(true)
    expect(supportsMultiSelect('perspective')).toBe(true)
    expect(supportsMultiSelect('arc')).toBe(false)
    expect(supportsMultiSelect('bulge')).toBe(false)
  })

  it('고른 점이 하나뿐이면 평소와 똑같이 움직인다', () => {
    const warp = createWarp('mesh')
    const patch = dragWarpHandles(warp, size, 'mesh-5', ['mesh-5'], { x: 60, y: 10 })
    const points = patch!.points as { x: number; y: number }[]
    expect(points[5]).toEqual({ x: 0.3, y: 0.1 })
    expect(points[6]).toEqual({ x: 2 / 3, y: 1 / 3 })
  })

  it('여러 점을 골라 두면 끈 거리만큼 나머지도 함께 움직인다', () => {
    const warp = createWarp('mesh')
    if (warp.type !== 'mesh') throw new Error('mesh')
    const before = warp.params.points.map((p) => ({ ...p }))

    // 5번 점을 오른쪽으로 0.1(=20px), 아래로 0.2(=20px) 옮긴다
    const target = { x: (before[5].x + 0.1) * size.width, y: (before[5].y + 0.2) * size.height }
    const patch = dragWarpHandles(warp, size, 'mesh-5', ['mesh-5', 'mesh-6', 'mesh-9'], target)
    const points = patch!.points as { x: number; y: number }[]

    for (const index of [5, 6, 9]) {
      expect(points[index].x).toBeCloseTo(before[index].x + 0.1, 6)
      expect(points[index].y).toBeCloseTo(before[index].y + 0.2, 6)
    }
    // 고르지 않은 점은 그대로다
    expect(points[0]).toEqual(before[0])
  })

  it('퍼스펙티브 모서리도 함께 움직인다', () => {
    const warp = createWarp('perspective')
    if (warp.type !== 'perspective') throw new Error('perspective')
    const before = warp.params.corners.map((p) => ({ ...p }))
    const target = { x: 0.2 * size.width, y: 0.1 * size.height }

    const patch = dragWarpHandles(warp, size, 'perspective-0', ['perspective-0', 'perspective-1'], target)
    const corners = patch!.corners as { x: number; y: number }[]
    expect(corners[0]).toEqual({ x: 0.2, y: 0.1 })
    expect(corners[1].x).toBeCloseTo(before[1].x + 0.2, 6)
    expect(corners[1].y).toBeCloseTo(before[1].y + 0.1, 6)
  })

  it('여러 점을 묶을 수 없는 효과는 기준 점만 움직인다', () => {
    const warp = createWarp('bulge')
    const patch = dragWarpHandles(warp, size, 'bulge-center', ['bulge-center', 'bulge-radius'], {
      x: 50,
      y: 25,
    })
    expect(patch).toEqual({ cx: 0.25, cy: 0.25 })
  })

  it('다룰 수 없는 핸들이면 아무것도 바꾸지 않는다', () => {
    const warp = createWarp('mesh')
    expect(dragWarpHandles(warp, size, 'mesh-99', ['mesh-99', 'mesh-1'], { x: 0, y: 0 })).toBeNull()
  })
})
