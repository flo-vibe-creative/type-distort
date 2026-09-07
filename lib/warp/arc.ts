import type { WarpFn } from '@/lib/warp/types'

export interface ArcParams {
  /** 호가 벌어지는 각도(도). 0이면 왜곡 없음. 음수면 반대 방향으로 휜다. */
  angle: number
  /**
   * 호 위에 올라앉을 기준선의 높이. 0이면 글자 윗변, 1이면 아랫변, 0.5면 한가운데.
   * 아래로 내릴수록 글자가 곡선 위에 서 있는 형태가 되고, 위로 올릴수록 매달린 형태가 된다.
   */
  baseline: number
  /** 효과 세기. 0이면 원본, 1이면 완전 적용. */
  strength: number
}

export const ARC_DEFAULT: ArcParams = {
  angle: 0,
  baseline: 0.5,
  strength: 1,
}

/** 각도가 이보다 작으면 반지름이 무한대로 발산하므로 원본을 그대로 쓴다. */
const MIN_ANGLE_DEG = 1e-4

/**
 * 글자를 원호 경로를 따라 휘게 한다.
 *
 * 기준선(v = baseline)이 반지름 R인 원호 위에 놓이고,
 * 거기서 위아래로 떨어진 만큼 반지름이 늘거나 줄어든다.
 */
export const warpArc: WarpFn<ArcParams> = (u, v, params, ctx) => {
  const baseX = u * ctx.width
  const baseY = v * ctx.height

  if (Math.abs(params.angle) < MIN_ANGLE_DEG || params.strength === 0) {
    return { x: baseX, y: baseY }
  }

  const sweep = (params.angle * Math.PI) / 180
  // 호의 길이가 원본 너비와 같아지는 반지름 — 글자가 늘어나지 않는다
  const radius = ctx.width / sweep
  const theta = (u - 0.5) * sweep
  // 기준선에서 위아래로 떨어진 만큼 반지름을 조절한다
  const r = radius + (params.baseline - v) * ctx.height

  const arcX = ctx.width / 2 + r * Math.sin(theta)
  const arcY = ctx.height * params.baseline + radius - r * Math.cos(theta)

  const t = params.strength
  return {
    x: baseX + (arcX - baseX) * t,
    y: baseY + (arcY - baseY) * t,
  }
}
