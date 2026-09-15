import { warpHandles, type WarpHandle } from '@/lib/warp/handles'
import { activeEffectOf, applyStackToPoint, splitStack, type WarpEffect } from '@/lib/warp/stack'
import type { Point, WarpContext } from '@/lib/warp/types'

/** 화면에 놓일 자리까지 구한 조작점 */
export interface PlacedWarpHandle extends WarpHandle {
  /** 뒤 효과들까지 거친, 실제로 보이는 자리 (레이어 좌표계) */
  display: Point
}

export interface ActiveWarp {
  effect: WarpEffect
  /** 이 효과 뒤에 적용되는 효과들 — 조작점과 안내선을 이만큼 더 옮겨 그린다 */
  after: WarpEffect[]
  /** 이 효과 기준 좌표를 화면에 보이는 자리로 옮긴다 */
  toDisplay: (point: Point) => Point
  handles: PlacedWarpHandle[]
}

/**
 * 조작 중인 효과와 그 조작점들을 구한다.
 *
 * 조작점은 그 효과가 옮긴 자리 기준으로 계산되므로, 뒤에 쌓인 효과를 한 번 더 거쳐야
 * 글자에 실제로 붙어 보인다. 꺼 둔 효과는 결과에 없으니 조작점도 보이지 않는다.
 */
export function activeWarpOf(
  warps: readonly WarpEffect[],
  activeId: string | null,
  size: WarpContext
): ActiveWarp | null {
  const effect = activeEffectOf(warps, activeId)
  if (!effect || !effect.enabled) return null
  const split = splitStack(warps, effect.id)
  if (!split) return null

  const after = split.after
  const toDisplay = (point: Point) => applyStackToPoint(after, point, size)
  const handles = warpHandles(effect, size).map((handle) => ({
    ...handle,
    display: toDisplay(handle.local),
  }))
  return { effect, after, toDisplay, handles }
}
