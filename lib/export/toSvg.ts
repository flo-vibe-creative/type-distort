import type { EditorDocument, Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { warpCommandsToPathData } from '@/lib/render/warpShape'

/**
 * 이미지 레이어는 SVG 안에서 왜곡할 방법이 없어, 왜곡한 결과를 그림으로 구워 끼워 넣는다.
 * 그 구워둔 그림을 레이어 id로 찾을 수 있게 넘겨받는다.
 */
export interface BakedRaster {
  /** data: URL */
  href: string
  /** 구운 그림이 차지하는 레이어 좌표계 범위 */
  bounds: Bounds
}

export type BakedRasterMap = Record<string, BakedRaster>

/** 내보낼 때 곡선을 쪼개는 정밀도 (원본 좌표 기준 px) */
const EXPORT_TOLERANCE = 0.08

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function transformAttribute(layer: Layer): string {
  const { x, y, scaleX, scaleY, rotation } = layer.transform
  return `translate(${x} ${y}) rotate(${rotation}) scale(${scaleX} ${scaleY})`
}

/** 보이는 이미지 레이어가 하나라도 있는지 — SVG로 저장할 때 안내가 필요한지 판단한다 */
export function hasRasterLayer(document: EditorDocument): boolean {
  return document.layers.some((layer) => layer.visible && layer.source.kind === 'raster')
}

/**
 * 문서를 SVG 문자열로 만든다.
 * 벡터 레이어는 왜곡된 실제 경로로 들어가므로 확대해도 깨지지 않는다.
 */
export function documentToSvgMarkup(
  document: EditorDocument,
  bakedRasters: BakedRasterMap
): string {
  const { canvas } = document
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`
  )

  if (canvas.background) {
    parts.push(
      `<rect width="${canvas.width}" height="${canvas.height}" fill="${escapeAttribute(canvas.background)}"/>`
    )
  }

  for (const layer of document.layers) {
    if (!layer.visible) continue
    const transform = escapeAttribute(transformAttribute(layer))

    if (layer.source.kind === 'vector') {
      const source = layer.source
      const paths = source.shapes
        .map((shape) => {
          const d = warpCommandsToPathData(
            shape.commands,
            source.bounds,
            layer.warp,
            EXPORT_TOLERANCE
          )
          if (!d) return ''
          const opacity = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : ''
          return `<path d="${d}" fill="${escapeAttribute(shape.fill)}" fill-rule="${shape.fillRule}"${opacity}/>`
        })
        .filter(Boolean)
        .join('')
      if (!paths) continue
      parts.push(`<g transform="${transform}">${paths}</g>`)
      continue
    }

    const baked = bakedRasters[layer.id]
    if (!baked) continue
    const width = baked.bounds.maxX - baked.bounds.minX
    const height = baked.bounds.maxY - baked.bounds.minY
    parts.push(
      `<g transform="${transform}">` +
        // 구형 브라우저를 위해 xlink:href도 함께 적는다
        `<image href="${escapeAttribute(baked.href)}" xlink:href="${escapeAttribute(baked.href)}" x="${baked.bounds.minX}" y="${baked.bounds.minY}" width="${width}" height="${height}" preserveAspectRatio="none"/>` +
        `</g>`
    )
  }

  parts.push('</svg>')
  return parts.join('')
}
