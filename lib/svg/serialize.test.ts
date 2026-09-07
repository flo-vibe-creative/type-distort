import { describe, expect, it } from 'vitest'
import { flattenPath } from '@/lib/svg/flatten'
import { parsePathData } from '@/lib/svg/pathData'
import { serializeSubpaths } from '@/lib/svg/serialize'

describe('serializeSubpaths', () => {
  it('열린 경로를 M/L로 적는다', () => {
    const d = serializeSubpaths([
      { points: [{ x: 0, y: 0 }, { x: 10, y: 5 }], closed: false },
    ])
    expect(d).toBe('M0 0L10 5')
  })

  it('닫힌 경로는 Z로 끝난다', () => {
    const d = serializeSubpaths([
      { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], closed: true },
    ])
    expect(d).toBe('M0 0L10 0L10 10Z')
  })

  it('하위 경로 여러 개를 이어 붙인다', () => {
    const d = serializeSubpaths([
      { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], closed: true },
      { points: [{ x: 2, y: 2 }, { x: 3, y: 2 }], closed: true },
    ])
    expect(d).toBe('M0 0L1 0ZM2 2L3 2Z')
  })

  it('소수점 자리를 정리해 파일 크기를 줄인다', () => {
    const d = serializeSubpaths([
      { points: [{ x: 0.123456789, y: 1 / 3 }, { x: 1, y: 2 }], closed: false },
    ])
    expect(d).toBe('M0.123 0.333L1 2')
  })

  it('빈 하위 경로는 건너뛴다', () => {
    expect(serializeSubpaths([{ points: [], closed: true }])).toBe('')
  })

  it('평탄화 → 문자열 왕복 후에도 형태가 유지된다', () => {
    const original = parsePathData('M 0 0 L 10 0 L 10 10 Z')
    const d = serializeSubpaths(flattenPath(original, 0.1))
    expect(flattenPath(parsePathData(d), 0.1)).toEqual(flattenPath(original, 0.1))
  })
})
