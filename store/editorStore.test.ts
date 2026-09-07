import { beforeEach, describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import { DEFAULT_CANVAS, useEditorStore } from '@/store/editorStore'
import { createWarp } from '@/lib/warp/registry'

let counter = 0

function fakeLayer(name: string, width = 100, height = 50): Layer {
  counter += 1
  return {
    id: `test-${counter}`,
    name,
    visible: true,
    source: {
      kind: 'vector',
      shapes: [],
      bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
    },
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    warp: createWarp('arc'),
  }
}

const store = () => useEditorStore.getState()

beforeEach(() => {
  useEditorStore.getState().reset()
})

describe('레이어 추가', () => {
  it('추가한 레이어가 바로 선택된다', () => {
    const layer = fakeLayer('WOW')
    store().addLayers([layer])
    expect(store().document.layers).toHaveLength(1)
    expect(store().selectedLayerId).toBe(layer.id)
  })

  it('캔버스 가운데에 놓는다', () => {
    store().addLayers([fakeLayer('WOW', 100, 50)])
    const { transform } = store().document.layers[0]
    expect(transform.x).toBe((DEFAULT_CANVAS.width - 100) / 2)
    expect(transform.y).toBe((DEFAULT_CANVAS.height - 50) / 2)
  })

  it('이어서 추가한 레이어는 정확히 겹치지 않게 조금씩 어긋나 쌓인다', () => {
    store().addLayers([fakeLayer('A', 100, 50)])
    store().addLayers([fakeLayer('B', 100, 50)])
    const [a, b] = store().document.layers
    expect(b.transform.x).toBeGreaterThan(a.transform.x)
    expect(b.transform.y).toBeGreaterThan(a.transform.y)
  })

  it('여러 개를 한 번에 넣으면 순서대로 쌓이고 마지막 것이 선택된다', () => {
    const layers = [fakeLayer('A'), fakeLayer('B'), fakeLayer('C')]
    store().addLayers(layers)
    expect(store().document.layers.map((l) => l.name)).toEqual(['A', 'B', 'C'])
    expect(store().selectedLayerId).toBe(layers[2].id)
  })
})

describe('레이어 목록 다루기', () => {
  it('삭제하면 목록에서 빠지고 선택이 다른 레이어로 넘어간다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().removeLayer(b.id)
    expect(store().document.layers.map((l) => l.id)).toEqual([a.id])
    expect(store().selectedLayerId).toBe(a.id)
  })

  it('마지막 레이어를 지우면 선택이 비워진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().removeLayer(a.id)
    expect(store().selectedLayerId).toBeNull()
  })

  it('숨기기를 켜고 끌 수 있다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().toggleLayerVisibility(a.id)
    expect(store().document.layers[0].visible).toBe(false)
    store().toggleLayerVisibility(a.id)
    expect(store().document.layers[0].visible).toBe(true)
  })

  it('위로 보내면 목록에서 뒤로 가 더 위에 그려진다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().reorderLayer(a.id, 'up')
    expect(store().document.layers.map((l) => l.name)).toEqual(['B', 'A'])
  })

  it('맨 위에서 더 위로 보내도 순서가 그대로다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().reorderLayer(b.id, 'up')
    expect(store().document.layers.map((l) => l.name)).toEqual(['A', 'B'])
  })

  it('아래로 보내면 목록에서 앞으로 간다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().reorderLayer(b.id, 'down')
    expect(store().document.layers.map((l) => l.name)).toEqual(['B', 'A'])
  })
})

describe('배치와 왜곡 수정', () => {
  it('배치 값을 부분적으로 바꾼다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { rotation: 30 })
    expect(store().document.layers[0].transform.rotation).toBe(30)
    expect(store().document.layers[0].transform.scale).toBe(1)
  })

  it('크기는 0 이하로 내려가지 않는다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { scale: -2 })
    expect(store().document.layers[0].transform.scale).toBeGreaterThan(0)
  })

  it('왜곡 종류를 바꾸면 그 효과의 기본값으로 초기화된다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateWarpParams(a.id, { angle: 90 })
    store().setWarpType(a.id, 'bulge')
    expect(store().document.layers[0].warp.type).toBe('bulge')
    store().setWarpType(a.id, 'arc')
    expect(store().document.layers[0].warp.params).toMatchObject({ angle: 0 })
  })

  it('왜곡 파라미터를 부분적으로 바꾼다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateWarpParams(a.id, { angle: 45 })
    expect(store().document.layers[0].warp.params).toMatchObject({ angle: 45, strength: 1 })
  })

  it('없는 레이어를 수정해도 아무 일도 일어나지 않는다', () => {
    store().addLayers([fakeLayer('A')])
    const before = store().document
    store().updateTransform('없는-id', { rotation: 10 })
    expect(store().document).toBe(before)
  })
})

describe('화면 이동과 확대', () => {
  it('확대 배율은 정해진 범위를 벗어나지 않는다', () => {
    store().setZoom(1000)
    expect(store().viewport.zoom).toBeLessThanOrEqual(64)
    store().setZoom(0)
    expect(store().viewport.zoom).toBeGreaterThan(0)
  })

  it('화면을 밀면 이동 값이 쌓인다', () => {
    store().panBy(10, -5)
    store().panBy(5, 5)
    expect(store().viewport.panX).toBe(15)
    expect(store().viewport.panY).toBe(0)
  })
})

describe('편집 모드', () => {
  it('기본은 배치 모드다', () => {
    expect(store().mode).toBe('transform')
  })

  it('왜곡 모드로 바꿨다가 선택을 해제하면 배치 모드로 돌아온다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().setMode('warp')
    store().selectLayer(null)
    expect(store().mode).toBe('transform')
  })
})
