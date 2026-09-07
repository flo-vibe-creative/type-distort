/** 입력 칸에 보여줄 숫자 문자열 */
export function formatNumber(value: number, decimals: number): string {
  const rounded = value.toFixed(decimals)
  // -0.0 같은 표기는 어색하므로 0으로 맞춘다
  return Number.parseFloat(rounded) === 0 ? (0).toFixed(decimals) : rounded
}

export interface ParseOptions {
  min?: number
  max?: number
}

/**
 * 사용자가 친 값을 숫자로 읽는다.
 * 단위 표기(°, %)를 함께 쳐도 받아주고, 범위를 벗어나면 범위 안으로 당겨온다.
 *
 * @returns 숫자로 읽을 수 없으면 null
 */
export function parseNumberInput(text: string, { min, max }: ParseOptions): number | null {
  const cleaned = text.trim().replace(/[^0-9eE+\-.]/g, '')
  if (cleaned === '') return null

  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return null

  let result = parsed
  if (min !== undefined) result = Math.max(min, result)
  if (max !== undefined) result = Math.min(max, result)
  return result
}
