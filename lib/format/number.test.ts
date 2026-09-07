import { describe, expect, it } from 'vitest'
import { formatNumber, parseNumberInput } from '@/lib/format/number'

describe('formatNumber', () => {
  it('자릿수에 맞춰 반올림한다', () => {
    expect(formatNumber(1 / 3, 2)).toBe('0.33')
    expect(formatNumber(12.6, 0)).toBe('13')
  })

  it('-0이 되지 않게 한다', () => {
    expect(formatNumber(-0.001, 1)).toBe('0.0')
  })
})

describe('parseNumberInput', () => {
  it('숫자를 읽는다', () => {
    expect(parseNumberInput('42', {})).toBe(42)
    expect(parseNumberInput('-3.5', {})).toBe(-3.5)
  })

  it('앞뒤 공백과 단위 표기를 무시한다', () => {
    expect(parseNumberInput('  120 ', {})).toBe(120)
    expect(parseNumberInput('45°', {})).toBe(45)
    expect(parseNumberInput('60%', {})).toBe(60)
  })

  it('범위를 벗어나면 범위 안으로 당겨온다', () => {
    expect(parseNumberInput('500', { min: -360, max: 360 })).toBe(360)
    expect(parseNumberInput('-500', { min: -360, max: 360 })).toBe(-360)
  })

  it('숫자가 아니면 null이다', () => {
    expect(parseNumberInput('', {})).toBeNull()
    expect(parseNumberInput('abc', {})).toBeNull()
    expect(parseNumberInput('-', {})).toBeNull()
  })

  it('무한대나 NaN은 받지 않는다', () => {
    expect(parseNumberInput('Infinity', {})).toBeNull()
    expect(parseNumberInput('NaN', {})).toBeNull()
  })
})
