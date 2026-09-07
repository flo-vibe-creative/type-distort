import { ARC_DEFAULT, warpArc, type ArcParams } from '@/lib/warp/arc'
import { BULGE_DEFAULT, warpBulge, type BulgeParams } from '@/lib/warp/bulge'
import { MESH_DEFAULT, warpMesh, type MeshParams } from '@/lib/warp/mesh'
import {
  PERSPECTIVE_DEFAULT,
  warpPerspective,
  type PerspectiveParams,
} from '@/lib/warp/perspective'
import type { Point, WarpContext, WarpType } from '@/lib/warp/types'

/** 우측 패널에 그릴 슬라이더 한 줄의 정의 */
export interface SliderSpec {
  key: string
  label: string
  min: number
  max: number
  step: number
  /** 값 뒤에 붙일 단위 표기 */
  unit?: string
}

export interface WarpEffect<P> {
  label: string
  /** 핸들 조작만으로 다루는 효과는 슬라이더가 비어 있을 수 있다 */
  sliders: SliderSpec[]
  defaults: P
}

/** 레이어에 저장되는 왜곡 상태 (종류 + 파라미터) */
export type WarpState =
  | { type: 'arc'; params: ArcParams }
  | { type: 'mesh'; params: MeshParams }
  | { type: 'perspective'; params: PerspectiveParams }
  | { type: 'bulge'; params: BulgeParams }

export const WARP_TYPES: readonly WarpType[] = ['arc', 'mesh', 'perspective', 'bulge']

export const WARP_EFFECTS = {
  arc: {
    label: '아크 / 링',
    defaults: ARC_DEFAULT,
    sliders: [
      { key: 'angle', label: '각도', min: -360, max: 360, step: 1, unit: '°' },
      { key: 'strength', label: '세기', min: 0, max: 1, step: 0.01 },
    ],
  } satisfies WarpEffect<ArcParams>,
  mesh: {
    label: '자유 메쉬',
    defaults: MESH_DEFAULT,
    sliders: [],
  } satisfies WarpEffect<MeshParams>,
  perspective: {
    label: '퍼스펙티브',
    defaults: PERSPECTIVE_DEFAULT,
    sliders: [],
  } satisfies WarpEffect<PerspectiveParams>,
  bulge: {
    label: '볼록 / 웨이브',
    defaults: BULGE_DEFAULT,
    sliders: [
      { key: 'strength', label: '세기', min: -1, max: 1, step: 0.01 },
      { key: 'radius', label: '반경', min: 0.05, max: 2, step: 0.01 },
      { key: 'waves', label: '파동 수', min: 0, max: 8, step: 1 },
    ],
  } satisfies WarpEffect<BulgeParams>,
} as const

/** 기본 파라미터를 복제해 새 왜곡 상태를 만든다 (효과끼리 값이 섞이지 않도록) */
export function createWarp(type: WarpType): WarpState {
  switch (type) {
    case 'arc':
      return { type: 'arc', params: { ...ARC_DEFAULT } }
    case 'mesh':
      return { type: 'mesh', params: { points: MESH_DEFAULT.points.map((p) => ({ ...p })) } }
    case 'perspective':
      return {
        type: 'perspective',
        params: { corners: PERSPECTIVE_DEFAULT.corners.map((p) => ({ ...p })) },
      }
    case 'bulge':
      return { type: 'bulge', params: { ...BULGE_DEFAULT } }
  }
}

/** 왜곡 상태에 맞는 계산식으로 점 하나를 옮긴다 */
export function applyWarp(warp: WarpState, u: number, v: number, ctx: WarpContext): Point {
  switch (warp.type) {
    case 'arc':
      return warpArc(u, v, warp.params, ctx)
    case 'mesh':
      return warpMesh(u, v, warp.params, ctx)
    case 'perspective':
      return warpPerspective(u, v, warp.params, ctx)
    case 'bulge':
      return warpBulge(u, v, warp.params, ctx)
  }
}
