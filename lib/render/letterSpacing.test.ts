import { describe, expect, it } from 'vitest'
import { applyLetterSpacing } from '@/lib/render/letterSpacing'
import { boundsOfCommands } from '@/lib/geometry/bbox'
import { parsePathData } from '@/lib/svg/pathData'
import type { VectorShape } from '@/lib/svg/parse'

function shape(d: string): VectorShape {
  return { commands: parsePathData(d), fill: '#000000', fillRule: 'nonzero', opacity: 1 }
}

// 10 너비 글자 세 개가 10씩 띄어 놓인 형태, 높이 20
const shapes = [shape('M0 0L10 0L10 20L0 20Z M20 0L30 0L30 20L20 20Z M40 0L50 0L50 20L40 20Z')]
const bounds = { minX: 0, minY: 0, maxX: 50, maxY: 20 }

describe('applyLetterSpacing', () => {
  it('자간이 0이면 원본을 그대로 돌려준다', () => {
    const result = applyLetterSpacing(shapes, bounds, 0)
    expect(result.shapes).toBe(shapes)
    expect(result.bounds).toBe(bounds)
    expect(result.glyphCount).toBe(3)
  })

  it('글자 수를 알려준다', () => {
    expect(applyLetterSpacing(shapes, bounds, 0.5).glyphCount).toBe(3)
  })

  it('자간을 벌리면 첫 글자는 그대로 두고 뒤 글자만 밀어낸다', () => {
    // 자간 0.5 × 높이 20 = 글자마다 10씩
    const result = applyLetterSpacing(shapes, bounds, 0.5)
    const groups = boundsOfCommands(result.shapes[0].commands)
    expect(groups!.minX).toBe(0)
    expect(groups!.maxX).toBe(70)
  })

  it('벌린 만큼 기준 영역도 넓어져 왜곡이 전체에 고르게 걸린다', () => {
    const result = applyLetterSpacing(shapes, bounds, 0.5)
    expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 70, maxY: 20 })
  })

  it('자간을 좁히면 글자가 서로 가까워진다', () => {
    const result = applyLetterSpacing(shapes, bounds, -0.25)
    expect(result.bounds.maxX).toBe(40)
  })

  it('너무 좁혀도 폭이 0 이하로 무너지지 않는다', () => {
    const result = applyLetterSpacing(shapes, bounds, -100)
    expect(result.bounds.maxX).toBeGreaterThan(result.bounds.minX)
  })

  it('색과 채우기 규칙은 그대로 유지된다', () => {
    const colored = [{ ...shapes[0], fill: '#ff0000', fillRule: 'evenodd' as const, opacity: 0.4 }]
    const result = applyLetterSpacing(colored, bounds, 0.5)
    expect(result.shapes[0]).toMatchObject({ fill: '#ff0000', fillRule: 'evenodd', opacity: 0.4 })
  })

  it('한 글자의 구멍은 글자와 함께 움직인다', () => {
    // 바깥선 안에 구멍이 든 글자 + 오른쪽에 떨어진 글자 하나
    const withHole = [shape('M0 0L20 0L20 20L0 20Z M5 5L15 5L15 15L5 15Z M30 0L40 0L40 20L30 20Z')]
    const result = applyLetterSpacing(withHole, { minX: 0, minY: 0, maxX: 40, maxY: 20 }, 1)
    const all = boundsOfCommands(result.shapes[0].commands)
    // 두 번째 글자만 20(=1×높이)만큼 밀린다
    expect(all!.maxX).toBe(60)
    expect(result.glyphCount).toBe(2)
  })

  it('여러 경로에 흩어진 글자도 왼쪽부터 차례로 센다', () => {
    const multi = [shape('M40 0L50 0L50 20L40 20Z'), shape('M0 0L10 0L10 20L0 20Z')]
    const result = applyLetterSpacing(multi, { minX: 0, minY: 0, maxX: 50, maxY: 20 }, 1)
    // 왼쪽 글자(두 번째 경로)는 제자리, 오른쪽 글자(첫 번째 경로)만 20 밀린다
    expect(boundsOfCommands(result.shapes[1].commands)!.minX).toBe(0)
    expect(boundsOfCommands(result.shapes[0].commands)!.minX).toBe(60)
  })

  it('그릴 것이 없으면 원본을 그대로 돌려준다', () => {
    const empty: VectorShape[] = []
    const result = applyLetterSpacing(empty, bounds, 1)
    expect(result.shapes).toBe(empty)
    expect(result.glyphCount).toBe(0)
  })
})
