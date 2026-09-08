import { describe, expect, it } from 'vitest'
import { describeAspectRatio } from '@/lib/format/ratio'

describe('describeAspectRatio', () => {
  it('간단히 떨어지는 비율은 정수로 적는다', () => {
    expect(describeAspectRatio(1200, 800)).toBe('3 : 2')
    expect(describeAspectRatio(1080, 1080)).toBe('1 : 1')
    expect(describeAspectRatio(1920, 1080)).toBe('16 : 9')
    expect(describeAspectRatio(1080, 1350)).toBe('4 : 5')
  })

  it('정수로 떨어지지 않으면 소수로 적는다', () => {
    expect(describeAspectRatio(1237, 763)).toBe('1.62 : 1')
    expect(describeAspectRatio(763, 1237)).toBe('1 : 1.62')
  })

  it('세로가 더 길면 1을 앞에 둔다', () => {
    expect(describeAspectRatio(100, 317)).toBe('1 : 3.17')
  })

  it('크기를 알 수 없으면 빈 문자열이다', () => {
    expect(describeAspectRatio(0, 100)).toBe('')
    expect(describeAspectRatio(100, -1)).toBe('')
  })
})
