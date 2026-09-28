import type { WarpFn } from '@/lib/warp/types'

export interface FanParams {
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
  topBend: 0,
  bottomBend: 0,
  spread: 0,
  skew: 0,
}

/**
 * 윗선과 아랫선을 따로 휘어 사다리꼴·부채꼴을 만든다.
 *
 * 가운데에서 멀수록 크게 휘므로(가장자리에서 가장 큼), 윗선과 아랫선을 같은 방향으로 벌리면
 * 가운데가 눌리고 양 끝이 커진다. 여기에 퍼짐을 주면 글자 윗부분이 바깥으로 기울어
 * 레퍼런스처럼 양옆으로 펼쳐지는 모양이 된다.
 *
 * 글자는 위아래 두 선 사이를 채우도록 세로로 늘어나고, 가로 위치는 그대로 남는다.
 */
export const warpFan: WarpFn<FanParams> = (u, v, params, ctx) => {
  // 가운데는 0, 양 끝은 1 — 가장자리로 갈수록 크게 휘게 한다
  const fromCenter = 2 * u - 1
  const bend = fromCenter * fromCenter

  const top = -params.topBend * ctx.height * bend
  const bottom = ctx.height + params.bottomBend * ctx.height * bend

  // 글자의 위아래 절반 중 어디에 있는지 — 위쪽은 양수라 바깥으로 밀린다
  const fromMiddle = 0.5 - v
  const shift = (params.spread * fromCenter + params.skew) * fromMiddle * ctx.width

  return {
    x: u * ctx.width + shift,
    y: top + v * (bottom - top),
  }
}
