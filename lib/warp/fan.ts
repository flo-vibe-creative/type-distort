import type { WarpFn } from '@/lib/warp/types'

export interface FanParams {
  /** 기준점 가로 위치 (0~1). 이 자리가 좌우로 휘지 않는 가운데가 된다. */
  centerX: number
  /** 기준점 세로 위치 (0~1). 이 높이가 위아래로 휘지 않는 가운데가 된다. */
  centerY: number
  /** 윗선 휨. 양수면 양 끝이 위로 솟고, 음수면 기준점 쪽이 솟는다. */
  topBend: number
  /** 아랫선 휨. 양수면 양 끝이 아래로 내려가고, 음수면 기준점 쪽이 처진다. */
  bottomBend: number
  /** 좌우 퍼짐. 양수면 글자 윗부분이 바깥으로 벌어져 부채처럼 펼쳐진다. */
  spread: number
  /** 좌우 기울기. 전체를 좌우로 기울여 평행사변형으로 만든다. */
  skew: number
  /** 왼선 휨. 양수면 위아래 끝이 왼쪽으로 벌어지고, 음수면 기준점 쪽이 왼쪽으로 나온다. */
  leftBend: number
  /** 오른선 휨. 양수면 위아래 끝이 오른쪽으로 벌어진다. */
  rightBend: number
  /** 위아래 퍼짐. 양수면 글자 왼쪽이 위아래로 벌어진다. */
  spreadY: number
  /** 위아래 기울기. 전체를 위아래로 기울인다. */
  skewY: number
}

export const FAN_DEFAULT: FanParams = {
  centerX: 0.5,
  centerY: 0.5,
  topBend: 0,
  bottomBend: 0,
  spread: 0,
  skew: 0,
  leftBend: 0,
  rightBend: 0,
  spreadY: 0,
  skewY: 0,
}

/** 기준점이 가장자리에 바짝 붙어도 나눗셈이 터지지 않게 한다 */
const MIN_HALF = 0.05

/** 기준점에서는 0, 양 끝에서는 -1과 1 */
function fromCenter(at: number, center: number): number {
  const half = at < center ? Math.max(MIN_HALF, center) : Math.max(MIN_HALF, 1 - center)
  return (at - center) / half
}

/**
 * 윗선·아랫선을 휘는 가로 기준선과, 왼선·오른선을 휘는 세로 기준선으로 사다리꼴·부채꼴을 만든다.
 *
 * 기준점에서 멀수록 크게 휘므로, 마주 보는 두 선을 같은 방향으로 벌리면 기준점 쪽이 눌리고
 * 양 끝이 커진다. 퍼짐을 주면 기준선 반대편끼리 서로 반대 방향으로 밀려 부채처럼 펼쳐진다.
 *
 * 가로 기준선을 먼저 걸고 그 결과에 세로 기준선을 걸므로, 두 방향을 함께 써도 자연스럽게 이어진다.
 * 기준점은 어느 쪽으로 휘어도 제자리에 남는다.
 */
export const warpFan: WarpFn<FanParams> = (u, v, params, ctx) => {
  // 가로 기준선 — 윗선과 아랫선 사이를 세로로 채운다
  const acrossX = fromCenter(u, params.centerX)
  const bendX = acrossX * acrossX
  const top = -params.topBend * ctx.height * bendX
  const bottom = ctx.height + params.bottomBend * ctx.height * bendX

  const shiftX = (params.spread * acrossX + params.skew) * (params.centerY - v) * ctx.width
  const x = u * ctx.width + shiftX
  const y = top + v * (bottom - top)

  // 세로 기준선 — 휘어 놓은 결과를 왼선과 오른선 사이에 다시 채운다
  const acrossY = fromCenter(y / ctx.height, params.centerY)
  const bendY = acrossY * acrossY
  const left = -params.leftBend * ctx.width * bendY
  const right = ctx.width + params.rightBend * ctx.width * bendY

  const shiftY =
    (params.spreadY * acrossY + params.skewY) * (params.centerX - x / ctx.width) * ctx.height

  return {
    x: left + (x / ctx.width) * (right - left),
    y: y + shiftY,
  }
}
