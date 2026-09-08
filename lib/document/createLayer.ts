import { boundsOfCommands, mergeBounds, type Bounds } from '@/lib/geometry/bbox'
import type { Layer } from '@/lib/document/types'
import type { RasterSource } from '@/lib/raster/loadImage'
import type { ParsedSvg } from '@/lib/svg/parse'
import { createWarp } from '@/lib/warp/registry'

let sequence = 0

function nextId(): string {
  sequence += 1
  return `layer-${Date.now().toString(36)}-${sequence}`
}

/** 파일 이름에서 확장자를 떼어 레이어 이름으로 쓴다 */
export function layerNameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  return withoutExtension.trim() || '레이어'
}

/**
 * 파싱한 SVG를 레이어로 만든다.
 *
 * 왜곡은 도형이 실제로 차지하는 범위를 기준으로 걸리므로 아트보드의 빈 여백은 기준에서 뺀다.
 * 캔버스 위 어디에 놓을지는 스토어가 정하므로 여기서는 원점에 둔다.
 */
export function createVectorLayer(svg: ParsedSvg, fileName: string): Layer {
  let bounds: Bounds | null = null
  for (const shape of svg.shapes) {
    bounds = mergeBounds(bounds, boundsOfCommands(shape.commands))
  }
  const contentBounds: Bounds = bounds ?? { minX: 0, minY: 0, maxX: svg.width, maxY: svg.height }

  return {
    id: nextId(),
    name: layerNameFromFileName(fileName),
    visible: true,
    source: { kind: 'vector', shapes: svg.shapes, bounds: contentBounds },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp('arc'),
    letterSpacing: 0,
    fillOverride: null,
  }
}

/** 불러온 이미지를 레이어로 만든다 */
export function createRasterLayer(image: RasterSource, fileName: string): Layer {
  return {
    id: nextId(),
    name: layerNameFromFileName(fileName),
    visible: true,
    source: {
      kind: 'raster',
      bitmap: image.bitmap,
      width: image.width,
      height: image.height,
      scaledDown: image.scaledDown,
      blob: image.blob,
    },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp('arc'),
    letterSpacing: 0,
    fillOverride: null,
  }
}
