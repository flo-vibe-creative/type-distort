import { describe, expect, it } from 'vitest'
import type { LayerTransform } from '@/lib/document/types'
import {
  canvasToLocal,
  frameCorners,
  handleLocalPoint,
  localToCanvas,
  resizeTransform,
  rotateTransform,
} from '@/lib/render/layerFrame'

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 50 }
const base: LayerTransform = { x: 200, y: 100, scaleX: 1, scaleY: 1, rotation: 0 }

describe('좌표 변환', () => {
  it('레이어 좌표를 캔버스 좌표로 옮긴다', () => {
    expect(localToCanvas(base, { x: 10, y: 20 })).toEqual({ x: 210, y: 120 })
  })

  it('확대와 회전을 순서대로 적용한다', () => {
    const transform = { ...base, scaleX: 2, scaleY: 2, rotation: 90 }
    const p = localToCanvas(transform, { x: 10, y: 0 })
    expect(p.x).toBeCloseTo(200, 6)
    expect(p.y).toBeCloseTo(120, 6)
  })

  it('캔버스 좌표를 되돌리면 원래 레이어 좌표가 나온다', () => {
    const transform = { x: 30, y: -12, scaleX: 1.7, scaleY: 0.6, rotation: 37 }
    const original = { x: 42, y: -13 }
    const back = canvasToLocal(transform, localToCanvas(transform, original))
    expect(back.x).toBeCloseTo(original.x, 6)
    expect(back.y).toBeCloseTo(original.y, 6)
  })
})

describe('핸들 위치', () => {
  it('여덟 방향이 각각 모서리와 변 가운데를 가리킨다', () => {
    expect(handleLocalPoint(bounds, 'nw')).toEqual({ x: 0, y: 0 })
    expect(handleLocalPoint(bounds, 'se')).toEqual({ x: 100, y: 50 })
    expect(handleLocalPoint(bounds, 'n')).toEqual({ x: 50, y: 0 })
    expect(handleLocalPoint(bounds, 'w')).toEqual({ x: 0, y: 25 })
  })

  it('선택 상자는 네 모서리를 시계 방향으로 돌려준다', () => {
    const corners = frameCorners(base, bounds)
    expect(corners).toEqual([
      { x: 200, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 150 },
      { x: 200, y: 150 },
    ])
  })
})

describe('resizeTransform', () => {
  it('오른쪽 아래를 끌면 반대편 모서리가 제자리에 남는다', () => {
    const next = resizeTransform(base, bounds, 'se', { x: 400, y: 200 }, { preserveRatio: false })
    expect(next.scaleX).toBeCloseTo(2, 6)
    expect(next.scaleY).toBeCloseTo(2, 6)
    const anchor = localToCanvas(next, { x: 0, y: 0 })
    expect(anchor.x).toBeCloseTo(200, 6)
    expect(anchor.y).toBeCloseTo(100, 6)
  })

  it('끈 모서리가 포인터 위치에 정확히 붙는다', () => {
    const next = resizeTransform(base, bounds, 'se', { x: 360, y: 260 }, { preserveRatio: false })
    const dragged = localToCanvas(next, { x: 100, y: 50 })
    expect(dragged.x).toBeCloseTo(360, 6)
    expect(dragged.y).toBeCloseTo(260, 6)
  })

  it('왼쪽 위를 끌면 오른쪽 아래가 제자리에 남는다', () => {
    const next = resizeTransform(base, bounds, 'nw', { x: 100, y: 50 }, { preserveRatio: false })
    const anchor = localToCanvas(next, { x: 100, y: 50 })
    expect(anchor.x).toBeCloseTo(300, 6)
    expect(anchor.y).toBeCloseTo(150, 6)
  })

  it('변 핸들은 한 축만 바꾼다', () => {
    const next = resizeTransform(base, bounds, 'e', { x: 400, y: 300 }, { preserveRatio: false })
    expect(next.scaleX).toBeCloseTo(2, 6)
    expect(next.scaleY).toBeCloseTo(1, 6)
  })

  it('비율 유지를 켜면 가로세로가 같은 비율로 바뀐다', () => {
    const next = resizeTransform(base, bounds, 'se', { x: 400, y: 160 }, { preserveRatio: true })
    expect(Math.abs(next.scaleX)).toBeCloseTo(Math.abs(next.scaleY), 6)
  })

  it('회전된 레이어도 반대편 모서리를 고정한 채 늘어난다', () => {
    const rotated = { ...base, rotation: 30 }
    const anchorBefore = localToCanvas(rotated, { x: 0, y: 0 })
    const next = resizeTransform(rotated, bounds, 'se', { x: 420, y: 260 }, { preserveRatio: false })
    const anchorAfter = localToCanvas(next, { x: 0, y: 0 })
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 6)
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 6)
  })

  it('한 점으로 완전히 찌그러뜨려도 0이 되지 않는다', () => {
    const next = resizeTransform(base, bounds, 'se', { x: 200, y: 100 }, { preserveRatio: false })
    expect(Math.abs(next.scaleX)).toBeGreaterThan(0)
    expect(Math.abs(next.scaleY)).toBeGreaterThan(0)
  })
})

describe('rotateTransform', () => {
  const center = { x: 250, y: 125 }

  it('가운데를 축으로 돈다', () => {
    const next = rotateTransform(
      base,
      bounds,
      { x: center.x + 100, y: center.y },
      { x: center.x, y: center.y + 100 },
      false
    )
    expect(next.rotation).toBeCloseTo(90, 6)
    const centerAfter = localToCanvas(next, { x: 50, y: 25 })
    expect(centerAfter.x).toBeCloseTo(center.x, 6)
    expect(centerAfter.y).toBeCloseTo(center.y, 6)
  })

  it('Shift를 누르면 15도 단위로 맞춰진다', () => {
    const next = rotateTransform(
      base,
      bounds,
      { x: center.x + 100, y: center.y },
      { x: center.x + 100, y: center.y + 18 },
      true
    )
    expect(next.rotation % 15).toBeCloseTo(0, 6)
  })
})
