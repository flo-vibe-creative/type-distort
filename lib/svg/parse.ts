import { IDENTITY_AFFINE, multiplyAffine, parseTransform, type Affine } from '@/lib/geometry/affine'
import { parsePathData, transformCommands, type PathCommand } from '@/lib/svg/pathData'

/** 왜곡 대상이 되는 도형 하나 (글자 한 덩어리 또는 그 일부) */
export interface VectorShape {
  /** 좌표계가 이미 정리된 절대 좌표 명령 목록 */
  commands: PathCommand[]
  fill: string
  fillRule: 'nonzero' | 'evenodd'
  opacity: number
}

export interface ParsedSvg {
  /** 원본 좌표계의 너비 (viewBox 기준) */
  width: number
  /** 원본 좌표계의 높이 */
  height: number
  shapes: VectorShape[]
}

export type SvgParseResult =
  | { ok: true; svg: ParsedSvg }
  | { ok: false; reason: string; hint: string }

const SHAPE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'])
/** 화면에 직접 그려지지 않는 정의용 요소들 */
const SKIP_TAGS = new Set(['defs', 'clippath', 'mask', 'symbol', 'marker', 'pattern', 'metadata', 'title', 'desc'])
const TEXT_TAGS = new Set(['text', 'tspan', 'textpath'])

/**
 * SVG 문자열을 왜곡할 수 있는 도형 목록으로 바꾼다.
 *
 * 실패하는 경우에는 "왜 안 되는지"와 "어떻게 하면 되는지"를 함께 돌려준다.
 */
export function parseSvg(source: string): SvgParseResult {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')

  if (document.getElementsByTagName('parsererror').length > 0) {
    return {
      ok: false,
      reason: 'SVG 파일이 손상되어 열 수 없습니다.',
      hint: '디자인 툴에서 파일을 다시 내보낸 뒤 가져와 주세요.',
    }
  }

  const root = document.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    return {
      ok: false,
      reason: 'SVG 파일이 아닙니다.',
      hint: 'SVG, PNG, JPEG 파일만 가져올 수 있습니다.',
    }
  }

  if (containsText(root)) {
    return {
      ok: false,
      reason: '글자가 윤곽선으로 변환되지 않은 SVG입니다. 폰트 정보가 파일에 없어 다른 폰트로 바뀌어 보일 수 있습니다.',
      hint: '일러스트레이터나 피그마에서 글자를 윤곽선으로 변환(Create Outlines)한 뒤 다시 저장해 주세요.',
    }
  }

  const size = readSize(root)
  if (!size) {
    return {
      ok: false,
      reason: 'SVG의 크기를 알 수 없습니다.',
      hint: '디자인 툴에서 내보낼 때 아트보드 크기(viewBox)가 포함되도록 저장해 주세요.',
    }
  }

  // viewBox의 시작점이 0이 아니면 원점으로 당겨 좌표계를 정리한다
  const rootTransform: Affine = { ...IDENTITY_AFFINE, e: -size.offsetX, f: -size.offsetY }

  const shapes: VectorShape[] = []
  collectShapes(root, rootTransform, { fill: '#000000', fillRule: 'nonzero', opacity: 1 }, shapes)

  if (shapes.length === 0) {
    return {
      ok: false,
      reason: '이 파일에는 그릴 수 있는 도형이 없습니다.',
      hint: '내용이 비어 있거나 이미지만 들어있는 SVG일 수 있습니다. 다른 파일로 시도해 주세요.',
    }
  }

  return { ok: true, svg: { width: size.width, height: size.height, shapes } }
}

function containsText(root: Element): boolean {
  for (const tag of TEXT_TAGS) {
    if (root.getElementsByTagName(tag).length > 0) return true
  }
  return false
}

