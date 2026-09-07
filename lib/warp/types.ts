/**
 * 왜곡 엔진 공통 규격
 *
 * 모든 왜곡 효과는 "원본 위의 점 하나를 새 위치로 옮기는 순수 함수" 하나로 표현된다.
 * 벡터 레이어(글자 외곽선의 점)와 이미지 레이어(격자점)가 같은 함수를 공유한다.
 */

export interface Point {
  x: number
  y: number
}

/**
 * 왜곡이 적용될 원본의 크기 정보.
 * 정규화 좌표(u, v)만으로는 가로/세로 비율을 알 수 없어 함께 넘긴다.
 */
export interface WarpContext {
  /** 원본 경계 상자의 너비 (px) */
  width: number
  /** 원본 경계 상자의 높이 (px) */
  height: number
}

/**
 * 왜곡 함수.
 *
 * @param u 경계 상자 안에서의 가로 위치. 0 = 왼쪽 끝, 1 = 오른쪽 끝
 * @param v 경계 상자 안에서의 세로 위치. 0 = 위쪽 끝, 1 = 아래쪽 끝
 * @returns 경계 상자 왼쪽 위를 원점으로 하는 픽셀 좌표. 경계 밖으로 나갈 수 있다.
 */
export type WarpFn<P> = (u: number, v: number, params: P, ctx: WarpContext) => Point

/** 등록된 왜곡 효과의 식별자 */
export type WarpType = 'arc' | 'mesh' | 'perspective' | 'bulge'
