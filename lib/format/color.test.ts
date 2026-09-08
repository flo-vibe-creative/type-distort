import { describe, expect, it } from 'vitest'
import { normalizeHexColor } from '@/lib/format/color'

describe('normalizeHexColor', () => {
  it('여섯 자리 색을 소문자로 정리한다', () => {
    expect(normalizeHexColor('#FF7A00')).toBe('#ff7a00')
    expect(normalizeHexColor('ff7a00')).toBe('#ff7a00')
  })

  it('세 자리 줄임 표기를 펼친다', () => {
    expect(normalizeHexColor('#f70')).toBe('#ff7700')
    expect(normalizeHexColor('abc')).toBe('#aabbcc')
  })

  it('앞뒤 공백을 무시한다', () => {
    expect(normalizeHexColor('  #123456 ')).toBe('#123456')
  })

  it('색으로 읽을 수 없으면 null이다', () => {
    expect(normalizeHexColor('')).toBeNull()
    expect(normalizeHexColor('#12345')).toBeNull()
    expect(normalizeHexColor('빨강')).toBeNull()
    expect(normalizeHexColor('#gggggg')).toBeNull()
  })
})
