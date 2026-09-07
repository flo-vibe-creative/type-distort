import { create } from 'zustand'
import type {
  CanvasSettings,
  EditorDocument,
  Layer,
  LayerTransform,
} from '@/lib/document/types'
import { sourceSize } from '@/lib/document/types'
import { createWarp, type WarpState } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'

export const DEFAULT_CANVAS: CanvasSettings = { width: 1200, height: 800, background: '#ffffff' }

/** 새 레이어가 앞의 것과 정확히 겹쳐 보이지 않도록 어긋나게 두는 간격 */
const CASCADE_STEP = 24
/** 어긋난 레이어가 캔버스 밖으로 나가지 않도록 되돌아오는 주기 */
const CASCADE_WRAP = 8

export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 64
/** 크기를 0으로 만들면 형태가 사라져 되돌릴 수 없으므로 최소값을 둔다 */
export const MIN_SCALE = 0.01

export type EditorMode = 'transform' | 'warp'

/** 부호(뒤집기)는 유지하면서 크기가 0이 되지 않게 막는다 */
function clampScale(value: number): number {
  if (!Number.isFinite(value) || value === 0) return MIN_SCALE
  const sign = value < 0 ? -1 : 1
  return sign * Math.max(MIN_SCALE, Math.abs(value))
}

export interface Viewport {
  zoom: number
  panX: number
  panY: number
}

interface EditorState {
  document: EditorDocument
  selectedLayerId: string | null
  mode: EditorMode
  viewport: Viewport

  reset: () => void
  addLayers: (layers: Layer[]) => void
  removeLayer: (id: string) => void
  selectLayer: (id: string | null) => void
  setMode: (mode: EditorMode) => void
  toggleLayerVisibility: (id: string) => void
  reorderLayer: (id: string, direction: 'up' | 'down') => void
  updateTransform: (id: string, patch: Partial<LayerTransform>) => void
  setWarpType: (id: string, type: WarpType) => void
  updateWarpParams: (id: string, patch: Record<string, unknown>) => void
  setCanvasSize: (width: number, height: number) => void
  setCanvasBackground: (background: string | null) => void
  setZoom: (zoom: number) => void
  panBy: (dx: number, dy: number) => void
  setViewport: (viewport: Partial<Viewport>) => void
}

function emptyDocument(): EditorDocument {
  return { canvas: { ...DEFAULT_CANVAS }, layers: [] }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: emptyDocument(),
  selectedLayerId: null,
  mode: 'transform',
  viewport: { zoom: 1, panX: 0, panY: 0 },

  reset: () =>
    set({
      document: emptyDocument(),
      selectedLayerId: null,
      mode: 'transform',
      viewport: { zoom: 1, panX: 0, panY: 0 },
    }),

  addLayers: (incoming) => {
    if (incoming.length === 0) return
    const { document } = get()
    const { canvas } = document

    const placed = incoming.map((layer, index) => {
      const order = document.layers.length + index
      const offset = (order % CASCADE_WRAP) * CASCADE_STEP
      const size = sourceSize(layer.source)
      return {
        ...layer,
        transform: {
          ...layer.transform,
          x: Math.round((canvas.width - size.width) / 2) + offset,
          y: Math.round((canvas.height - size.height) / 2) + offset,
        },
      }
    })

    set({
      document: { ...document, layers: [...document.layers, ...placed] },
      selectedLayerId: placed[placed.length - 1].id,
    })
  },

  removeLayer: (id) => {
    const { document, selectedLayerId } = get()
    const index = document.layers.findIndex((layer) => layer.id === id)
    if (index === -1) return

    const layers = document.layers.filter((layer) => layer.id !== id)
    // 지운 자리에 남는 이웃으로 선택을 넘겨 흐름이 끊기지 않게 한다
    const nextSelected =
      selectedLayerId === id ? (layers[index] ?? layers[index - 1] ?? null)?.id ?? null : selectedLayerId

    set({
      document: { ...document, layers },
      selectedLayerId: nextSelected,
      mode: nextSelected ? get().mode : 'transform',
    })
  },

  selectLayer: (id) => set({ selectedLayerId: id, mode: id ? get().mode : 'transform' }),

  setMode: (mode) => set({ mode }),

  toggleLayerVisibility: (id) =>
    set((state) => ({
      document: {
        ...state.document,
        layers: state.document.layers.map((layer) =>
          layer.id === id ? { ...layer, visible: !layer.visible } : layer
        ),
      },
    })),

  reorderLayer: (id, direction) => {
    const { document } = get()
    const index = document.layers.findIndex((layer) => layer.id === id)
    if (index === -1) return

    // 배열 뒤쪽이 화면에서 위에 그려지므로 '위로'는 인덱스를 키우는 방향이다
    const target = direction === 'up' ? index + 1 : index - 1
    if (target < 0 || target >= document.layers.length) return

    const layers = [...document.layers]
    ;[layers[index], layers[target]] = [layers[target], layers[index]]
    set({ document: { ...document, layers } })
  },

  updateTransform: (id, patch) =>
    set((state) => {
      if (!state.document.layers.some((layer) => layer.id === id)) return state
      return {
        document: {
          ...state.document,
          layers: state.document.layers.map((layer) => {
            if (layer.id !== id) return layer
            const merged = { ...layer.transform, ...patch }
            // 확대율이 0이 되면 모양이 사라져 되돌릴 수 없으므로 최소값을 지킨다 (뒤집기는 허용)
            return {
              ...layer,
              transform: {
                ...merged,
                scaleX: clampScale(merged.scaleX),
                scaleY: clampScale(merged.scaleY),
              },
            }
          }),
        },
      }
    }),

  setWarpType: (id, type) =>
    set((state) => {
      if (!state.document.layers.some((layer) => layer.id === id)) return state
      return {
        document: {
          ...state.document,
          layers: state.document.layers.map((layer) =>
            layer.id === id ? { ...layer, warp: createWarp(type) } : layer
          ),
        },
      }
    }),

  updateWarpParams: (id, patch) =>
    set((state) => {
      if (!state.document.layers.some((layer) => layer.id === id)) return state
      return {
        document: {
          ...state.document,
          layers: state.document.layers.map((layer) => {
            if (layer.id !== id) return layer
            const warp = {
              ...layer.warp,
              params: { ...layer.warp.params, ...patch },
            } as WarpState
            return { ...layer, warp }
          }),
        },
      }
    }),

  setCanvasSize: (width, height) =>
    set((state) => ({
      document: {
        ...state.document,
        canvas: {
          ...state.document.canvas,
          width: Math.max(1, Math.round(width)),
          height: Math.max(1, Math.round(height)),
        },
      },
    })),

  setCanvasBackground: (background) =>
    set((state) => ({
      document: { ...state.document, canvas: { ...state.document.canvas, background } },
    })),

  setZoom: (zoom) =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) },
    })),

  panBy: (dx, dy) =>
    set((state) => ({
      viewport: { ...state.viewport, panX: state.viewport.panX + dx, panY: state.viewport.panY + dy },
    })),

  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
}))
