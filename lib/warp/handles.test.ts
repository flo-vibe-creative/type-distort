import { describe, expect, it } from 'vitest'
import { dragWarpHandle, warpHandles } from '@/lib/warp/handles'
import { createWarp } from '@/lib/warp/registry'
import { applyWarp } from '@/lib/warp/registry'

const size = { width: 200, height: 100 }

describe('아크 핸들', () => {
  it('양 끝에 핸들 두 개가 놓인다', () => {
    const handles = warpHandles(createWarp('arc'), size)
    expect(handles.map((h) => h.id)).toEqual(['arc-start', 'arc-end'])
  })

  it('핸들은 실제로 왜곡된 위치에 붙어 있다', () => {
    const warp = createWarp('arc')
    if (warp.type !== 'arc') throw new Error('arc')
    warp.params.angle = 120
    const handles = warpHandles(warp, size)
    const expected = applyWarp(warp, 1, 0.5, size)
    expect(handles[1].local.x).toBeCloseTo(expected.x, 6)
    expect(handles[1].local.y).toBeCloseTo(expected.y, 6)
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
