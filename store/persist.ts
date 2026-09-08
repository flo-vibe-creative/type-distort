import type {
  CanvasImageFit,
  CanvasSettings,
  EditorDocument,
  Layer,
  LayerTransform,
} from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { getImage, keepOnlyImages, putImage } from '@/lib/storage/idb'
import type { VectorShape } from '@/lib/svg/parse'
import { WARP_TYPES, createWarp, type WarpState } from '@/lib/warp/registry'
import type { WarpType } from '@/lib/warp/types'

/** 저장본 형식이 바뀌면 올린다 — 예전 형식은 조용히 버리고 빈 문서로 시작한다 */
const STORAGE_VERSION = 1
const STORAGE_KEY = 'type-distort:document'
/** 배경 이미지는 레이어와 겹치지 않는 이름으로 따로 보관한다 */
const CANVAS_IMAGE_KEY = 'canvas:background'
/** 이 시간 동안 더 바뀌지 않으면 저장한다 (조작 중 매번 쓰지 않도록) */
const SAVE_DELAY_MS = 600

type StoredSource =
  | { kind: 'vector'; shapes: VectorShape[]; bounds: Bounds }
  | { kind: 'raster'; width: number; height: number; scaledDown: boolean; imageKey: string }

interface StoredLayer {
  id: string
  name: string
  visible: boolean
  transform: LayerTransform
  warp: WarpState
  /** 예전 저장본에는 없을 수 있어 되살릴 때 기본값으로 채운다 */
  letterSpacing?: number
  fillOverride?: string | null
  source: StoredSource
}

interface StoredCanvas {
  width: number
  height: number
  background: string
  imageFit?: CanvasImageFit
  backgroundHidden?: boolean
  image?: { width: number; height: number; key: string } | null
}

export interface StoredDocument {
  version: number
  canvas: StoredCanvas
  layers: StoredLayer[]
}

/** 되살릴 때 넘겨주는 이미지들 */
export type RestoredImages = Record<string, { bitmap: ImageBitmap; blob: Blob }>

/** 문서를 저장할 수 있는 형태로 바꾼다 (그림 자체는 따로 보관한다) */
export function serializeDocument(document: EditorDocument): StoredDocument {
  return {
    version: STORAGE_VERSION,
    canvas: {
      width: document.canvas.width,
      height: document.canvas.height,
      background: document.canvas.background,
      imageFit: document.canvas.imageFit,
      backgroundHidden: document.canvas.backgroundHidden,
      image: document.canvas.image
        ? {
            width: document.canvas.image.width,
            height: document.canvas.image.height,
            key: CANVAS_IMAGE_KEY,
          }
        : null,
    },
    layers: document.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      transform: layer.transform,
      warp: layer.warp,
      letterSpacing: layer.letterSpacing,
      fillOverride: layer.fillOverride,
      source:
        layer.source.kind === 'vector'
          ? { kind: 'vector', shapes: layer.source.shapes, bounds: layer.source.bounds }
          : {
              kind: 'raster',
              width: layer.source.width,
              height: layer.source.height,
              scaledDown: layer.source.scaledDown,
              imageKey: layer.id,
            },
    })),
  }
}

function isValidTransform(value: unknown): value is LayerTransform {
  const transform = value as LayerTransform | undefined
  return (
    !!transform &&
    ['x', 'y', 'scaleX', 'scaleY', 'rotation'].every((key) =>
      Number.isFinite((transform as unknown as Record<string, number>)[key])
    )
  )
}

function isValidWarp(value: unknown): value is WarpState {
  const warp = value as WarpState | undefined
  return !!warp && WARP_TYPES.includes(warp.type as WarpType) && typeof warp.params === 'object'
}

