import { applyAffine, type Affine } from '@/lib/geometry/affine'

/**
 * SVG path 의 `d` 속성을 절대 좌표의 M / L / C / Z 네 가지로만 정규화한다.
 *
 * H·V는 L로, Q·T는 3차 곡선으로 올리고, S는 제어점을 반사해 펴고,
 * A(원호)는 3차 곡선 여러 개로 근사한다. 이후 단계는 이 네 가지만 다루면 된다.
 */

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' }

const COMMAND_LETTERS = 'MmLlHhVvCcSsQqTtAaZz'
const NUMBER_AT = /^[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/

/** 문자열을 앞에서부터 훑어가며 명령 글자·숫자·플래그를 꺼내는 커서 */
class PathScanner {
  private index = 0

  constructor(private readonly source: string) {}

  private skipSeparators(): void {
    while (this.index < this.source.length) {
      const ch = this.source[this.index]
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
        this.index += 1
      } else {
        break
      }
    }
  }

  atEnd(): boolean {
    this.skipSeparators()
    return this.index >= this.source.length
  }

  /** 다음이 명령 글자면 꺼내고, 아니면 null */
  readCommand(): string | null {
    this.skipSeparators()
    const ch = this.source[this.index]
    if (ch && COMMAND_LETTERS.includes(ch)) {
      this.index += 1
      return ch
    }
    return null
  }

  /** 다음이 숫자면 꺼내고, 아니면 null (커서는 움직이지 않는다) */
  readNumber(): number | null {
    this.skipSeparators()
    const match = NUMBER_AT.exec(this.source.slice(this.index))
    if (!match) return null
    this.index += match[0].length
    return Number.parseFloat(match[0])
  }

  /**
   * 원호 명령의 플래그는 값이 0 또는 1뿐이라 구분자 없이 붙여 쓸 수 있다.
   * (SVGO로 압축한 파일에서 "0 0 1" 대신 "001"로 나오는 경우)
   */
  readFlag(): number | null {
    this.skipSeparators()
    const ch = this.source[this.index]
    if (ch === '0' || ch === '1') {
      this.index += 1
      return ch === '0' ? 0 : 1
    }
    return null
  }

  /** 다음이 숫자로 시작하는지 (같은 명령이 반복되는지 판단용) */
  nextIsNumber(): boolean {
    this.skipSeparators()
    return NUMBER_AT.test(this.source.slice(this.index))
  }
}

interface ParseState {
  current: { x: number; y: number }
  subpathStart: { x: number; y: number }
  /** 직전 3차 곡선의 두 번째 제어점 (S 반사용) */
  lastCubicControl: { x: number; y: number } | null
  /** 직전 2차 곡선의 제어점 (T 반사용) */
  lastQuadraticControl: { x: number; y: number } | null
}

export function parsePathData(d: string): PathCommand[] {
  const scanner = new PathScanner(d ?? '')
  const commands: PathCommand[] = []
  const state: ParseState = {
    current: { x: 0, y: 0 },
    subpathStart: { x: 0, y: 0 },
    lastCubicControl: null,
    lastQuadraticControl: null,
  }

  let command = scanner.readCommand()
  while (command) {
    const relative = command === command.toLowerCase()
    const kind = command.toUpperCase()

    // 같은 명령이 인자만 반복되는 형태(M 0 0 1 1)를 위해 안쪽에서 돈다
    let first = true
    for (;;) {
      const consumed = readOne(kind, relative, scanner, state, commands, first)
      if (!consumed) {
        // 인자가 모자라면 그 뒤는 신뢰할 수 없으므로 지금까지만 살린다
        return commands
      }
      first = false
      if (kind === 'Z' || !scanner.nextIsNumber()) break
    }

    command = scanner.readCommand()
    if (!command && !scanner.atEnd()) break
  }

  return commands
}

