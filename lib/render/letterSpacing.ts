import type { Bounds } from '@/lib/geometry/bbox'
import { groupIntoGlyphs, splitSubpaths, type CommandGroup } from '@/lib/svg/glyphs'
import { transformCommands } from '@/lib/svg/pathData'
import type { VectorShape } from '@/lib/svg/parse'
import { IDENTITY_AFFINE } from '@/lib/geometry/affine'

export interface SpacedVector {
  shapes: readonly VectorShape[]
  /** 자간을 반영해 넓어지거나 좁아진 기준 영역 */
  bounds: Bounds
  /** 나뉜 글자 수 — 제대로 나뉘었는지 사용자가 확인할 수 있게 알려준다 */
  glyphCount: number
}

/** 자간을 아무리 좁혀도 기준 영역이 무너지지 않도록 남겨두는 최소 폭 비율 */
const MIN_WIDTH_RATIO = 0.05

interface GlyphAnalysis {
  perShapeGroups: CommandGroup[][]
  glyphOf: number[]
  glyphCount: number
}

/**
 * 글자를 나누는 계산은 매 프레임 다시 할 필요가 없다.
 * 도형 목록은 가져온 뒤로 바뀌지 않으므로 그 목록을 열쇠로 결과를 재사용한다.
 */
const analysisCache = new WeakMap<object, GlyphAnalysis>()

function analyze(shapes: readonly VectorShape[]): GlyphAnalysis {
  const cached = analysisCache.get(shapes)
  if (cached) return cached

  const perShapeGroups = shapes.map((shape) => splitSubpaths(shape.commands))
  const glyphOf = groupIntoGlyphs(perShapeGroups.flat())
  const glyphCount = glyphOf.length === 0 ? 0 : Math.max(...glyphOf) + 1

  const analysis = { perShapeGroups, glyphOf, glyphCount }
  analysisCache.set(shapes, analysis)
  return analysis
}

/** 도형 목록이 글자 몇 개로 나뉘는지 */
export function glyphCountOf(shapes: readonly VectorShape[]): number {
  return analyze(shapes).glyphCount
}

/** 글자마다 오른쪽으로 밀려나는 거리 (px) */
function spacingOffset(bounds: Bounds, spacing: number, glyphCount: number): number {
  const height = bounds.maxY - bounds.minY
  if (spacing === 0 || glyphCount <= 1 || height <= 0) return 0
  // 마지막 글자가 첫 글자를 지나치지 않도록 좁히는 폭을 제한한다
  const width = bounds.maxX - bounds.minX
  const maxShrink = (width * (1 - MIN_WIDTH_RATIO)) / (glyphCount - 1)
  return Math.max(-maxShrink, spacing * height)
}

/** 자간을 반영한 기준 영역만 구한다 (도형은 건드리지 않아 가볍다) */
export function spacedBounds(
  shapes: readonly VectorShape[],
  bounds: Bounds,
  spacing: number
): Bounds {
  const { glyphCount } = analyze(shapes)
  const offset = spacingOffset(bounds, spacing, glyphCount)
  if (offset === 0) return bounds
  return { ...bounds, maxX: bounds.maxX + offset * (glyphCount - 1) }
}

/**
 * 글자 사이를 벌리거나 좁힌다.
 *
 * 가져온 SVG에는 글자 단위 정보가 없으므로 가로로 겹치는 덩어리를 한 글자로 보고,
 * 왼쪽에서 몇 번째 글자인지에 비례해 오른쪽으로 밀어낸다. 첫 글자는 제자리에 남는다.
 *
 * @param spacing 글자 높이에 대한 비율. 0이면 원본, 양수면 벌어지고 음수면 좁아진다.
 */
export function applyLetterSpacing(
  shapes: readonly VectorShape[],
  bounds: Bounds,
  spacing: number
): SpacedVector {
  const { perShapeGroups, glyphOf, glyphCount } = analyze(shapes)
  const offset = spacingOffset(bounds, spacing, glyphCount)

  if (offset === 0) {
    return { shapes, bounds, glyphCount }
  }

  let cursor = 0
  const spacedShapes = perShapeGroups.map((groups, shapeIndex) => {
    const commands = groups.flatMap((group) => {
      const glyphIndex = glyphOf[cursor]
      cursor += 1
      const shift = offset * glyphIndex
      if (shift === 0) return group.commands
      return transformCommands(group.commands, { ...IDENTITY_AFFINE, e: shift })
    })
    return { ...shapes[shapeIndex], commands }
  })

  return {
    shapes: spacedShapes,
    bounds: { ...bounds, maxX: bounds.maxX + offset * (glyphCount - 1) },
    glyphCount,
  }
}
