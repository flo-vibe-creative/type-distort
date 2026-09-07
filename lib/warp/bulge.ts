import type { WarpFn } from '@/lib/warp/types'

export interface BulgeParams {
  /** 중심점 가로 위치 (0~1) */
  cx: number
  /** 중심점 세로 위치 (0~1) */
  cy: number
  /** 영향 반경. 1이면 경계 상자의 대각선 절반까지 미친다. */
  radius: number
  /** 세기. 양수면 부풀고, 음수면 오목해진다. 0이면 왜곡 없음. */
  strength: number
  /** 파동 수. 0이면 순수 볼록, 1 이상이면 물결친다. */
  waves: number
}

export const BULGE_DEFAULT: BulgeParams = {
  cx: 0.5,
  cy: 0.5,
  radius: 0.6,
  strength: 0,
  waves: 0,
}

/**
 * 중심점을 기준으로 바깥으로 부풀리거나(볼록) 안으로 당기고(오목),
 * 파동 수를 올리면 중심에서 바깥으로 물결이 퍼진다.
 *
 * 영향 반경 밖은 건드리지 않으며, 경계에서 변형량이 0으로 수렴해 이음매가 보이지 않는다.
 */
export const warpBulge: WarpFn<BulgeParams> = (u, v, params, ctx) => {
  const baseX = u * ctx.width
  const baseY = v * ctx.height

  if (params.strength === 0 || params.radius <= 0) {
    return { x: baseX, y: baseY }
  }

  const centerX = params.cx * ctx.width
  const centerY = params.cy * ctx.height
  const dx = baseX - centerX
  const dy = baseY - centerY
  const distance = Math.hypot(dx, dy)
  if (distance === 0) {
    return { x: baseX, y: baseY }
  }

  const halfDiagonal = Math.hypot(ctx.width, ctx.height) / 2
  const maxRadius = params.radius * halfDiagonal
  const t = distance / maxRadius
  if (t >= 1) {
    return { x: baseX, y: baseY }
  }

  // waves가 0이면 cos(0) = 1 이라 순수 볼록이 되고, 값을 올릴수록 물결이 생긴다
  const ripple = Math.cos(params.waves * Math.PI * t)
  const falloff = 1 - t
  const scale = 1 + params.strength * ripple * falloff

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  }
}