function readOne(
  kind: string,
  relative: boolean,
  scanner: PathScanner,
  state: ParseState,
  out: PathCommand[],
  first: boolean
): boolean {
  const baseX = relative ? state.current.x : 0
  const baseY = relative ? state.current.y : 0

  switch (kind) {
    case 'M': {
      const x = scanner.readNumber()
      const y = scanner.readNumber()
      if (x === null || y === null) return false
      const px = x + baseX
      const py = y + baseY
      // 두 번째부터는 L로 이어지는 것이 SVG 규칙이다
      out.push(first ? { type: 'M', x: px, y: py } : { type: 'L', x: px, y: py })
      state.current = { x: px, y: py }
      if (first) state.subpathStart = { x: px, y: py }
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    case 'L': {
      const x = scanner.readNumber()
      const y = scanner.readNumber()
      if (x === null || y === null) return false
      const px = x + baseX
      const py = y + baseY
      out.push({ type: 'L', x: px, y: py })
      state.current = { x: px, y: py }
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    case 'H': {
      const x = scanner.readNumber()
      if (x === null) return false
      const px = x + baseX
      out.push({ type: 'L', x: px, y: state.current.y })
      state.current = { x: px, y: state.current.y }
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    case 'V': {
      const y = scanner.readNumber()
      if (y === null) return false
      const py = y + baseY
      out.push({ type: 'L', x: state.current.x, y: py })
      state.current = { x: state.current.x, y: py }
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    case 'C': {
      const values = readNumbers(scanner, 6)
      if (!values) return false
      const [x1, y1, x2, y2, x, y] = values
      return pushCubic(
        out,
        state,
        { x: x1 + baseX, y: y1 + baseY },
        { x: x2 + baseX, y: y2 + baseY },
        { x: x + baseX, y: y + baseY }
      )
    }
    case 'S': {
      const values = readNumbers(scanner, 4)
      if (!values) return false
      const [x2, y2, x, y] = values
      const control1 = reflect(state.current, state.lastCubicControl)
      return pushCubic(
        out,
        state,
        control1,
        { x: x2 + baseX, y: y2 + baseY },
        { x: x + baseX, y: y + baseY }
      )
    }
    case 'Q': {
      const values = readNumbers(scanner, 4)
      if (!values) return false
      const [cx, cy, x, y] = values
      return pushQuadratic(
        out,
        state,
        { x: cx + baseX, y: cy + baseY },
        { x: x + baseX, y: y + baseY }
      )
    }
    case 'T': {
      const values = readNumbers(scanner, 2)
      if (!values) return false
      const [x, y] = values
      const control = reflect(state.current, state.lastQuadraticControl)
      return pushQuadratic(out, state, control, { x: x + baseX, y: y + baseY })
    }
    case 'A': {
      const rx = scanner.readNumber()
      const ry = scanner.readNumber()
      const rotationDeg = scanner.readNumber()
      const largeArc = scanner.readFlag()
      const sweep = scanner.readFlag()
      const x = scanner.readNumber()
      const y = scanner.readNumber()
      if (
        rx === null ||
        ry === null ||
        rotationDeg === null ||
        largeArc === null ||
        sweep === null ||
        x === null ||
        y === null
      ) {
        return false
      }
      const end = { x: x + baseX, y: y + baseY }
      const cubics = arcToCubics(state.current, Math.abs(rx), Math.abs(ry), rotationDeg, largeArc, sweep, end)
      if (cubics.length === 0) {
        out.push({ type: 'L', x: end.x, y: end.y })
      } else {
        cubics.forEach((c) => out.push(c))
      }
      state.current = end
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    case 'Z': {
      out.push({ type: 'Z' })
      state.current = { ...state.subpathStart }
      state.lastCubicControl = null
      state.lastQuadraticControl = null
      return true
    }
    default:
      return false
  }
}

function readNumbers(scanner: PathScanner, count: number): number[] | null {
  const values: number[] = []
  for (let i = 0; i < count; i += 1) {
    const n = scanner.readNumber()
    if (n === null) return null
    values.push(n)
  }
  return values
}

function reflect(
  current: { x: number; y: number },
  control: { x: number; y: number } | null
): { x: number; y: number } {
  // 직전이 곡선이 아니면 반사할 제어점이 없으므로 현재 점을 그대로 쓴다
  if (!control) return { ...current }
  return { x: 2 * current.x - control.x, y: 2 * current.y - control.y }
}

function pushCubic(
  out: PathCommand[],
  state: ParseState,
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  end: { x: number; y: number }
): boolean {
  out.push({ type: 'C', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: end.x, y: end.y })
  state.current = { ...end }
  state.lastCubicControl = { ...c2 }
  state.lastQuadraticControl = null
  return true
}

function pushQuadratic(
  out: PathCommand[],
  state: ParseState,
  control: { x: number; y: number },
  end: { x: number; y: number }
): boolean {
  const start = state.current
  // 2차 → 3차 승격: 제어점을 양 끝에서 2/3 지점으로 옮긴다
  const c1 = { x: start.x + (2 / 3) * (control.x - start.x), y: start.y + (2 / 3) * (control.y - start.y) }
  const c2 = { x: end.x + (2 / 3) * (control.x - end.x), y: end.y + (2 / 3) * (control.y - end.y) }
  out.push({ type: 'C', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: end.x, y: end.y })
  state.current = { ...end }
  state.lastCubicControl = { ...c2 }
  state.lastQuadraticControl = { ...control }
  return true
}

/**
 * 원호를 90도 이하 조각으로 나눠 각각 3차 곡선으로 근사한다.
 * 반지름이 0이면 빈 배열을 돌려주고 호출 쪽에서 직선으로 처리한다.
 */
function arcToCubics(
  start: { x: number; y: number },
  rx: number,
  ry: number,
  rotationDeg: number,
  largeArc: number,
  sweep: number,
  end: { x: number; y: number }
): Extract<PathCommand, { type: 'C' }>[] {
  if (rx === 0 || ry === 0) return []
  if (start.x === end.x && start.y === end.y) return []

  const phi = (rotationDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  const dx = (start.x - end.x) / 2
  const dy = (start.y - end.y) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  // 두 점을 잇기에 반지름이 모자라면 딱 닿을 만큼 키운다 (SVG 규격)
  let radiusX = rx
  let radiusY = ry
  const lambda = (x1p * x1p) / (radiusX * radiusX) + (y1p * y1p) / (radiusY * radiusY)
  if (lambda > 1) {
    const scale = Math.sqrt(lambda)
    radiusX *= scale
    radiusY *= scale
  }

  const rxSq = radiusX * radiusX
  const rySq = radiusY * radiusY
  const numerator = rxSq * rySq - rxSq * y1p * y1p - rySq * x1p * x1p
  const denominator = rxSq * y1p * y1p + rySq * x1p * x1p
  const coefficient =
    (largeArc !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, numerator / denominator))

  const cxp = (coefficient * radiusX * y1p) / radiusY
  const cyp = (-coefficient * radiusY * x1p) / radiusX
  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2

  const startVector = { x: (x1p - cxp) / radiusX, y: (y1p - cyp) / radiusY }
  const endVector = { x: (-x1p - cxp) / radiusX, y: (-y1p - cyp) / radiusY }

  const theta1 = angleOf({ x: 1, y: 0 }, startVector)
  let deltaTheta = angleOf(startVector, endVector)
  if (sweep === 0 && deltaTheta > 0) deltaTheta -= 2 * Math.PI
  if (sweep === 1 && deltaTheta < 0) deltaTheta += 2 * Math.PI

  const segmentCount = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)))
  const step = deltaTheta / segmentCount
  const alpha = (Math.sin(step) * (Math.sqrt(4 + 3 * Math.tan(step / 2) ** 2) - 1)) / 3

  const pointAt = (t: number) => ({
    x: cx + radiusX * cosPhi * Math.cos(t) - radiusY * sinPhi * Math.sin(t),
    y: cy + radiusX * sinPhi * Math.cos(t) + radiusY * cosPhi * Math.sin(t),
  })
  const tangentAt = (t: number) => ({
    x: -radiusX * cosPhi * Math.sin(t) - radiusY * sinPhi * Math.cos(t),
    y: -radiusX * sinPhi * Math.sin(t) + radiusY * cosPhi * Math.cos(t),
  })

  const result: Extract<PathCommand, { type: 'C' }>[] = []
  for (let i = 0; i < segmentCount; i += 1) {
    const t1 = theta1 + i * step
    const t2 = t1 + step
    const p1 = pointAt(t1)
    const p2 = pointAt(t2)
    const d1 = tangentAt(t1)
    const d2 = tangentAt(t2)
    result.push({
      type: 'C',
      x1: p1.x + alpha * d1.x,
      y1: p1.y + alpha * d1.y,
      x2: p2.x - alpha * d2.x,
      y2: p2.y - alpha * d2.y,
      x: p2.x,
      y: p2.y,
    })
  }
  return result
}

function angleOf(u: { x: number; y: number }, v: { x: number; y: number }): number {
  const dot = u.x * v.x + u.y * v.y
  const lengths = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)
  const cosine = lengths === 0 ? 0 : Math.min(1, Math.max(-1, dot / lengths))
  const sign = u.x * v.y - u.y * v.x < 0 ? -1 : 1
  return sign * Math.acos(cosine)
}

/** 경로 명령의 모든 좌표(제어점 포함)에 아핀 변환을 적용한다 */
export function transformCommands(
  commands: readonly PathCommand[],
  transform: Affine
): PathCommand[] {
  return commands.map((command) => {
    switch (command.type) {
      case 'M':
      case 'L': {
        const p = applyAffine(transform, { x: command.x, y: command.y })
        return { type: command.type, x: p.x, y: p.y }
      }
      case 'C': {
        const c1 = applyAffine(transform, { x: command.x1, y: command.y1 })
        const c2 = applyAffine(transform, { x: command.x2, y: command.y2 })
        const end = applyAffine(transform, { x: command.x, y: command.y })
        return { type: 'C', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: end.x, y: end.y }
      }
      case 'Z':
        return command
    }
  })
}
