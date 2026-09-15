import { applyWarp, createWarp, type WarpState } from '@/lib/warp/registry'
import type { Point, WarpContext, WarpType } from '@/lib/warp/types'

/** 레이어에 쌓인 왜곡 효과 하나 */
export type WarpEffect = WarpState & {
  id: string
  /** 꺼 두면 목록에는 남지만 결과에 반영되지 않는다 */
  enabled: boolean
}

/** 차례로 적용할 효과들. enabled가 없으면 켜진 것으로 본다. */
export type WarpStack = readonly (WarpState & { enabled?: boolean })[]

let sequence = 0

export function nextWarpEffectId(): string {
  sequence += 1
  return `fx-${Date.now().toString(36)}-${sequence}`
}

export function createWarpEffect(type: WarpType, id: string = nextWarpEffectId()): WarpEffect {
  return { ...createWarp(type), id, enabled: true }
}

/** 픽셀 좌표 한 점을 효과 하나에 통과시킨다 */
function warpPixel(warp: WarpState, point: Point, ctx: WarpContext): Point {
  return applyWarp(warp, point.x / ctx.width, point.y / ctx.height, ctx)
}

/**
 * 픽셀 좌표 한 점을 켜진 효과들에 위에서부터 차례로 통과시킨다.
 * 앞 효과가 옮긴 자리가 다음 효과의 입력이 된다.
 */
export function applyStackToPoint(stack: WarpStack, point: Point, ctx: WarpContext): Point {
  if (ctx.width <= 0 || ctx.height <= 0) return point
  let current = point
  for (const warp of stack) {
    if (warp.enabled === false) continue
    current = warpPixel(warp, current, ctx)
  }
  return current
}

/** 정규화 좌표(u, v)를 효과 목록 전체에 통과시킨다. 효과가 없으면 원래 자리 그대로. */
export function applyWarpStack(stack: WarpStack, u: number, v: number, ctx: WarpContext): Point {
  return applyStackToPoint(stack, { x: u * ctx.width, y: v * ctx.height }, ctx)
}

/** 역계산을 멈추는 오차 (px) */
const INVERT_TOLERANCE = 0.01
const INVERT_ITERATIONS = 40
/** 기울기를 어림할 때 옮겨 보는 거리 (px) */
const JACOBIAN_STEP = 0.1

/**
 * 효과 목록을 거친 결과가 target이 되는 원래 자리를 찾는다.
 *
 * 왜곡은 대부분 식을 거꾸로 풀 수 없어서, 조금씩 옮겨 보며 기울기를 어림하고
 * 그 방향으로 다가가는 뉴턴법을 쓴다. 끄는 동안에는 직전 답을 시작점으로 넘기면 금방 수렴한다.
 */
export function invertStackPoint(
  stack: WarpStack,
  target: Point,
  ctx: WarpContext,
  guess: Point = target
): Point {
  if (!stack.some((warp) => warp.enabled !== false)) return target
  if (ctx.width <= 0 || ctx.height <= 0) return target

  const residualAt = (point: Point) => {
    const mapped = applyStackToPoint(stack, point, ctx)
    return { x: mapped.x - target.x, y: mapped.y - target.y }
  }

  let point = { ...guess }
  let residual = residualAt(point)
  let error = Math.hypot(residual.x, residual.y)
  if (!Number.isFinite(error)) {
    point = { ...target }
    residual = residualAt(point)
    error = Math.hypot(residual.x, residual.y)
  }

  for (let iteration = 0; iteration < INVERT_ITERATIONS && error > INVERT_TOLERANCE; iteration += 1) {
    const base = applyStackToPoint(stack, point, ctx)
    const stepX = applyStackToPoint(stack, { x: point.x + JACOBIAN_STEP, y: point.y }, ctx)
    const stepY = applyStackToPoint(stack, { x: point.x, y: point.y + JACOBIAN_STEP }, ctx)
    const a = (stepX.x - base.x) / JACOBIAN_STEP
    const b = (stepY.x - base.x) / JACOBIAN_STEP
    const c = (stepX.y - base.y) / JACOBIAN_STEP
    const d = (stepY.y - base.y) / JACOBIAN_STEP
    const determinant = a * d - b * c
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) break

    const deltaX = (d * residual.x - b * residual.y) / determinant
    const deltaY = (-c * residual.x + a * residual.y) / determinant

    // 한 번에 너무 멀리 뛰어 더 나빠지면 보폭을 줄여 다시 해 본다
    let scale = 1
    let improved = false
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = { x: point.x - deltaX * scale, y: point.y - deltaY * scale }
      const candidateResidual = residualAt(candidate)
      const candidateError = Math.hypot(candidateResidual.x, candidateResidual.y)
      if (Number.isFinite(candidateError) && candidateError < error) {
        point = candidate
        residual = candidateResidual
        error = candidateError
        improved = true
        break
      }
      scale /= 2
    }
    if (!improved) break
  }

  return point
}

/** 효과 하나를 기준으로 목록을 앞·뒤로 나눈다 */
export function splitStack<T extends WarpState & { id: string }>(
  stack: readonly T[],
  effectId: string
): { effect: T; before: T[]; after: T[] } | null {
  const index = stack.findIndex((warp) => warp.id === effectId)
  if (index < 0) return null
  return {
    effect: stack[index],
    before: stack.slice(0, index),
    after: stack.slice(index + 1),
  }
}

/**
 * 조작점을 보여줄 효과. 고른 효과가 목록에 없으면(다른 레이어로 옮겼거나 지웠다면) 첫 효과를 쓴다.
 */
export function activeEffectOf<T extends { id: string }>(
  stack: readonly T[],
  activeId: string | null
): T | null {
  return stack.find((warp) => warp.id === activeId) ?? stack[0] ?? null
}
