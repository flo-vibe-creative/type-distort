import { applyHomography, homographyFromUnitSquare } from '@/lib/geometry/matrix'
import type { Point, WarpFn } from '@/lib/warp/types'

export interface PerspectiveParams {
  /** [좌상, 우상, 우하, 좌하] 순서의 네 모서리. 0~1 정규화 좌표. */
  corners: readonly Point[]
}

export const PERSPECTIVE_DEFAULT: PerspectiveParams = {
  corners: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
}

/**
 * 네 모서리를 잡아당겨 3D 원근을 만든다.
 * 모서리 위치로부터 사영 변환을 구해 모든 점에 적용한다.
 */
export const warpPerspective: WarpFn<PerspectiveParams> = (u, v, params, ctx) => {
  const pixelCorners = params.corners.map((c) => ({ x: c.x * ctx.width, y: c.y * ctx.height }))
  const homography = homographyFromUnitSquare(pixelCorners)
  return applyHomography(homography, u, v)
}
