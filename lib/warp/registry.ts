import { ARC_DEFAULT, warpArc, type ArcParams } from '@/lib/warp/arc'
import {
  ACCORDION_DEFAULT,
  warpAccordion,
  type AccordionParams,
} from '@/lib/warp/accordion'
import { BULGE_DEFAULT, warpBulge, type BulgeParams } from '@/lib/warp/bulge'
import { FAN_DEFAULT, warpFan, type FanParams } from '@/lib/warp/fan'
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
  /** 화면에 보여줄 때 곱할 배수 (0~1 값을 퍼센트로 보여줄 때) */
  displayScale?: number
}

export interface WarpEffectMeta {
  label: string
  /** 핸들 조작만으로 다루는 효과는 슬라이더가 비어 있을 수 있다 */
  sliders: SliderSpec[]
}

/** 레이어에 저장되는 왜곡 상태 (종류 + 파라미터) */
export type WarpState =
  | { type: 'arc'; params: ArcParams }
  | { type: 'mesh'; params: MeshParams }
  | { type: 'perspective'; params: PerspectiveParams }
  | { type: 'bulge'; params: BulgeParams }
  | { type: 'fan'; params: FanParams }
  | { type: 'accordion'; params: AccordionParams }

export const WARP_TYPES: readonly WarpType[] = [
  'arc',
  'mesh',
  'perspective',
  'bulge',
  'fan',
  'accordion',
]

export const WARP_EFFECTS: Record<WarpType, WarpEffectMeta> = {
  arc: {
    label: '아크 / 링',
    sliders: [
      { key: 'angle', label: '각도', min: -360, max: 360, step: 1, unit: '°' },
      {
        key: 'anchor',
        label: '기준점',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '%',
        displayScale: 100,
      },
      {
        key: 'baseline',
        label: '기준선',
        min: -0.5,
        max: 1.5,
        step: 0.01,
        unit: '%',
        displayScale: 100,
      },
      { key: 'rotation', label: '회전', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'strength', label: '세기', min: 0, max: 1, step: 0.01 },
    ],
  },
  mesh: {
    label: '자유 메쉬',
    sliders: [],
  },
  perspective: {
    label: '퍼스펙티브',
    sliders: [],
  },
  bulge: {
    label: '볼록 / 웨이브',
    sliders: [
      { key: 'strength', label: '세기', min: -1, max: 1, step: 0.01 },
      { key: 'radius', label: '반경', min: 0.05, max: 2, step: 0.01 },
      { key: 'waves', label: '파동 수', min: 0, max: 8, step: 1 },
    ],
  },
  fan: {
    label: '사다리꼴 / 부채꼴',
    sliders: [
      { key: 'topBend', label: '윗선 휨', min: -1, max: 1, step: 0.01 },
      { key: 'bottomBend', label: '아랫선 휨', min: -1, max: 1, step: 0.01 },
      { key: 'spread', label: '좌우 퍼짐', min: -1, max: 1, step: 0.01 },
      { key: 'skew', label: '좌우 기울기', min: -1, max: 1, step: 0.01 },
      { key: 'leftBend', label: '왼선 휨', min: -1, max: 1, step: 0.01 },
      { key: 'rightBend', label: '오른선 휨', min: -1, max: 1, step: 0.01 },
      { key: 'spreadY', label: '위아래 퍼짐', min: -1, max: 1, step: 0.01 },
      { key: 'skewY', label: '위아래 기울기', min: -1, max: 1, step: 0.01 },
    ],
  },
  accordion: {
    label: '접힌 띠 / 아코디언',
    sliders: [
      { key: 'panels', label: '판 수', min: 2, max: 8, step: 1 },
      { key: 'offset', label: '어긋남', min: -1, max: 1, step: 0.01 },
      { key: 'squeeze', label: '눌림', min: -1, max: 1, step: 0.01 },
    ],
  },
}

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
    case 'fan':
      return { type: 'fan', params: { ...FAN_DEFAULT } }
    case 'accordion':
      return { type: 'accordion', params: { ...ACCORDION_DEFAULT } }
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
    case 'fan':
      return warpFan(u, v, warp.params, ctx)
    case 'accordion':
      return warpAccordion(u, v, warp.params, ctx)
  }
}
