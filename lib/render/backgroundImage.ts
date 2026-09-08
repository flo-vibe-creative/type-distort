import type { CanvasImageFit } from '@/lib/document/types'

export interface Size {
  width: number
  height: number
}

/** 배경 이미지를 그릴 자리 (캔버스 왼쪽 위 기준) */
export interface ImageRect {
  x: number
  y: number
  width: number
  height: number
}

/** 0~1 사이의 위치. 0이면 왼쪽·위에, 1이면 오른쪽·아래에 붙는다. */
export interface ImagePosition {
  x: number
  y: number
}

export const CENTER_POSITION: ImagePosition = { x: 0.5, y: 0.5 }

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/**
 * 배경 이미지를 캔버스 어디에 얼마만 한 크기로 그릴지 구한다.
 *
 * `채우기`는 짧은 쪽에 맞춰 키우므로 넘치는 쪽이 생기는데, 그 넘치는 양 안에서만
 * 위치를 옮긴다. 그래서 위치를 어디에 두든 여백이 생기지 않는다.
 * `맞추기`는 여백이 생기는 방식이라 위치를 두지 않고 가운데에 놓는다.
 */
export function backgroundImageRect(
  canvas: Size,
  image: Size,
  fit: CanvasImageFit,
  position: ImagePosition
): ImageRect {
  const full = { x: 0, y: 0, width: canvas.width, height: canvas.height }
  if (image.width <= 0 || image.height <= 0) return full
  if (fit === 'stretch') return full

  const scale =
    fit === 'cover'
      ? Math.max(canvas.width / image.width, canvas.height / image.height)
      : Math.min(canvas.width / image.width, canvas.height / image.height)

  const width = image.width * scale
  const height = image.height * scale
  const spareX = canvas.width - width
  const spareY = canvas.height - height

  if (fit === 'contain') {
    return { x: spareX / 2, y: spareY / 2, width, height }
  }
  return { x: spareX * clamp01(position.x), y: spareY * clamp01(position.y), width, height }
}
