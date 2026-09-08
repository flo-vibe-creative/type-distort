import type { Bounds } from '@/lib/geometry/bbox'
import type { VectorShape } from '@/lib/svg/parse'
import type { WarpState } from '@/lib/warp/registry'

/** 왜곡과 별개인 레이어의 배치 값 */
export interface LayerTransform {
  /** 캔버스 위에서의 위치 (왜곡 결과의 왼쪽 위 기준) */
  x: number
  y: number
  /** 가로 확대율 — 모서리를 잡아 자유롭게 늘릴 수 있도록 축마다 따로 둔다 */
  scaleX: number
  scaleY: number
  /** 도 단위 회전 */
  rotation: number
}

export interface VectorLayerSource {
  kind: 'vector'
  shapes: VectorShape[]
  /** 도형이 실제로 차지하는 범위. 왜곡의 기준 영역이 된다. */
  bounds: Bounds
}

export interface RasterLayerSource {
  kind: 'raster'
  bitmap: ImageBitmap
  width: number
  height: number
  /** 텍스처 한계를 넘어 자동으로 줄였는지 */
  scaledDown: boolean
  /** 새로고침 후 되살리기 위해 들고 있는 원본 파일 */
  blob: Blob
}

export type LayerSource = VectorLayerSource | RasterLayerSource

export interface Layer {
  id: string
  name: string
  visible: boolean
  source: LayerSource
  transform: LayerTransform
  warp: WarpState
  /**
   * 글자 사이 간격. 글자 높이에 대한 비율이며 0이면 원본 그대로.
   * 이미지 레이어에는 글자 단위가 없어 쓰이지 않는다.
   */
  letterSpacing: number
  /**
   * 글자 색을 덮어쓴다. null이면 원본 SVG의 색을 그대로 쓴다.
   * 이미지 레이어에는 쓰이지 않는다.
   */
  fillOverride: string | null
}

/** 배경 이미지를 캔버스에 맞추는 방식 */
export type CanvasImageFit = 'cover' | 'contain' | 'stretch'

/** 캔버스 배경으로 깔아 둔 이미지 */
export interface CanvasImage {
  bitmap: ImageBitmap
  /** 새로고침 후 되살리기 위해 들고 있는 원본 파일 */
  blob: Blob
  width: number
  height: number
}

export interface CanvasSettings {
  width: number
  height: number
  /** 배경색. null이면 색 없이 투명하다. */
  background: string | null
  /** 배경 이미지. 색 위에 덮인다. */
  image: CanvasImage | null
  imageFit: CanvasImageFit
}

export interface EditorDocument {
  canvas: CanvasSettings
  /** 뒤에 있는 것이 위에 그려진다 (레이어 패널은 뒤집어 보여준다) */
  layers: Layer[]
}

/** 왜곡이 적용될 원본 영역의 크기 */
export function sourceSize(source: LayerSource): { width: number; height: number } {
  if (source.kind === 'raster') {
    return { width: source.width, height: source.height }
  }
  return {
    width: source.bounds.maxX - source.bounds.minX,
    height: source.bounds.maxY - source.bounds.minY,
  }
}
