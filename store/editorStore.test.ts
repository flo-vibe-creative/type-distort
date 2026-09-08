import { beforeEach, describe, expect, it } from 'vitest'
import type { Layer } from '@/lib/document/types'
import { DEFAULT_CANVAS, HISTORY_LIMIT, useEditorStore } from '@/store/editorStore'
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
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    warp: createWarp('arc'),
    letterSpacing: 0,
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
    expect(store().selectedLayerIds).toEqual([layer.id])
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

  it('여러 개를 한 번에 넣으면 순서대로 쌓이고 넣은 것들이 모두 선택된다', () => {
    const layers = [fakeLayer('A'), fakeLayer('B'), fakeLayer('C')]
    store().addLayers(layers)
    expect(store().document.layers.map((l) => l.name)).toEqual(['A', 'B', 'C'])
    expect(store().selectedLayerIds).toEqual(layers.map((l) => l.id))
  })
})

describe('레이어 목록 다루기', () => {
  it('삭제하면 목록에서 빠지고 선택이 다른 레이어로 넘어간다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().removeLayers([b.id])
    expect(store().document.layers.map((l) => l.id)).toEqual([a.id])
    expect(store().selectedLayerIds).toEqual([a.id])
  })

  it('마지막 레이어를 지우면 선택이 비워진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().removeLayers([a.id])
    expect(store().selectedLayerIds).toEqual([])
  })

  it('골라 둔 레이어 여러 개를 한 번에 지운다', () => {
    const [a, b, c] = [fakeLayer('A'), fakeLayer('B'), fakeLayer('C')]
    store().addLayers([a, b, c])
    store().removeLayers([a.id, c.id])
    expect(store().document.layers.map((l) => l.name)).toEqual(['B'])
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
    expect(store().document.layers[0].transform.scaleX).toBe(1)
  })

  it('가로세로 확대율을 따로 바꿀 수 있다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { scaleX: 2 })
    expect(store().document.layers[0].transform.scaleX).toBe(2)
    expect(store().document.layers[0].transform.scaleY).toBe(1)
  })

  it('확대율이 0이 되지 않게 막되 뒤집기(음수)는 허용한다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { scaleX: 0 })
    expect(Math.abs(store().document.layers[0].transform.scaleX)).toBeGreaterThan(0)
    store().updateTransform(a.id, { scaleX: -2 })
    expect(store().document.layers[0].transform.scaleX).toBe(-2)
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

describe('레이어 선택', () => {
  it('여러 개를 골라 둘 수 있다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().selectLayers([a.id, b.id])
    expect(store().selectedLayerIds).toEqual([a.id, b.id])
  })

  it('Shift로 누르듯 하나씩 더하고 뺀다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().selectLayers([a.id])
    store().toggleLayerSelection(b.id)
    expect(store().selectedLayerIds).toEqual([a.id, b.id])
    store().toggleLayerSelection(a.id)
    expect(store().selectedLayerIds).toEqual([b.id])
  })

  it('선택이 바뀌면 골라 둔 조작점도 비워진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().setWarpHandleSelection(['mesh-1'])
    store().selectLayers([a.id])
    expect(store().selectedWarpHandles).toEqual([])
  })
})

describe('여러 레이어 함께 옮기기', () => {
  it('한 번에 여러 레이어의 배치를 바꾼다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().updateTransforms({ [a.id]: { x: 10 }, [b.id]: { x: 20, y: 5 } })
    expect(store().document.layers[0].transform.x).toBe(10)
    expect(store().document.layers[1].transform).toMatchObject({ x: 20, y: 5 })
  })

  it('함께 옮긴 것도 되돌리기 한 단계로 묶인다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    const before = store().document.layers.map((l) => l.transform.x)

    store().beginGesture()
    for (let step = 1; step <= 5; step += 1) {
      store().updateTransforms({ [a.id]: { x: before[0] + step }, [b.id]: { x: before[1] + step } })
    }
    store().endGesture()

    store().undo()
    expect(store().document.layers.map((l) => l.transform.x)).toEqual(before)
  })

  it('빈 목록을 넘기면 아무 일도 일어나지 않는다', () => {
    store().addLayers([fakeLayer('A')])
    const snapshot = store().document
    store().updateTransforms({})
    expect(store().document).toBe(snapshot)
  })
})

describe('내용에 맞춰 자르기', () => {
  it('보이는 레이어 전체에 맞춰 캔버스를 줄이고 레이어를 그만큼 옮긴다', () => {
    const a = fakeLayer('A', 100, 50)
    store().addLayers([a])
    store().updateTransform(a.id, { x: 300, y: 200 })
    store().fitCanvasToContent()

    expect(store().document.canvas).toMatchObject({ width: 100, height: 50 })
    expect(store().document.layers[0].transform).toMatchObject({ x: 0, y: 0 })
  })

  it('여백을 주면 그만큼 넉넉하게 자른다', () => {
    const a = fakeLayer('A', 100, 50)
    store().addLayers([a])
    store().fitCanvasToContent(20)
    expect(store().document.canvas).toMatchObject({ width: 140, height: 90 })
    expect(store().document.layers[0].transform).toMatchObject({ x: 20, y: 20 })
  })

  it('숨긴 레이어는 세지 않는다', () => {
    const [a, b] = [fakeLayer('A', 100, 50), fakeLayer('B', 400, 300)]
    store().addLayers([a, b])
    store().toggleLayerVisibility(b.id)
    store().fitCanvasToContent()
    expect(store().document.canvas).toMatchObject({ width: 100, height: 50 })
  })

  it('보이는 레이어가 없으면 아무것도 바꾸지 않는다', () => {
    const before = store().document
    store().fitCanvasToContent()
    expect(store().document).toBe(before)
  })
})

