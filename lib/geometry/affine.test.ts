import { describe, expect, it } from 'vitest'
import {
  IDENTITY_AFFINE,
  applyAffine,
  multiplyAffine,
  parseTransform,
} from '@/lib/geometry/affine'

describe('parseTransform', () => {
  it('빈 문자열은 항등 변환이다', () => {
    expect(parseTransform('')).toEqual(IDENTITY_AFFINE)
    expect(parseTransform(null)).toEqual(IDENTITY_AFFINE)
  })

  it('translate를 읽는다', () => {
    const p = applyAffine(parseTransform('translate(10, 20)'), { x: 1, y: 2 })
    expect(p).toEqual({ x: 11, y: 22 })
  })

  it('translate의 y가 생략되면 0으로 본다', () => {
    const p = applyAffine(parseTransform('translate(10)'), { x: 1, y: 2 })
    expect(p).toEqual({ x: 11, y: 2 })
  })

  it('scale의 값이 하나면 가로세로에 같이 적용한다', () => {
    const p = applyAffine(parseTransform('scale(3)'), { x: 1, y: 2 })
    expect(p).toEqual({ x: 3, y: 6 })
  })

  it('rotate 90도는 (1,0)을 (0,1)로 보낸다', () => {
    const p = applyAffine(parseTransform('rotate(90)'), { x: 1, y: 0 })
    expect(p.x).toBeCloseTo(0, 9)
    expect(p.y).toBeCloseTo(1, 9)
  })

  it('중심점을 준 rotate는 그 점을 고정한다', () => {
    const p = applyAffine(parseTransform('rotate(37, 5, 6)'), { x: 5, y: 6 })
    expect(p.x).toBeCloseTo(5, 9)
    expect(p.y).toBeCloseTo(6, 9)
  })

  it('matrix를 그대로 읽는다', () => {
    const p = applyAffine(parseTransform('matrix(1 0 0 1 7 8)'), { x: 0, y: 0 })
    expect(p).toEqual({ x: 7, y: 8 })
  })

  it('여러 변환은 왼쪽부터 차례로 적용된다', () => {
    // translate 후 scale — SVG 규칙상 scale이 먼저 점에 적용되고 그 다음 translate
    const p = applyAffine(parseTransform('translate(10 0) scale(2)'), { x: 1, y: 1 })
    expect(p).toEqual({ x: 12, y: 2 })
  })

  it('skewX는 y에 비례해 x를 민다', () => {
    const p = applyAffine(parseTransform('skewX(45)'), { x: 0, y: 2 })
    expect(p.x).toBeCloseTo(2, 9)
    expect(p.y).toBeCloseTo(2, 9)
  })

  it('알아볼 수 없는 값은 무시하고 나머지를 적용한다', () => {
    const p = applyAffine(parseTransform('nonsense(1) translate(5 5)'), { x: 0, y: 0 })
    expect(p).toEqual({ x: 5, y: 5 })
  })
})

describe('multiplyAffine', () => {
  it('항등 변환과 곱해도 그대로다', () => {
    const m = parseTransform('translate(3 4) scale(2)')
    expect(multiplyAffine(m, IDENTITY_AFFINE)).toEqual(m)
    expect(multiplyAffine(IDENTITY_AFFINE, m)).toEqual(m)
  })
})
