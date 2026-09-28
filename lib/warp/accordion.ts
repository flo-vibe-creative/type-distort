import type { WarpFn } from '@/lib/warp/types'

export interface AccordionParams {
  /** 가로로 몇 개의 판으로 나눌지 */
  panels: number
  /** 어긋남. 판이 만나는 자리를 번갈아 위아래로 밀어 접힌 띠처럼 만든다. */
  offset: number
  /** 눌림. 판이 만나는 자리의 높이를 번갈아 키우고 줄인다. */
  squeeze: number
}

export const ACCORDION_DEFAULT: AccordionParams = {
  panels: 3,
  offset: 0,
  squeeze: 0,
}

/** 판이 만나는 자리마다 번갈아 +1, -1 */
function alternate(index: number): number {
  return index % 2 === 0 ? 1 : -1
}

/**
 * 글자를 세로로 잘라 판을 만들고, 판이 만나는 자리를 번갈아 밀어 접힌 띠처럼 만든다.
 *
 * 자른 자리에서 끊기지 않도록 판 안에서는 값이 고르게 이어지므로, 각 판은 위아래가
 * 엇갈리게 기운 띠가 된다. 눌림을 주면 판마다 높이까지 번갈아 달라져 접힌 느낌이 커진다.
 */
export const warpAccordion: WarpFn<AccordionParams> = (u, v, params, ctx) => {
  const panels = Math.max(1, Math.round(params.panels))
  const position = u * panels
  // 맨 오른쪽 끝(u = 1)도 마지막 판 안에 들어오게 한다
  const index = Math.min(panels - 1, Math.max(0, Math.floor(position)))
  const withinPanel = position - index

  const offsetAt = (edge: number) => (params.offset * ctx.height * alternate(edge)) / 2
  const heightAt = (edge: number) => 1 + (params.squeeze * alternate(edge)) / 2

  const center =
    ctx.height / 2 + offsetAt(index) + (offsetAt(index + 1) - offsetAt(index)) * withinPanel
  const height =
    heightAt(index) + (heightAt(index + 1) - heightAt(index)) * withinPanel

  return {
    x: u * ctx.width,
    y: center + (v - 0.5) * ctx.height * height,
  }
}
