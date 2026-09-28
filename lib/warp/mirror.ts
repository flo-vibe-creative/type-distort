import type { Point, WarpFn } from '@/lib/warp/types'

export interface MirrorParams {
  /** 기준선 시작점 가로 위치 (0~1) */
  ax: number
  /** 기준선 시작점 세로 위치 (0~1) */
  ay: number
  /** 기준선 끝점 가로 위치 (0~1) */
  bx: number
  /** 기준선 끝점 세로 위치 (0~1) */
  by: number
  /** 기준선에서 멀어지는 거리를 몇 배로 할지. 1이면 원래 거리. */
  stretch: number
  /**
   * 퍼짐. 1이면 고르게 늘어나고, 1보다 작으면 기준선 가까이 있던 부분까지 바깥으로 밀려
   * 길게 뻗은 줄기가 생긴다. 1보다 크면 반대로 기준선 쪽으로 모인다.
   */
  curve: number
  /** 기준선을 따라가며 늘이는 정도를 달리한다. 양수면 끝점 쪽이, 음수면 시작점 쪽이 더 늘어난다. */
  taper: number
  /** 기준선에서 접어, 반대쪽에 거울상을 하나 더 그린다 */
  reflect: boolean
  /** 그 거울상을 그릴 때만 켜지는 내부 값. 기준선 반대쪽으로 뒤집는다. */
  flip?: boolean
}

export const MIRROR_DEFAULT: MirrorParams = {
  ax: 0.1,
  ay: 0.5,
  bx: 0.9,
  by: 0.5,
  stretch: 1,
  curve: 1,
  taper: 0,
  reflect: true,
}

/** 늘이는 정도가 0 밑으로 내려가 뒤집히지는 않게 막는다 */
const MIN_SCALE = 0

/** 이미 그려진 결과를 기준선 너머로 그대로 비추는 값 (거울상 패스에서 쓴다) */
export function mirrorReflection(params: MirrorParams): MirrorParams {
  return { ...params, stretch: 1, curve: 1, taper: 0, reflect: false, flip: true }
}

/**
 * 기준선을 축으로 위아래(양옆)를 거울처럼 대칭으로 늘이거나 줄인다.
 *
 * 기준선 위의 점은 제자리에 남고, 선에서 떨어진 거리만 바뀐다. 양쪽에 똑같은 식이 걸리므로
 * 글자의 위쪽 절반은 위로, 아래쪽 절반은 아래로 같은 만큼 뻗어 거울처럼 마주 본다.
 * 퍼짐을 1보다 작게 하면 선 가까이 있던 부분까지 바깥으로 밀려 길게 뻗은 줄기가 된다.
 */
export const warpMirror: WarpFn<MirrorParams> = (u, v, params, ctx) => {
  const point = { x: u * ctx.width, y: v * ctx.height }
  const a: Point = { x: params.ax * ctx.width, y: params.ay * ctx.height }
  const b: Point = { x: params.bx * ctx.width, y: params.by * ctx.height }

  const axisX = b.x - a.x
  const axisY = b.y - a.y
  const length = Math.hypot(axisX, axisY)
  // 두 점이 겹치면 기준선을 그을 수 없으므로 아무것도 하지 않는다
  if (length < 1e-6) return point

  const ex = axisX / length
  const ey = axisY / length
  // 기준선에 직각인 방향
  const nx = -ey
  const ny = ex

  const relX = point.x - a.x
  const relY = point.y - a.y
  const along = relX * ex + relY * ey
  const distance = relX * nx + relY * ny

  // 시작점에서 끝점까지를 0~1로 본 위치 (바깥으로 나가면 0~1을 벗어난다)
  const t = along / length
  const scale = Math.max(MIN_SCALE, params.stretch * (1 + params.taper * (t - 0.5)))

  const magnitude = Math.abs(distance) / length
  const curved = params.curve === 1 ? magnitude : Math.pow(magnitude, params.curve)
  const side = params.flip ? -Math.sign(distance) : Math.sign(distance)
  const moved = side * length * scale * curved

  return {
    x: a.x + ex * along + nx * moved,
    y: a.y + ey * along + ny * moved,
  }
}
