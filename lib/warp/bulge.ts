import type { Point, WarpContext, WarpFn } from "@/lib/warp/types";

export interface BulgeParams {
  /** 영향 범위(점선 원)의 중심 가로 위치 (0~1) */
  cx: number;
  /** 영향 범위(점선 원)의 중심 세로 위치 (0~1) */
  cy: number;
  /** 영향 반경. 1이면 경계 상자의 대각선 절반까지 미친다. */
  radius: number;
  /** 세기. 양수면 부풀고, 음수면 오목해진다. 0이면 왜곡 없음. */
  strength: number;
  /** 파동 수. 0이면 순수 볼록, 1 이상이면 물결친다. */
  waves: number;
  /** 가장 크게 부푸는 지점이 원 중심에서 가로로 떨어진 거리 (너비 대비) */
  peakX: number;
  /** 가장 크게 부푸는 지점이 원 중심에서 세로로 떨어진 거리 (높이 대비) */
  peakY: number;
}

export const BULGE_DEFAULT: BulgeParams = {
  cx: 0.5,
  cy: 0.5,
  radius: 0.6,
  strength: 0,
  waves: 0,
  peakX: 0,
  peakY: 0,
};

/** 중앙점이 원 경계에 닿으면 한쪽이 찌그러지므로 이 비율 안쪽에 머물게 한다 */
export const MAX_PEAK_RATIO = 0.9;

export interface BulgeGeometry {
  /** 점선 원의 중심 (px) */
  center: Point;
  /** 점선 원의 반지름 (px) */
  radius: number;
  /** 가장 크게 부푸는 지점 (px) — 원 안쪽으로 제한된다 */
  peak: Point;
}

/** 파라미터를 화면 좌표의 원·중앙점으로 푼다 */
export function bulgeGeometry(
  params: BulgeParams,
  ctx: WarpContext,
): BulgeGeometry {
  const center = { x: params.cx * ctx.width, y: params.cy * ctx.height };
  const radius =
    Math.max(0, params.radius) * (Math.hypot(ctx.width, ctx.height) / 2);
  return {
    center,
    radius,
    peak: clampPeak(
      center,
      radius,
      params.peakX * ctx.width,
      params.peakY * ctx.height,
    ),
  };
}

/** 원 중심에서 (offsetX, offsetY)만큼 떨어진 중앙점을 원 안쪽으로 끌어들인다 */
export function clampPeak(
  center: Point,
  radius: number,
  offsetX: number,
  offsetY: number,
): Point {
  const limit = radius * MAX_PEAK_RATIO;
  const length = Math.hypot(offsetX, offsetY);
  const scale = length > limit ? (length === 0 ? 0 : limit / length) : 1;
  return { x: center.x + offsetX * scale, y: center.y + offsetY * scale };
}

/**
 * 중앙점을 기준으로 바깥으로 부풀리거나(볼록) 안으로 당기고(오목),
 * 파동 수를 올리면 중앙점에서 바깥으로 물결이 퍼진다.
 *
 * 영향 범위는 점선 원으로 고정되어, 원 밖은 건드리지 않고 원 경계에서 변형량이 0으로 수렴한다.
 * 중앙점을 원 중심에서 비껴 두면, 중앙점에서 뻗은 방향마다 원 경계까지의 거리가 달라지므로
 * 그 거리를 기준으로 변형 정도를 나눠 경계는 그대로 두고 가장 부푸는 곳만 옮겨 간다.
 */
export const warpBulge: WarpFn<BulgeParams> = (u, v, params, ctx) => {
  const baseX = u * ctx.width;
  const baseY = v * ctx.height;

  if (params.strength === 0 || params.radius <= 0) {
    return { x: baseX, y: baseY };
  }

  const { center, radius, peak } = bulgeGeometry(params, ctx);
  if (Math.hypot(baseX - center.x, baseY - center.y) >= radius) {
    return { x: baseX, y: baseY };
  }

  const dx = baseX - peak.x;
  const dy = baseY - peak.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return { x: baseX, y: baseY };
  }

  // 중앙점에서 이 점 쪽으로 뻗어 원 경계에 닿기까지의 거리
  const dirX = dx / distance;
  const dirY = dy / distance;
  const offsetX = peak.x - center.x;
  const offsetY = peak.y - center.y;
  const along = offsetX * dirX + offsetY * dirY;
  const reach =
    -along +
    Math.sqrt(
      Math.max(
        0,
        along * along -
          (offsetX * offsetX + offsetY * offsetY) +
          radius * radius,
      ),
    );

  const t = distance / reach;
  if (t >= 1) {
    return { x: baseX, y: baseY };
  }

  // waves가 0이면 cos(0) = 1 이라 순수 볼록이 되고, 값을 올릴수록 물결이 생긴다
  const ripple = Math.cos(params.waves * Math.PI * t);
  const falloff = 1 - t;
  const scale = 1 + params.strength * ripple * falloff;

  return {
    x: peak.x + dx * scale,
    y: peak.y + dy * scale,
  };
};
