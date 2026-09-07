import { describe, expect, it } from 'vitest'
import type { EditorDocument, Layer } from '@/lib/document/types'
import { documentToSvgMarkup, hasRasterLayer } from '@/lib/export/toSvg'
import { parsePathData } from '@/lib/svg/pathData'
import { createWarp } from '@/lib/warp/registry'

function vectorLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'v1',
    name: '글자',
    visible: true,
    source: {
      kind: 'vector',
      shapes: [
        {
          commands: parsePathData('M 0 0 L 100 0 L 100 50 L 0 50 Z'),
          fill: '#ff0000',
          fillRule: 'evenodd',
          opacity: 0.5,
        },
      ],
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 50 },
    },
    transform: { x: 10, y: 20, scaleX: 2, scaleY: 1, rotation: 15 },
    warp: createWarp('arc'),
    ...overrides,
  }
}

function doc(layers: Layer[], background: string | null = '#ffffff'): EditorDocument {
  return { canvas: { width: 400, height: 300, background }, layers }
}

describe('documentToSvgMarkup', () => {
  it('캔버스 크기를 그대로 쓴다', () => {
    const markup = documentToSvgMarkup(doc([vectorLayer()]), {})
    expect(markup).toContain('width="400"')
    expect(markup).toContain('height="300"')
    expect(markup).toContain('viewBox="0 0 400 300"')
  })

  it('배경색이 있으면 배경 사각형을 깐다', () => {
    expect(documentToSvgMarkup(doc([vectorLayer()]), {})).toContain('fill="#ffffff"')
  })

  it('배경이 없으면 배경 사각형을 넣지 않아 투명하게 남는다', () => {
    const markup = documentToSvgMarkup(doc([vectorLayer()], null), {})
    expect(markup).not.toContain('<rect')
  })

  it('벡터 레이어를 실제 경로로 적고 배치를 함께 담는다', () => {
    const markup = documentToSvgMarkup(doc([vectorLayer()]), {})
    expect(markup).toContain('transform="translate(10 20) rotate(15) scale(2 1)"')
    expect(markup).toContain('fill="#ff0000"')
    expect(markup).toContain('fill-rule="evenodd"')
    expect(markup).toContain('opacity="0.5"')
    expect(markup).toMatch(/<path d="M[^"]+"/)
  })

  it('숨긴 레이어는 내보내지 않는다', () => {
    const markup = documentToSvgMarkup(doc([vectorLayer({ visible: false })]), {})
    expect(markup).not.toContain('<path')
  })

  it('이미지 레이어는 구워둔 그림을 끼워 넣는다', () => {
    const raster: Layer = {
      id: 'r1',
      name: '사진',
      visible: true,
      source: {
        kind: 'raster',
        bitmap: null as unknown as ImageBitmap,
        width: 200,
        height: 100,
        scaledDown: false,
      },
      transform: { x: 5, y: 5, scaleX: 1, scaleY: 1, rotation: 0 },
      warp: createWarp('arc'),
    }
    const markup = documentToSvgMarkup(doc([raster]), {
      r1: { href: 'data:image/png;base64,AAA', bounds: { minX: 0, minY: 0, maxX: 200, maxY: 100 } },
    })
    expect(markup).toContain('<image')
    expect(markup).toContain('data:image/png;base64,AAA')
    expect(markup).toContain('width="200"')
  })

  it('구워둔 그림이 없는 이미지 레이어는 건너뛴다', () => {
    const raster: Layer = {
      id: 'r1',
      name: '사진',
      visible: true,
      source: {
        kind: 'raster',
        bitmap: null as unknown as ImageBitmap,
        width: 200,
        height: 100,
        scaledDown: false,
      },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      warp: createWarp('arc'),
    }
    expect(documentToSvgMarkup(doc([raster]), {})).not.toContain('<image')
  })

  it('색에 따옴표가 섞여 들어와도 마크업이 깨지지 않는다', () => {
    const layer = vectorLayer()
    if (layer.source.kind !== 'vector') throw new Error('vector')
    layer.source.shapes[0].fill = 'url(#a")><script>alert(1)</script>'
    const markup = documentToSvgMarkup(doc([layer]), {})
    expect(markup).not.toContain('<script>')
    expect(markup).toContain('&quot;')
  })
})

describe('hasRasterLayer', () => {
  it('보이는 이미지 레이어가 있는지 알려준다', () => {
    expect(hasRasterLayer(doc([vectorLayer()]))).toBe(false)
    const raster = vectorLayer({
      id: 'r',
      source: {
        kind: 'raster',
        bitmap: null as unknown as ImageBitmap,
        width: 10,
        height: 10,
        scaledDown: false,
      },
    })
    expect(hasRasterLayer(doc([raster]))).toBe(true)
    expect(hasRasterLayer(doc([{ ...raster, visible: false }]))).toBe(false)
  })
})