function restoreLayer(stored: StoredLayer, images: RestoredImages): Layer | null {
  if (!stored || typeof stored.id !== 'string' || !stored.source) return null
  if (!isValidTransform(stored.transform)) return null
  const warp = isValidWarp(stored.warp) ? stored.warp : createWarp('arc')

  const base = {
    id: stored.id,
    name: typeof stored.name === 'string' ? stored.name : '레이어',
    visible: stored.visible !== false,
    transform: stored.transform,
    warp,
    letterSpacing: Number.isFinite(stored.letterSpacing) ? (stored.letterSpacing as number) : 0,
    fillOverride: typeof stored.fillOverride === 'string' ? stored.fillOverride : null,
  }

  if (stored.source.kind === 'vector') {
    if (!Array.isArray(stored.source.shapes) || !stored.source.bounds) return null
    return {
      ...base,
      source: { kind: 'vector', shapes: stored.source.shapes, bounds: stored.source.bounds },
    }
  }

  // 그림을 되살리지 못한 이미지 레이어는 빈 자리로 남기느니 빼는 편이 낫다
  const image = images[stored.source.imageKey]
  if (!image) return null
  return {
    ...base,
    source: {
      kind: 'raster',
      bitmap: image.bitmap,
      blob: image.blob,
      width: stored.source.width,
      height: stored.source.height,
      scaledDown: stored.source.scaledDown === true,
    },
  }
}

/** 저장본을 문서로 되살린다. 알아볼 수 없으면 null. */
export function deserializeDocument(
  stored: StoredDocument | null,
  images: RestoredImages
): EditorDocument | null {
  if (!stored || stored.version !== STORAGE_VERSION) return null
  if (!stored.canvas || !Array.isArray(stored.layers)) return null

  const layers = stored.layers
    .map((layer) => restoreLayer(layer, images))
    .filter((layer): layer is Layer => layer !== null)

  const storedImage = stored.canvas.image
  const restoredImage = storedImage ? images[storedImage.key] : undefined
  const canvas: CanvasSettings = {
    width: stored.canvas.width,
    height: stored.canvas.height,
    background: stored.canvas.background ?? '#ffffff',
    imageFit: stored.canvas.imageFit ?? 'cover',
    backgroundHidden: stored.canvas.backgroundHidden === true,
    image:
      storedImage && restoredImage
        ? {
            bitmap: restoredImage.bitmap,
            blob: restoredImage.blob,
            width: storedImage.width,
            height: storedImage.height,
          }
        : null,
  }

  return { canvas, layers }
}

let saveTimer: number | null = null

/** 잠시 뒤에 저장한다. 그 사이에 또 바뀌면 마지막 상태만 저장된다. */
export function saveDocumentSoon(document: EditorDocument): void {
  if (typeof window === 'undefined') return
  if (saveTimer !== null) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void saveDocument(document)
  }, SAVE_DELAY_MS)
}

async function saveDocument(document: EditorDocument): Promise<void> {
  try {
    const stored = serializeDocument(document)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const imageKeys: string[] = []
    for (const layer of document.layers) {
      if (layer.source.kind !== 'raster') continue
      imageKeys.push(layer.id)
      await putImage(layer.id, layer.source.blob)
    }
    if (document.canvas.image) {
      imageKeys.push(CANVAS_IMAGE_KEY)
      await putImage(CANVAS_IMAGE_KEY, document.canvas.image.blob)
    }
    await keepOnlyImages(imageKeys)
  } catch {
    // 저장 공간이 막혀 있어도 작업은 이어져야 한다
  }
}

/** 저장해 둔 문서를 되살린다. 없거나 망가졌으면 null. */
export async function restoreDocument(): Promise<EditorDocument | null> {
  if (typeof window === 'undefined') return null

  let stored: StoredDocument | null = null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    stored = raw ? (JSON.parse(raw) as StoredDocument) : null
  } catch {
    return null
  }
  if (!stored || !Array.isArray(stored.layers)) return null

  const images: RestoredImages = {}
  const wanted = stored.layers
    .filter((layer) => layer?.source?.kind === 'raster')
    .map((layer) => (layer.source as { imageKey: string }).imageKey)
  if (stored.canvas?.image?.key) wanted.push(stored.canvas.image.key)

  for (const key of wanted) {
    const blob = await getImage(key)
    if (!blob) continue
    try {
      images[key] = { bitmap: await createImageBitmap(blob), blob }
    } catch {
      // 되살리지 못한 그림은 건너뛴다
    }
  }

  return deserializeDocument(stored, images)
}

/** 저장해 둔 작업을 지운다 */
export function clearSavedDocument(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 무시
  }
  void keepOnlyImages([])
}
