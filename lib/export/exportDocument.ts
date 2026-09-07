import type { EditorDocument } from '@/lib/document/types'
import { renderWarpedBitmap } from '@/lib/raster/glRenderer'
import { warpedBounds } from '@/lib/render/layerBounds'
import { documentToSvgMarkup, type BakedRasterMap } from '@/lib/export/toSvg'

export type ExportFormat = 'svg' | 'png' | 'jpeg'

export interface ExportOptions {
  format: ExportFormat
  /** PNG 배율 (1x / 2x / 4x) */
  scale: number
  /** 투명 배경으로 저장할지. JPEG는 투명을 지원하지 않아 무시된다. */
  transparent: boolean
  /** 투명이 아닐 때 깔 배경색 */
  background: string
  /** JPEG 품질 (0~1) */
  quality: number
}

export interface ExportResult {
  blob: Blob
  fileName: string
}

/** 이미지 레이어를 구울 때 쓰는 격자 조밀도 — 화면보다 촘촘하게 잡는다 */
const EXPORT_GRID = 96
/** 구운 그림이 지나치게 커지지 않도록 두는 배율 상한 */
const MAX_BAKE_SCALE = 4

function baseFileName(document: EditorDocument): string {
  const first = document.layers.find((layer) => layer.visible)
  return first?.name?.trim() || 'type-distort'
}

/** 이미지 레이어의 왜곡 결과를 그림으로 구워 data URL로 만든다 */
function bakeRasters(document: EditorDocument, scale: number): BakedRasterMap {
  const baked: BakedRasterMap = {}

  for (const layer of document.layers) {
    if (!layer.visible || layer.source.kind !== 'raster') continue
    const bounds = warpedBounds(layer)
    const pixelScale = Math.min(
      MAX_BAKE_SCALE,
      Math.max(1, scale * Math.max(Math.abs(layer.transform.scaleX), Math.abs(layer.transform.scaleY)))
    )

    const rendered = renderWarpedBitmap({
      bitmap: layer.source.bitmap,
      warp: layer.warp,
      sourceWidth: layer.source.width,
      sourceHeight: layer.source.height,
      bounds,
      pixelScale,
      gridSize: EXPORT_GRID,
    })
    if (!rendered) continue

    baked[layer.id] = { href: rendered.toDataURL('image/png'), bounds }
  }

  return baked
}

/** SVG 문자열을 이미지로 불러온다 */
function loadSvgImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG를 그림으로 바꾸지 못했습니다.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('그림을 만들지 못했습니다.'))),
      type,
      quality
    )
  })
}

/**
 * 문서를 원하는 형식으로 내보낸다.
 *
 * 어떤 형식이든 같은 SVG 마크업에서 출발하므로, 화면에서 본 것과 저장된 결과가 어긋나지 않는다.
 * PNG·JPEG는 그 SVG를 그대로 그림으로 구워 만든다.
 */
export async function exportDocument(
  document: EditorDocument,
  options: ExportOptions
): Promise<ExportResult> {
  // JPEG는 투명을 담을 수 없으므로 항상 배경을 깐다
  const opaque = options.format === 'jpeg' || !options.transparent
  const canvasSettings = {
    ...document.canvas,
    background: opaque ? options.background : null,
  }
  const prepared: EditorDocument = { ...document, canvas: canvasSettings }

  const scale = options.format === 'svg' ? 1 : options.scale
  const markup = documentToSvgMarkup(prepared, bakeRasters(prepared, scale))
  const name = baseFileName(document)

  if (options.format === 'svg') {
    return {
      blob: new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
      fileName: `${name}.svg`,
    }
  }

  const image = await loadSvgImage(markup)
  const canvas = window.document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(document.canvas.width * scale))
  canvas.height = Math.max(1, Math.round(document.canvas.height * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('그림을 그릴 수 없습니다.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  if (options.format === 'png') {
    return { blob: await canvasToBlob(canvas, 'image/png', 1), fileName: `${name}.png` }
  }
  return {
    blob: await canvasToBlob(canvas, 'image/jpeg', options.quality),
    fileName: `${name}.jpg`,
  }
}

/** 만든 파일을 내려받는다 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  window.document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 클릭 직후에 지우면 다운로드가 끊길 수 있어 잠시 뒤에 정리한다
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
