import type { Point, WarpFn } from '@/lib/warp/types'

export interface AccordionParams {
  /** 가로로 몇 개의 판으로 나눌지 */
  panels: number
  /** 어긋남. 접히는 자리를 한 칸 걸러 위아래로 밀어 접힌 띠처럼 만든다. */
  offset: number
  /** 눌림. 접히는 자리의 높이를 한 칸 걸러 줄인다. */
  squeeze: number
  /**
   * 접히는 자리들. 판 수보다 하나 많아야 하며(양 끝 포함), 수가 맞지 않으면
   * 판 수에 맞춰 고르게 다시 놓는다. 각 점은 원본 크기 대비 0~1 위치다.
   */
  folds: Point[]
}

export const ACCORDION_DEFAULT: AccordionParams = {
  panels: 3,
  offset: 0,
  squeeze: 0,
  folds: [],
}

/** 접히는 자리마다 번갈아 +1, -1 */
function alternate(index: number): number {
  return index % 2 === 0 ? 1 : -1
}

/** 판 수는 최소 1개, 정수로 다룬다 */
export function accordionPanels(params: AccordionParams): number {
  return Math.max(1, Math.round(params.panels))
}

/**
 * 접히는 자리들의 실제 위치 (0~1).
 *
 * 끌어 옮긴 자리가 있으면 그대로 쓰고, 판 수가 바뀌어 수가 맞지 않으면 고르게 다시 놓는다.
 * 어긋남은 끌어 둔 자리 위에 더해지므로, 슬라이더를 움직여도 옮겨 둔 자리가 지워지지 않는다.
 */
export function accordionFolds(params: AccordionParams): Point[] {
  const panels = accordionPanels(params)
  const count = panels + 1
  const custom = params.folds.length === count ? params.folds : null

  return Array.from({ length: count }, (_, index) => {
    const base = custom ? custom[index] : { x: index / panels, y: 0.5 }
    return { x: base.x, y: base.y + (params.offset * (alternate(index) - 1)) / 2 }
  })
}

/** 접히는 자리마다 걸리는 높이 배율 */
function heightAt(params: AccordionParams, index: number): number {
  return 1 + (params.squeeze * (alternate(index) - 1)) / 2
}

/** u가 어느 판에 들어가는지 (양 끝 바깥은 가장 가까운 판을 그대로 늘려 쓴다) */
function panelAt(folds: readonly Point[], u: number): { index: number; ratio: number } {
  const last = folds.length - 2
  let index = 0
  while (index < last && u > folds[index + 1].x) index += 1

  const from = folds[index].x
  const span = folds[index + 1].x - from
  return { index, ratio: span === 0 ? 0 : (u - from) / span }
}

/**
 * 글자를 세로로 잘라 판을 만들고, 접히는 자리를 밀어 접힌 띠처럼 만든다.
 *
 * 접히는 자리는 판 수보다 하나 많게(양 끝 포함) 놓이고, 하나하나 끌어 옮길 수 있다.
 * 자른 자리에서 끊기지 않도록 판 안에서는 값이 고르게 이어지므로, 각 판은 위아래가
 * 엇갈리게 기운 띠가 된다. 눌림을 주면 판마다 높이까지 달라져 접힌 느낌이 커진다.
 */
export const warpAccordion: WarpFn<AccordionParams> = (u, v, params, ctx) => {
  const folds = accordionFolds(params)
  const { index, ratio } = panelAt(folds, u)

  const center = folds[index].y + (folds[index + 1].y - folds[index].y) * ratio
  const from = heightAt(params, index)
  const height = from + (heightAt(params, index + 1) - from) * ratio

  return {
    x: u * ctx.width,
    y: center * ctx.height + (v - 0.5) * ctx.height * height,
  }
}
