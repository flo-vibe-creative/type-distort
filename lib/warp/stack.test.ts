import { describe, expect, it } from 'vitest'
import { applyWarp, createWarp, type WarpState } from '@/lib/warp/registry'
import {
  activeEffectOf,
  applyStackToPoint,
  applyWarpStack,
  createWarpEffect,
  invertStackPoint,
  splitStack,
} from '@/lib/warp/stack'
import { activeWarpOf } from '@/lib/warp/stackHandles'

const ctx = { width: 200, height: 100 }

function arc(angle: number) {
  const effect = createWarpEffect('arc', `arc-${angle}`)
  if (effect.type !== 'arc') throw new Error('arc')
  effect.params.angle = angle
  return effect
}

function bulge(strength: number, id = 'bulge') {
  const effect = createWarpEffect('bulge', id)
  if (effect.type !== 'bulge') throw new Error('bulge')
  effect.params.strength = strength
  effect.params.radius = 1
  return effect
}

describe('applyWarpStack', () => {
  it('효과가 없으면 원래 자리 그대로다', () => {
    expect(applyWarpStack([], 0.25, 0.5, ctx)).toEqual({ x: 50, y: 50 })
  })

  it('효과 하나면 그 효과만 쓴 것과 같다', () => {
    const effect = arc(90)
    const single = applyWarp(effect as WarpState, 0.1, 0.3, ctx)
    const stacked = applyWarpStack([effect], 0.1, 0.3, ctx)
    expect(stacked.x).toBeCloseTo(single.x, 9)
    expect(stacked.y).toBeCloseTo(single.y, 9)
  })

  it('앞 효과의 결과가 다음 효과의 입력이 된다', () => {
    const first = arc(90)
    const second = bulge(0.5)
    const middle = applyWarp(first as WarpState, 0.2, 0.2, ctx)
    const expected = applyWarp(second as WarpState, middle.x / ctx.width, middle.y / ctx.height, ctx)
    const actual = applyWarpStack([first, second], 0.2, 0.2, ctx)
    expect(actual.x).toBeCloseTo(expected.x, 9)
    expect(actual.y).toBeCloseTo(expected.y, 9)
  })

  it('순서를 바꾸면 결과가 달라진다', () => {
    const a = applyWarpStack([arc(90), bulge(0.5)], 0.2, 0.2, ctx)
    const b = applyWarpStack([bulge(0.5), arc(90)], 0.2, 0.2, ctx)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.5)
  })

  it('꺼 둔 효과는 건너뛴다', () => {
    const off = { ...arc(90), enabled: false }
    expect(applyWarpStack([off], 0.3, 0.3, ctx)).toEqual({ x: 60, y: 30 })
  })

  it('같은 효과를 두 번 쌓을 수 있다', () => {
    const once = applyWarpStack([bulge(0.3, 'a')], 0.6, 0.5, ctx)
    const twice = applyWarpStack([bulge(0.3, 'a'), bulge(0.3, 'b')], 0.6, 0.5, ctx)
    expect(twice.x).toBeGreaterThan(once.x)
  })
})

describe('invertStackPoint', () => {
  it('효과를 거친 자리에서 원래 자리를 되찾는다', () => {
    const stack = [arc(120), bulge(0.4)]
    for (const source of [
      { x: 30, y: 20 },
      { x: 100, y: 50 },
      { x: 170, y: 80 },
    ]) {
      const mapped = applyStackToPoint(stack, source, ctx)
      const found = invertStackPoint(stack, mapped, ctx)
      const back = applyStackToPoint(stack, found, ctx)
      expect(Math.hypot(back.x - mapped.x, back.y - mapped.y)).toBeLessThan(0.05)
    }
  })

  it('효과가 없으면 그대로 돌려준다', () => {
    expect(invertStackPoint([], { x: 3, y: 4 }, ctx)).toEqual({ x: 3, y: 4 })
  })
})

describe('효과 목록 다루기', () => {
  it('효과 하나를 기준으로 앞뒤를 나눈다', () => {
    const stack = [arc(10), bulge(0.1, 'b'), createWarpEffect('mesh', 'm')]
    const split = splitStack(stack, 'b')!
    expect(split.before.map((w) => w.id)).toEqual(['arc-10'])
    expect(split.effect.id).toBe('b')
    expect(split.after.map((w) => w.id)).toEqual(['m'])
    expect(splitStack(stack, 'nope')).toBeNull()
  })

  it('펼친 효과가 목록에 없으면 첫 효과를 쓴다', () => {
    const stack = [arc(10), bulge(0.1, 'b')]
    expect(activeEffectOf(stack, 'b')!.id).toBe('b')
    expect(activeEffectOf(stack, 'other')!.id).toBe('arc-10')
    expect(activeEffectOf([], null)).toBeNull()
  })
})

describe('activeWarpOf', () => {
  it('조작점은 뒤 효과를 거친 자리에 놓인다', () => {
    const later = bulge(0.6, 'later')
    const active = activeWarpOf([createWarpEffect('perspective', 'p'), later], 'p', ctx)!
    const corner = active.handles.find((h) => h.id === 'perspective-1')!
    expect(corner.local).toEqual({ x: 200, y: 0 })
    const expected = applyStackToPoint([later], corner.local, ctx)
    expect(corner.display).toEqual(expected)
  })

  it('마지막 효과의 조작점은 옮기지 않는다', () => {
    const active = activeWarpOf([bulge(0.6, 'first'), createWarpEffect('mesh', 'm')], 'm', ctx)!
    for (const handle of active.handles) expect(handle.display).toEqual(handle.local)
  })

  it('꺼 둔 효과는 조작점을 보이지 않는다', () => {
    const off = { ...createWarpEffect('mesh', 'm'), enabled: false }
    expect(activeWarpOf([off], 'm', ctx)).toBeNull()
  })

  it('createWarp로 만든 값과 같은 기본값을 가진다', () => {
    const effect = createWarpEffect('bulge', 'x')
    expect(effect.params).toEqual(createWarp('bulge').params)
    expect(effect.enabled).toBe(true)
  })
})
