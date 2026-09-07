import type { Point } from '@/lib/warp/types'

/**
 * 2D 아핀 변환.
 * x' = a·x + c·y + e
 * y' = b·x + d·y + f
 * (SVG matrix(a b c d e f)와 같은 순서)
 */
export interface Affine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY_AFFINE: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/** m1을 적용한 뒤 m2를 적용하는 것과 같은 하나의 변환을 만든다 (m2 ∘ m1) */
export function multiplyAffine(m2: Affine, m1: Affine): Affine {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  }
}

export function applyAffine(m: Affine, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  }
}

function translate(tx: number, ty: number): Affine {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty }
}

function rotation(deg: number): Affine {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
}

const TRANSFORM_PATTERN = /([a-zA-Z]+)\s*\(([^)]*)\)/g

/**
 * SVG transform 속성 문자열을 하나의 아핀 변환으로 합친다.
 * 지원: matrix, translate, scale, rotate, skewX, skewY. 그 외는 무시한다.
 */
export function parseTransform(value: string | null | undefined): Affine {
  if (!value) return IDENTITY_AFFINE

  let result = IDENTITY_AFFINE
  TRANSFORM_PATTERN.lastIndex = 0

  let match = TRANSFORM_PATTERN.exec(value)
  while (match !== null) {
    const name = match[1]
    const args = match[2]
      .split(/[\s,]+/)
      .map((token) => Number.parseFloat(token))
      .filter((n) => Number.isFinite(n))

    const step = transformStep(name, args)
    if (step) result = multiplyAffine(result, step)

    match = TRANSFORM_PATTERN.exec(value)
  }

  return result
}

function transformStep(name: string, args: number[]): Affine | null {
  switch (name) {
    case 'matrix':
      if (args.length < 6) return null
      return { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] }
    case 'translate':
      if (args.length < 1) return null
      return translate(args[0], args[1] ?? 0)
    case 'scale': {
      if (args.length < 1) return null
      const sx = args[0]
      const sy = args[1] ?? sx
      return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }
    }
    case 'rotate': {
      if (args.length < 1) return null
      if (args.length >= 3) {
        // 중심점을 원점으로 옮겼다가 돌리고 되돌린다
        const toOrigin = translate(-args[1], -args[2])
        const back = translate(args[1], args[2])
        return multiplyAffine(back, multiplyAffine(rotation(args[0]), toOrigin))
      }
      return rotation(args[0])
    }
    case 'skewX':
      if (args.length < 1) return null
      return { a: 1, b: 0, c: Math.tan((args[0] * Math.PI) / 180), d: 1, e: 0, f: 0 }
    case 'skewY':
      if (args.length < 1) return null
      return { a: 1, b: Math.tan((args[0] * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 }
    default:
      return null
  }
}