describe('되돌리기 / 다시하기', () => {
  it('처음에는 되돌릴 것도 다시 할 것도 없다', () => {
    expect(store().canUndo()).toBe(false)
    expect(store().canRedo()).toBe(false)
  })

  it('레이어를 추가한 뒤 되돌리면 없던 상태로 간다', () => {
    store().addLayers([fakeLayer('A')])
    expect(store().canUndo()).toBe(true)
    store().undo()
    expect(store().document.layers).toHaveLength(0)
    store().redo()
    expect(store().document.layers).toHaveLength(1)
  })

  it('여러 단계를 순서대로 거슬러 간다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { x: 10 })
    store().updateTransform(a.id, { x: 20 })

    store().undo()
    expect(store().document.layers[0].transform.x).toBe(10)
    store().undo()
    expect(store().document.layers[0].transform.x).not.toBe(10)
    store().redo()
    expect(store().document.layers[0].transform.x).toBe(10)
  })

  it('되돌린 뒤 새로 고치면 다시 할 것이 사라진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().updateTransform(a.id, { x: 10 })
    store().undo()
    store().updateTransform(a.id, { x: 99 })
    expect(store().canRedo()).toBe(false)
  })

  it('드래그 한 번은 되돌리기 한 단계로 묶인다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    const before = store().document.layers[0].transform.x

    store().beginGesture()
    for (let step = 1; step <= 20; step += 1) {
      store().updateTransform(a.id, { x: before + step })
    }
    store().endGesture()

    store().undo()
    expect(store().document.layers[0].transform.x).toBe(before)
  })

  it('되돌리기 기록은 정해진 단계 수까지만 쌓인다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    for (let step = 0; step < HISTORY_LIMIT + 20; step += 1) {
      store().updateTransform(a.id, { x: step })
    }
    expect(store().past.length).toBe(HISTORY_LIMIT)
  })

  it('저장본을 되살리면 되돌리기 기록은 비워진다', () => {
    store().addLayers([fakeLayer('A')])
    store().replaceDocument({ canvas: { width: 10, height: 10, background: null }, layers: [] })
    expect(store().canUndo()).toBe(false)
    expect(store().document.canvas.width).toBe(10)
  })
})

describe('자간', () => {
  it('레이어마다 자간을 따로 둔다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().setLetterSpacing(a.id, 0.4)
    expect(store().document.layers[0].letterSpacing).toBe(0.4)
    expect(store().document.layers[1].letterSpacing).toBe(0)
  })

  it('숫자가 아닌 값이 들어오면 0으로 되돌린다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().setLetterSpacing(a.id, Number.NaN)
    expect(store().document.layers[0].letterSpacing).toBe(0)
  })

  it('자간 변경도 되돌릴 수 있다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().setLetterSpacing(a.id, 0.5)
    store().undo()
    expect(store().document.layers[0].letterSpacing).toBe(0)
  })
})

describe('왜곡 조작점 선택', () => {
  it('처음에는 골라 둔 점이 없다', () => {
    expect(store().selectedWarpHandles).toEqual([])
  })

  it('여러 점을 골라 둘 수 있다', () => {
    store().setWarpHandleSelection(['mesh-5', 'mesh-6'])
    expect(store().selectedWarpHandles).toEqual(['mesh-5', 'mesh-6'])
  })

  it('레이어를 바꾸면 골라 둔 점이 비워진다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().setWarpHandleSelection(['mesh-5'])
    store().selectLayers([a.id])
    expect(store().selectedWarpHandles).toEqual([])
  })

  it('효과를 바꾸면 조작점 자체가 달라지므로 선택이 비워진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().setWarpHandleSelection(['mesh-5'])
    store().setWarpType(a.id, 'perspective')
    expect(store().selectedWarpHandles).toEqual([])
  })

  it('선택을 비우는 것은 되돌리기에 쌓이지 않는다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    const stepsBefore = store().past.length
    store().setWarpHandleSelection(['mesh-5'])
    store().clearWarpHandleSelection()
    expect(store().past.length).toBe(stepsBefore)
  })
})

describe('점 편집 상태', () => {
  it('처음에는 점 편집 중이 아니다', () => {
    expect(store().editingWarpLayerId).toBeNull()
  })

  it('점 편집에 들어가면 그 레이어만 골라진다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().beginWarpEditing(b.id)
    expect(store().editingWarpLayerId).toBe(b.id)
    expect(store().selectedLayerIds).toEqual([b.id])
  })

  it('같은 레이어를 다시 고르는 것은 편집 상태를 깨지 않는다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().beginWarpEditing(a.id)
    store().selectLayers([a.id])
    expect(store().editingWarpLayerId).toBe(a.id)
  })

  it('다른 레이어로 넘어가면 점 편집에서 빠져나온다', () => {
    const [a, b] = [fakeLayer('A'), fakeLayer('B')]
    store().addLayers([a, b])
    store().beginWarpEditing(a.id)
    store().selectLayers([b.id])
    expect(store().editingWarpLayerId).toBeNull()
  })

  it('나가면 골라 둔 점도 함께 비워진다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().beginWarpEditing(a.id)
    store().setWarpHandleSelection(['mesh-1', 'mesh-2'])
    store().endWarpEditing()
    expect(store().editingWarpLayerId).toBeNull()
    expect(store().selectedWarpHandles).toEqual([])
  })

  it('레이어를 지우면 점 편집도 끝난다', () => {
    const a = fakeLayer('A')
    store().addLayers([a])
    store().beginWarpEditing(a.id)
    store().removeLayers([a.id])
    expect(store().editingWarpLayerId).toBeNull()
  })
})
