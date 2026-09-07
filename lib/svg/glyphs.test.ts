import { describe, expect, it } from 'vitest'
import { groupIntoGlyphs, splitSubpaths } from '@/lib/svg/glyphs'
import { parsePathData } from '@/lib/svg/pathData'

describe('splitSubpaths', () => {
  it('M을 만날 때마다 새 덩어리로 나눈다', () => {
    const groups = splitSubpaths(parsePathData('M0 0L10 0L10 10Z M20 0L30 0L30 10Z'))
    expect(groups).toHaveLength(2)
    expect(groups[0].bounds).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
    expect(groups[1].bounds).toEqual({ minX: 20, minY: 0, maxX: 30, maxY: 10 })
  })

  it('닫기 명령까지 덩어리에 함께 담는다', () => {
    const groups = splitSubpaths(parsePathData('M0 0L10 0Z'))
    expect(groups[0].commands.at(-1)).toEqual({ type: 'Z' })
  })

  it('M보다 앞에 오는 명령은 버린다', () => {
    expect(splitSubpaths(parsePathData('L5 5'))).toHaveLength(0)
  })

  it('빈 목록은 빈 결과다', () => {
    expect(splitSubpaths([])).toEqual([])
  })
})

describe('groupIntoGlyphs', () => {
  const boundsOf = (minX: number, maxX: number) => ({
    commands: [],
    bounds: { minX, minY: 0, maxX, maxY: 10 },
  })

  it('가로로 떨어진 덩어리는 각각 다른 글자로 본다', () => {
    expect(groupIntoGlyphs([boundsOf(0, 10), boundsOf(20, 30), boundsOf(40, 50)])).toEqual([0, 1, 2])
  })

  it('겹치는 덩어리는 같은 글자로 묶는다 (O의 구멍처럼)', () => {
    expect(groupIntoGlyphs([boundsOf(0, 30), boundsOf(8, 22)])).toEqual([0, 0])
  })

  it('순서가 뒤섞여 있어도 왼쪽부터 번호를 매긴다', () => {
    expect(groupIntoGlyphs([boundsOf(40, 50), boundsOf(0, 10), boundsOf(20, 30)])).toEqual([2, 0, 1])
  })

  it('딱 붙어 있기만 하고 겹치지 않으면 다른 글자로 본다', () => {
    expect(groupIntoGlyphs([boundsOf(0, 10), boundsOf(10, 20)])).toEqual([0, 1])
  })

  it('셋이 사슬처럼 이어져 겹치면 하나로 묶인다', () => {
    expect(groupIntoGlyphs([boundsOf(0, 15), boundsOf(10, 25), boundsOf(20, 35)])).toEqual([0, 0, 0])
  })

  it('빈 목록은 빈 결과다', () => {
    expect(groupIntoGlyphs([])).toEqual([])
  })
})
