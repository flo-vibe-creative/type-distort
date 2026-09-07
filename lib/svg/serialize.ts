import type { Subpath } from '@/lib/svg/flatten'

/** 파일 크기를 줄이기 위해 남길 소수점 자릿수 */
const DECIMALS = 3

function format(value: number): string {
  // toFixed 후 불필요한 0과 소수점을 떼어낸다 (0.500 → 0.5, 2.000 → 2)
  const fixed = value.toFixed(DECIMALS)
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed
}

/** 점열을 SVG path의 `d` 문자열로 되돌린다 */
export function serializeSubpaths(subpaths: readonly Subpath[]): string {
  const parts: string[] = []

  for (const subpath of subpaths) {
    if (subpath.points.length === 0) continue
    const [first, ...rest] = subpath.points
    let d = `M${format(first.x)} ${format(first.y)}`
    for (const point of rest) {
      d += `L${format(point.x)} ${format(point.y)}`
    }
    if (subpath.closed) d += 'Z'
    parts.push(d)
  }

  return parts.join('')
}
