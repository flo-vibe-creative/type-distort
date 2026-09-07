import { describe, expect, it } from 'vitest'
import type { EditorDocument, Layer } from '@/lib/document/types'
import { deserializeDocument, serializeDocument } from '@/store/persist'
import { parsePathData } from '@/lib/svg/pathData'
import { createWarp } from '@/lib/warp/registry'

function vectorLayer(): Layer {
  return {
    id: 'v1',
    name: '글자',
    visible: true,
    source: {
      kind: 'vector',
      shapes: [
        {
          commands: parsePathData('M 0 0 L 10 0 L 10 10 Z'),
          fill: '#123456',
          fillRule: 'evenodd',
          opacity: 0.8,
        },
      ],
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    },
    transform: { x: 5, y: 6, scaleX: 1.5, scaleY: 2, rotation: 30 },
    warp: createWarp('bulge'),
    letterSpacing: 0.25,
  }
}

function rasterLayer(): Layer {
  return {
    id: 'r1',
    name: '사진',
    visible: false,
    source: {
      kind: 'raster',
      bitmap: null as unknown as ImageBitmap,
      width: 300,
      height: 200,
      scaledDown: true,
      blob: new Blob(['x'], { type: 'image/png' }),
    },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp('mesh'),
    letterSpacing: 0,
  }
}

const document: EditorDocument = {
  canvas: { width: 800, height: 600, background: '#fafafa' },
  layers: [vectorLayer(), rasterLayer()],
}

describe('serializeDocument', () => {
  it('그림 데이터를 뺀 나머지를 그대로 담는다', () => {
    const stored = serializeDocument(document)
    expect(stored.canvas).toEqual(document.canvas)
    expect(stored.layers).toHaveLength(2)
    expect(stored.layers[0]).toMatchObject({ id: 'v1', name: '글자', visible: true })
  })

  it('이미지 레이어는 원본을 따로 보관할 열쇠만 남긴다', () => {
    const stored = serializeDocument(document)
    const raster = stored.layers[1]
    expect(raster.source.kind).toBe('raster')
    if (raster.source.kind !== 'raster') return
    expect(raster.source.imageKey).toBe('r1')
    expect('bitmap' in raster.source).toBe(false)
    expect('blob' in raster.source).toBe(false)
  })

  it('JSON으로 바꿔도 정보가 사라지지 않는다', () => {
    const stored = serializeDocument(document)
    expect(JSON.parse(JSON.stringify(stored))).toEqual(stored)
  })
})

describe('deserializeDocument', () => {
  it('벡터 레이어를 그대로 되살린다', () => {
    const restored = deserializeDocument(serializeDocument(document), {})
    expect(restored).not.toBeNull()
    expect(restored!.canvas).toEqual(document.canvas)
    expect(restored!.layers[0]).toEqual(document.layers[0])
  })

  it('되살릴 그림이 없는 이미지 레이어는 빼고 되살린다', () => {
    const restored = deserializeDocument(serializeDocument(document), {})
    expect(restored!.layers.map((l) => l.id)).toEqual(['v1'])
  })

  it('그림을 넘겨주면 이미지 레이어도 되살린다', () => {
    const bitmap = { width: 300, height: 200 } as unknown as ImageBitmap
    const blob = new Blob(['x'], { type: 'image/png' })
    const restored = deserializeDocument(serializeDocument(document), {
      r1: { bitmap, blob },
    })
    expect(restored!.layers).toHaveLength(2)
    const source = restored!.layers[1].source
    expect(source.kind).toBe('raster')
    if (source.kind !== 'raster') return
    expect(source.bitmap).toBe(bitmap)
    expect(source.width).toBe(300)
  })

  it('저장본이 망가져 있으면 되살리지 않는다', () => {
    expect(deserializeDocument(null, {})).toBeNull()
    expect(deserializeDocument({ version: 1 } as never, {})).toBeNull()
    expect(
      deserializeDocument({ version: 999, canvas: document.canvas, layers: [] } as never, {})
    ).toBeNull()
  })

  it('레이어 하나가 망가져 있어도 나머지는 살린다', () => {
    const stored = serializeDocument(document)
    const broken = { ...stored, layers: [{ id: 'x' } as never, ...stored.layers] }
    const restored = deserializeDocument(broken, {})
    expect(restored!.layers.map((l) => l.id)).toEqual(['v1'])
  })
})
