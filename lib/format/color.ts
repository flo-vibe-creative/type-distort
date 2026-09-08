/**
 * 사용자가 친 색 표기를 `#rrggbb` 형태로 정리한다.
 * `#` 없이 쳐도 되고, `#f70` 같은 세 자리 줄임 표기도 받는다.
 *
 * @returns 색으로 읽을 수 없으면 null
 */
export function normalizeHexColor(text: string): string | null {
  const cleaned = text.trim().replace(/^#/, '').toLowerCase()

  if (/^[0-9a-f]{3}$/.test(cleaned)) {
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`
  }
  if (/^[0-9a-f]{6}$/.test(cleaned)) {
    return `#${cleaned}`
  }
  return null
}
