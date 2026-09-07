/**
 * 이미지 파일을 화면에 그릴 수 있는 형태로 불러온다.
 *
 * 그래픽 카드가 다룰 수 있는 텍스처 크기에 한계가 있어,
 * 그보다 큰 이미지는 비율을 유지하며 자동으로 줄인다.
 */

/** 대부분의 기기에서 안전하게 다룰 수 있는 텍스처 한 변의 최대 크기 */
export const MAX_TEXTURE_SIZE = 4096

export const supportedImportLabel = 'SVG, PNG, JPEG'

const SUPPORTED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg']

export interface FittedSize {
  width: number
  height: number
  /** 한계를 넘어 줄였는지 (사용자에게 알려주기 위함) */
  scaledDown: boolean
}

export function fitWithinLimit(width: number, height: number, limit: number): FittedSize {
  const longest = Math.max(width, height)
  if (longest <= limit) {
    return { width, height, scaledDown: false }
  }
  const ratio = limit / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaledDown: true,
  }
}

export function isSupportedImageType(mimeType: string, fileName: string): boolean {
  if (mimeType) return SUPPORTED_MIME.has(mimeType.toLowerCase())
  const lower = fileName.toLowerCase()
  return SUPPORTED_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

export interface RasterSource {
  bitmap: ImageBitmap
  width: number
  height: number
  scaledDown: boolean
  /** 새로고침 후 되살리기 위해 들고 있는 원본 파일 */
  blob: Blob
}

export type ImageLoadResult =
  | { ok: true; image: RasterSource }
  | { ok: false; reason: string; hint: string }

export async function loadRasterFile(file: File): Promise<ImageLoadResult> {
  return loadRasterBlob(file, file.name, file.type)
}

/** 파일이든 저장해 둔 원본이든 같은 경로로 불러온다 */
export async function loadRasterBlob(
  file: Blob,
  fileName: string,
  mimeType: string
): Promise<ImageLoadResult> {
  if (!isSupportedImageType(mimeType, fileName)) {
    return {
      ok: false,
      reason: `${fileName}은(는) 가져올 수 없는 형식입니다.`,
      hint: `${supportedImportLabel} 파일만 가져올 수 있습니다.`,
    }
  }

  let original: ImageBitmap
  try {
    original = await createImageBitmap(file)
  } catch {
    return {
      ok: false,
      reason: `${fileName}을(를) 열 수 없습니다. 파일이 손상되었을 수 있습니다.`,
      hint: '다른 이미지로 시도하거나, 이미지 편집 프로그램에서 다시 저장한 뒤 가져와 주세요.',
    }
  }

  const fitted = fitWithinLimit(original.width, original.height, MAX_TEXTURE_SIZE)
  if (!fitted.scaledDown) {
    return {
      ok: true,
      image: {
        bitmap: original,
        width: fitted.width,
        height: fitted.height,
        scaledDown: false,
        blob: file,
      },
    }
  }

  // 한계를 넘는 이미지는 줄여서 다시 만들고 원본은 즉시 놓아준다
  const resized = await createImageBitmap(original, {
    resizeWidth: fitted.width,
    resizeHeight: fitted.height,
    resizeQuality: 'high',
  })
  original.close()

  return {
    ok: true,
    image: {
      bitmap: resized,
      width: fitted.width,
      height: fitted.height,
      scaledDown: true,
      blob: file,
    },
  }
}