interface SvgSize {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

function readSize(root: Element): SvgSize | null {
  const viewBox = root.getAttribute('viewBox')
  if (viewBox) {
    const values = viewBox
      .split(/[\s,]+/)
      .map((token) => Number.parseFloat(token))
      .filter((n) => Number.isFinite(n))
    if (values.length === 4 && values[2] > 0 && values[3] > 0) {
      return { offsetX: values[0], offsetY: values[1], width: values[2], height: values[3] }
    }
  }

  const width = parseLength(root.getAttribute('width'))
  const height = parseLength(root.getAttribute('height'))
  if (width && height) {
    return { offsetX: 0, offsetY: 0, width, height }
  }

  return null
}

/** "80", "80px" 처럼 단위가 붙은 길이를 숫자로 바꾼다. 퍼센트는 크기를 알 수 없으므로 무시한다. */
function parseLength(value: string | null): number | null {
  if (!value || value.trim().endsWith('%')) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

interface InheritedStyle {
  fill: string
  fillRule: 'nonzero' | 'evenodd'
  opacity: number
}

function collectShapes(
  element: Element,
  parentTransform: Affine,
  parentStyle: InheritedStyle,
  out: VectorShape[]
): void {
  for (const child of Array.from(element.children)) {
    const tag = child.tagName.toLowerCase()
    if (SKIP_TAGS.has(tag)) continue

    const style = resolveStyle(child, parentStyle)
    if (readProperty(child, 'display') === 'none') continue

    const transform = multiplyAffine(parentTransform, parseTransform(child.getAttribute('transform')))

    if (tag === 'g' || tag === 'svg' || tag === 'a') {
      collectShapes(child, transform, style, out)
      continue
    }

    if (!SHAPE_TAGS.has(tag)) continue

    // 선으로만 그린 도형은 면이 없어 왜곡 결과가 비어 보이므로 제외한다
    if (style.fill === 'none') continue

    const d = shapeToPathData(child, tag)
    if (!d) continue

    const commands = transformCommands(parsePathData(d), transform)
    if (commands.length === 0) continue

    out.push({ commands, fill: style.fill, fillRule: style.fillRule, opacity: style.opacity })
  }
}

/** style 속성이 presentation 속성보다 우선한다 */
function readProperty(element: Element, name: string): string | null {
  const style = element.getAttribute('style')
  if (style) {
    for (const declaration of style.split(';')) {
      const [key, value] = declaration.split(':')
      if (key && value && key.trim() === name) return value.trim()
    }
  }
  return element.getAttribute(name)
}

function resolveStyle(element: Element, parent: InheritedStyle): InheritedStyle {
  const fill = readProperty(element, 'fill')
  const fillRule = readProperty(element, 'fill-rule')
  const opacity = readProperty(element, 'opacity')
  const parsedOpacity = opacity === null ? null : Number.parseFloat(opacity)

  return {
    // currentColor는 참조할 색이 없으므로 물려받은 값을 그대로 쓴다
    fill: fill && fill !== 'currentColor' ? fill : parent.fill,
    fillRule: fillRule === 'evenodd' ? 'evenodd' : fillRule === 'nonzero' ? 'nonzero' : parent.fillRule,
    opacity:
      parsedOpacity !== null && Number.isFinite(parsedOpacity)
        ? parent.opacity * Math.min(1, Math.max(0, parsedOpacity))
        : parent.opacity,
  }
}

function number(element: Element, name: string, fallback = 0): number {
  const parsed = Number.parseFloat(element.getAttribute(name) ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

/** 기본 도형들을 path의 `d` 문자열로 통일한다 */
function shapeToPathData(element: Element, tag: string): string | null {
  switch (tag) {
    case 'path':
      return element.getAttribute('d')

    case 'rect': {
      const x = number(element, 'x')
      const y = number(element, 'y')
      const width = number(element, 'width')
      const height = number(element, 'height')
      if (width <= 0 || height <= 0) return null

      const rawRx = element.getAttribute('rx')
      const rawRy = element.getAttribute('ry')
      let rx = rawRx !== null ? number(element, 'rx') : rawRy !== null ? number(element, 'ry') : 0
      let ry = rawRy !== null ? number(element, 'ry') : rx
      rx = Math.min(Math.max(rx, 0), width / 2)
      ry = Math.min(Math.max(ry, 0), height / 2)

      if (rx === 0 || ry === 0) {
        return `M${x} ${y}L${x + width} ${y}L${x + width} ${y + height}L${x} ${y + height}Z`
      }
      return [
        `M${x + rx} ${y}`,
        `L${x + width - rx} ${y}`,
        `A${rx} ${ry} 0 0 1 ${x + width} ${y + ry}`,
        `L${x + width} ${y + height - ry}`,
        `A${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}`,
        `L${x + rx} ${y + height}`,
        `A${rx} ${ry} 0 0 1 ${x} ${y + height - ry}`,
        `L${x} ${y + ry}`,
        `A${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
        'Z',
      ].join('')
    }

    case 'circle': {
      const r = number(element, 'r')
      if (r <= 0) return null
      return ellipsePath(number(element, 'cx'), number(element, 'cy'), r, r)
    }

    case 'ellipse': {
      const rx = number(element, 'rx')
      const ry = number(element, 'ry')
      if (rx <= 0 || ry <= 0) return null
      return ellipsePath(number(element, 'cx'), number(element, 'cy'), rx, ry)
    }

    case 'line':
      return `M${number(element, 'x1')} ${number(element, 'y1')}L${number(element, 'x2')} ${number(element, 'y2')}`

    case 'polygon':
    case 'polyline': {
      const points = (element.getAttribute('points') ?? '')
        .split(/[\s,]+/)
        .map((token) => Number.parseFloat(token))
        .filter((n) => Number.isFinite(n))
      if (points.length < 4) return null

      let d = `M${points[0]} ${points[1]}`
      for (let i = 2; i + 1 < points.length; i += 2) {
        d += `L${points[i]} ${points[i + 1]}`
      }
      return tag === 'polygon' ? `${d}Z` : d
    }

    default:
      return null
  }
}

/** 타원을 반원 두 개로 그린다 */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M${cx + rx} ${cy}` +
    `A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}` +
    `A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}` +
    'Z'
  )
}
