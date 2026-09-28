import type { WarpFn } from '@/lib/warp/types'

export interface FanParams {
  /** 기준점 가로 위치 (0~1). 이 자리가 휘지 않는 가운데가 된다. */
  centerX: number
  /** 기준점 세로 위치 (0~1). 퍼짐과 기울기가 이 높이를 축으로 갈린다. */
  centerY: number
  /** 윗선 휨. 양수면 양 끝이 위로 솟고, 음수면 가운데가 솟는다. */
  topBend: number
  /** 아랫선 휨. 양수면 양 끝이 아래로 내려가고, 음수면 가운데가 처진다. */
  bottomBend: number
  /** 퍼짐. 양수면 글자 윗부분이 바깥으로 벌어져 부채처럼 펼쳐진다. */
  spread: number
  /** 기울기. 전체를 한쪽으로 기울여 평행사변형으로 만든다. */
  skew: number
}

export const FAN_DEFAULT: FanParams = {
  centerX: 0.5,
  centerY: 0.5,
  topBend: 0,
  bottomBend: 0,
  spread: 0,
  skew: 0,
}

/** 기준점이 가장자리에 바짝 붙어도 나눗셈이 터지지 않게 한다 */
const MIN_HALF = 0.05

/**
 * 윗선과 아랫선을 따로 휘어 사다리꼴·부채꼴을 만든다.
 *
 * 기준점에서 멀수록 크게 휘므로(가장자리에서 가장 큼), 윗선과 아랫선을 같은 방향으로 벌리면
 * 기준점 쪽이 눌리고 양 끝이 커진다. 여기에 퍼짐을 주면 글자 윗부분이 바깥으로 기울어
 * 레퍼런스처럼 양옆으로 펼쳐지는 모양이 된다.
 *
 * 기준점은 어떻게 휘어도 제자리에 남는다. 글자는 위아래 두 선 사이를 채우도록 세로로
 * 늘어나고, 가로 위치는 기준점 높이를 축으로만 밀린다.
 */
export const warpFan: WarpFn<FanParams> = (u, v, params, ctx) => {
  // 기준점에서는 0, 좌우 끝에서는 -1과 1 — 가장자리로 갈수록 크게 휘게 한다
  const toLeft = Math.max(MIN_HALF, params.centerX)
  const toRight = Math.max(MIN_HALF, 1 - params.centerX)
  const fromCenter = (u - params.centerX) / (u < params.centerX ? toLeft : toRight)
  const bend = fromCenter * fromCenter

  const top = -params.topBend * ctx.height * bend
  const bottom = ctx.height + params.bottomBend * ctx.height * bend

  // 기준점보다 위쪽이면 양수라 바깥으로 밀린다
  const fromMiddle = params.centerY - v
  const shift = (params.spread * fromCenter + params.skew) * fromMiddle * ctx.width

  return {
    x: u * ctx.width + shift,
    y: top + v * (bottom - top),
  }
}
