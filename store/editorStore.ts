import { create } from 'zustand'
import type { CanvasSettings, EditorDocument, Layer, LayerTransform } from '@/lib/document/types'
import { sourceSize } from '@/lib/document/types'
import { contentBounds } from '@/lib/render/canvasBounds'
import { createWarp, type WarpState } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'

export const DEFAULT_CANVAS: CanvasSettings = { width: 1200, height: 800, background: '#ffffff' }

/** 새 레이어가 앞의 것과 정확히 겹쳐 보이지 않도록 어긋나게 두는 간격 */
const CASCADE_STEP = 24
/** 어긋난 레이어가 캔버스 밖으로 나가지 않도록 되돌아오는 주기 */
const CASCADE_WRAP = 8

/** 되돌리기로 거슬러 갈 수 있는 단계 수 */
export const HISTORY_LIMIT = 50

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
  /** 되돌리기용 이전 상태들 (뒤쪽이 가장 최근) */
  past: EditorDocument[]
  /** 되돌린 뒤 다시 갈 수 있는 상태들 */
  future: EditorDocument[]
  /** 드래그하는 동안에는 기록을 쌓지 않는다 */
  historyPaused: boolean
  /**
   * 왜곡 모드에서 골라 둔 조작점들. 여러 개를 골라 함께 옮길 때 쓴다.
   * 화면 조작을 위한 값이라 문서에 저장되거나 되돌리기에 쌓이지 않는다.
   */
  selectedWarpHandles: string[]

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
  setLetterSpacing: (id: string, spacing: number) => void
  setCanvasSize: (width: number, height: number) => void
  setCanvasBackground: (background: string | null) => void
  /** 보이는 레이어 전체에 맞춰 캔버스를 자른다 */
  fitCanvasToContent: (padding?: number) => void
  setZoom: (zoom: number) => void
  panBy: (dx: number, dy: number) => void
  setViewport: (viewport: Partial<Viewport>) => void
  setWarpHandleSelection: (handleIds: string[]) => void
  clearWarpHandleSelection: () => void

  /** 드래그 한 번을 되돌리기 한 단계로 묶는다 */
  beginGesture: () => void
  endGesture: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  /** 저장본에서 문서를 통째로 되살린다 (되돌리기 기록은 비운다) */
  replaceDocument: (document: EditorDocument) => void
}

function emptyDocument(): EditorDocument {
  return { canvas: { ...DEFAULT_CANVAS }, layers: [] }
}

/**
 * 문서를 바꾸면서 되돌리기 기록도 함께 남긴다.
 * 드래그 중에는 기록을 멈춰, 한 번의 조작이 한 단계로 묶이게 한다.
 */
function withHistory(state: EditorState, document: EditorDocument) {
  if (state.historyPaused) return { document }
  return {
    document,
    past: [...state.past, state.document].slice(-HISTORY_LIMIT),
    future: [],
  }
}

