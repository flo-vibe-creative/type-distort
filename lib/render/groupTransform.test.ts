import { describe, expect, it } from 'vitest'
import type { LayerTransform } from '@/lib/document/types'
import {
  groupCornerPoint,
  groupRotationDelta,
  groupScaleFactor,
  oppositeCorner,
  rotateLayersAbout,
  scaleLayersAbout,
} from '@/lib/render/groupTransform'
import { localToCanvas } from '@/lib/render/layerFrame'

const box = { minX: 100, minY: 100, maxX: 300, maxY: 200 }

describe('모서리', () => {
  it('네 모서리 위치를 돌려준다', () => {
    expect(groupCornerPoint(box, 'nw')).toEqual({ x: 100, y: 100 })
    expect(groupCornerPoint(box, 'se')).toEqual({ x: 300, y: 200 })
  })

  it('반대편 모서리를 안다', () => {
    expect(oppositeCorner('nw')).toBe('se')
    expect(oppositeCorner('ne')).toBe('sw')
  })
})

describe('groupScaleFactor', () => {
  it('제자리면 1배다', () => {
    expect(groupScaleFactor(box, 'se', { x: 300, y: 200 })).toBeCloseTo(1, 6)
  })

  it('대각선으로 두 배만큼 끌면 두 배다', () => {
    expect(groupScaleFactor(box, 'se', { x: 500, y: 300 })).toBeCloseTo(2, 6)
  })

  it('반쯤 안으로 끌면 절반이다', () => {
    expect(groupScaleFactor(box, 'nw', { x: 200, y: 150 })).toBeCloseTo(0.5, 6)
  })

  it('반대편 모서리를 넘어가도 0이나 음수가 되지 않는다', () => {
    expect(groupScaleFactor(box, 'se', { x: 0, y: 0 })).toBeGreaterThan(0)
  })
})

describe('scaleLayersAbout', () => {
  const starts: Record<string, LayerTransform> = {
    a: { x: 120, y: 110, scaleX: 1, scaleY: 1, rotation: 0 },
    b: { x: 200, y: 150, scaleX: 0.5, scaleY: 2, rotation: 35 },
  }
  const anchor = { x: 100, y: 100 }

  it('기준점에서 멀어진 만큼 위치를 늘리고 크기를 곱한다', () => {
    const next = scaleLayersAbout(starts, anchor, 2)
    expect(next.a).toEqual({ x: 140, y: 120, scaleX: 2, scaleY: 2, rotation: 0 })
  })

  it('회전된 레이어도 모양이 그대로 커진다 (모든 점이 기준점에서 같은 비율로 멀어진다)', () => {
    const next = scaleLayersAbout(starts, anchor, 1.5)
    for (const local of [
      { x: 0, y: 0 },
      { x: 40, y: 10 },
      { x: -20, y: 30 },
    ]) {
      const before = localToCanvas(starts.b, local)
      const after = localToCanvas(next.b, local)
      expect(after.x - anchor.x).toBeCloseTo((before.x - anchor.x) * 1.5, 6)
      expect(after.y - anchor.y).toBeCloseTo((before.y - anchor.y) * 1.5, 6)
    }
  })

  it('뒤집힌 레이어의 방향을 지킨다', () => {
    const next = scaleLayersAbout({ a: { ...starts.a, scaleX: -1 } }, anchor, 2)
    expect(next.a.scaleX).toBe(-2)
  })
})

describe('rotateLayersAbout', () => {
  const starts: Record<string, LayerTransform> = {
    a: { x: 200, y: 100, scaleX: 1, scaleY: 1, rotation: 0 },
    b: { x: 150, y: 180, scaleX: 1.2, scaleY: 0.8, rotation: 20 },
  }
  const center = { x: 100, y: 100 }

  it('중심을 축으로 위치를 돌리고 각도를 더한다', () => {
    const next = rotateLayersAbout(starts, center, 90)
    expect(next.a.x).toBeCloseTo(100, 6)
    expect(next.a.y).toBeCloseTo(200, 6)
    expect(next.a.rotation).toBeCloseTo(90, 6)
  })

  it('레이어의 모든 점이 중심을 축으로 같은 각도만큼 돈다', () => {
    const next = rotateLayersAbout(starts, center, 33)
    const rad = (33 * Math.PI) / 180
    for (const local of [
      { x: 0, y: 0 },
      { x: 50, y: 20 },
    ]) {
      const before = localToCanvas(starts.b, local)
      const after = localToCanvas(next.b, local)
      const dx = before.x - center.x
      const dy = before.y - center.y
      expect(after.x).toBeCloseTo(center.x + dx * Math.cos(rad) - dy * Math.sin(rad), 6)
      expect(after.y).toBeCloseTo(center.y + dx * Math.sin(rad) + dy * Math.cos(rad), 6)
    }
  })
})

describe('groupRotationDelta', () => {
  const center = { x: 0, y: 0 }

  it('포인터가 돈 각도를 돌려준다', () => {
    expect(groupRotationDelta(center, { x: 10, y: 0 }, { x: 0, y: 10 }, false)).toBeCloseTo(90, 6)
  })

  it('Shift를 누르면 15도 단위로 맞춘다', () => {
    const delta = groupRotationDelta(center, { x: 10, y: 0 }, { x: 10, y: 2 }, true)
    expect(Math.abs(delta % 15)).toBeCloseTo(0, 6)
  })
})

describe('groupRotationDelta — 경계 넘기', () => {
  it('포인터가 왼쪽 수평선(±180°)을 가로질러도 한 바퀴를 더 세지 않는다', () => {
    const center = { x: 0, y: 0 }
    // 179도 방향에서 -179도 방향으로 — 실제로는 2도만 돈 것
    const start = { x: Math.cos((179 * Math.PI) / 180), y: Math.sin((179 * Math.PI) / 180) }
    const end = { x: Math.cos((-179 * Math.PI) / 180), y: Math.sin((-179 * Math.PI) / 180) }
    expect(groupRotationDelta(center, start, end, false)).toBeCloseTo(2, 6)
    expect(groupRotationDelta(center, end, start, false)).toBeCloseTo(-2, 6)
  })
})

describe('rotateLayersAbout — 각도 정리', () => {
  it('여러 번 돌려 쌓인 각도를 한 바퀴 안으로 정리한다', () => {
    const next = rotateLayersAbout(
      { a: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: -337.5 } },
      { x: 0, y: 0 },
      -28
    )
    expect(next.a.rotation).toBeCloseTo(-5.5, 6)
  })
})
