/** 정수 비율이 이보다 커지면 눈으로 읽기 어려워 소수로 적는다 */
const MAX_SIMPLE_RATIO = 64

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b)
}

/**
 * 가로세로 비율을 사람이 읽기 좋은 형태로 적는다.
 * `3 : 2`처럼 간단히 떨어지면 정수로, 아니면 `1.62 : 1`처럼 소수로 적는다.
 */
export function describeAspectRatio(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return ''
  if (width <= 0 || height <= 0) return ''

  const w = Math.round(width)
  const h = Math.round(height)
  const divisor = greatestCommonDivisor(w, h)
  const simpleW = w / divisor
  const simpleH = h / divisor

  if (simpleW <= MAX_SIMPLE_RATIO && simpleH <= MAX_SIMPLE_RATIO) {
    return `${simpleW} : ${simpleH}`
  }
  return w >= h ? `${(w / h).toFixed(2)} : 1` : `1 : ${(h / w).toFixed(2)}`
}