/** 특정 레이어만 바꾸는 흔한 형태를 한곳에 모은다 */
function mapLayer(
  state: EditorState,
  id: string,
  change: (layer: Layer) => Layer
): Partial<EditorState> {
  if (!state.document.layers.some((layer) => layer.id === id)) return {}
  return withHistory(state, {
    ...state.document,
    layers: state.document.layers.map((layer) => (layer.id === id ? change(layer) : layer)),
  })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: emptyDocument(),
  selectedLayerId: null,
  mode: 'transform',
  viewport: { zoom: 1, panX: 0, panY: 0 },
  past: [],
  future: [],
  historyPaused: false,
  selectedWarpHandles: [],

  reset: () =>
    set({
      document: emptyDocument(),
      selectedLayerId: null,
      mode: 'transform',
      viewport: { zoom: 1, panX: 0, panY: 0 },
      past: [],
      future: [],
      historyPaused: false,
      selectedWarpHandles: [],
    }),

  addLayers: (incoming) =>
    set((state) => {
      if (incoming.length === 0) return {}
      const { canvas, layers } = state.document

      const placed = incoming.map((layer, index) => {
        const order = layers.length + index
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

      return {
        ...withHistory(state, { ...state.document, layers: [...layers, ...placed] }),
        selectedLayerId: placed[placed.length - 1].id,
      }
    }),

  removeLayer: (id) =>
    set((state) => {
      const index = state.document.layers.findIndex((layer) => layer.id === id)
      if (index === -1) return {}

      const layers = state.document.layers.filter((layer) => layer.id !== id)
      // 지운 자리에 남는 이웃으로 선택을 넘겨 흐름이 끊기지 않게 한다
      const nextSelected =
        state.selectedLayerId === id
          ? (layers[index] ?? layers[index - 1] ?? null)?.id ?? null
          : state.selectedLayerId

      return {
        ...withHistory(state, { ...state.document, layers }),
        selectedLayerId: nextSelected,
        mode: nextSelected ? state.mode : 'transform',
        selectedWarpHandles: [],
      }
    }),

  selectLayer: (id) =>
    set((state) => ({
      selectedLayerId: id,
      mode: id ? state.mode : 'transform',
      selectedWarpHandles: [],
    })),

  setMode: (mode) => set({ mode, selectedWarpHandles: [] }),

  toggleLayerVisibility: (id) =>
    set((state) => mapLayer(state, id, (layer) => ({ ...layer, visible: !layer.visible }))),

  reorderLayer: (id, direction) =>
    set((state) => {
      const index = state.document.layers.findIndex((layer) => layer.id === id)
      if (index === -1) return {}

      // 배열 뒤쪽이 화면에서 위에 그려지므로 '위로'는 인덱스를 키우는 방향이다
      const target = direction === 'up' ? index + 1 : index - 1
      if (target < 0 || target >= state.document.layers.length) return {}

      const layers = [...state.document.layers]
      ;[layers[index], layers[target]] = [layers[target], layers[index]]
      return withHistory(state, { ...state.document, layers })
    }),

  updateTransform: (id, patch) =>
    set((state) =>
      mapLayer(state, id, (layer) => {
        const merged = { ...layer.transform, ...patch }
        return {
          ...layer,
          transform: {
            ...merged,
            scaleX: clampScale(merged.scaleX),
            scaleY: clampScale(merged.scaleY),
          },
        }
      })
    ),

  setWarpType: (id, type) =>
    set((state) => ({
      ...mapLayer(state, id, (layer) => ({ ...layer, warp: createWarp(type) })),
      // 효과가 바뀌면 조작점 자체가 달라지므로 골라 둔 것을 비운다
      selectedWarpHandles: [],
    })),

  updateWarpParams: (id, patch) =>
    set((state) =>
      mapLayer(state, id, (layer) => ({
        ...layer,
        warp: { ...layer.warp, params: { ...layer.warp.params, ...patch } } as WarpState,
      }))
    ),

  setLetterSpacing: (id, spacing) =>
    set((state) =>
      mapLayer(state, id, (layer) => ({
        ...layer,
        letterSpacing: Number.isFinite(spacing) ? spacing : 0,
      }))
    ),

  setCanvasSize: (width, height) =>
    set((state) =>
      withHistory(state, {
        ...state.document,
        canvas: {
          ...state.document.canvas,
          width: Math.max(1, Math.round(width)),
          height: Math.max(1, Math.round(height)),
        },
      })
    ),

  setCanvasBackground: (background) =>
    set((state) =>
      withHistory(state, {
        ...state.document,
        canvas: { ...state.document.canvas, background },
      })
    ),

  fitCanvasToContent: (padding = 0) =>
    set((state) => {
      const bounds = contentBounds(state.document)
      if (!bounds) return {}

      const offsetX = bounds.minX - padding
      const offsetY = bounds.minY - padding
      return withHistory(state, {
        canvas: {
          ...state.document.canvas,
          width: Math.max(1, Math.round(bounds.maxX - bounds.minX + padding * 2)),
          height: Math.max(1, Math.round(bounds.maxY - bounds.minY + padding * 2)),
        },
        // 캔버스를 옮긴 만큼 레이어도 함께 옮겨 화면에 보이던 그대로를 유지한다
        layers: state.document.layers.map((layer) => ({
          ...layer,
          transform: {
            ...layer.transform,
            x: layer.transform.x - offsetX,
            y: layer.transform.y - offsetY,
          },
        })),
      })
    }),

  setZoom: (zoom) =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) },
    })),

  panBy: (dx, dy) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: state.viewport.panX + dx,
        panY: state.viewport.panY + dy,
      },
    })),

  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),

  setWarpHandleSelection: (handleIds) => set({ selectedWarpHandles: handleIds }),

  clearWarpHandleSelection: () =>
    set((state) => (state.selectedWarpHandles.length === 0 ? {} : { selectedWarpHandles: [] })),

  beginGesture: () =>
    set((state) => {
      if (state.historyPaused) return {}
      return {
        historyPaused: true,
        past: [...state.past, state.document].slice(-HISTORY_LIMIT),
        future: [],
      }
    }),

  endGesture: () => set({ historyPaused: false }),

  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1]
      if (!previous) return {}
      return {
        document: previous,
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future],
      }
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0]
      if (!next) return {}
      return {
        document: next,
        past: [...state.past, state.document],
        future: state.future.slice(1),
      }
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  replaceDocument: (document) =>
    set({
      document,
      past: [],
      future: [],
      historyPaused: false,
      selectedLayerId: null,
      mode: 'transform',
      selectedWarpHandles: [],
    }),
}))
