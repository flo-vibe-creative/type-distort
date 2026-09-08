/** 대지를 세워 쓸지 눕혀 쓸지 */
export type CanvasOrientation = 'landscape' | 'portrait'

/**
 * 자주 쓰는 대지 비율.
 * 긴 변과 짧은 변으로 적어 두고, 방향에 따라 가로세로 중 어느 쪽이 길어질지 정한다.
 */
export interface CanvasPreset {
  id: string
  long: number
  short: number
}

export const CANVAS_PRESETS: readonly CanvasPreset[] = [
  { id: '16:9', long: 1920, short: 1080 },
  { id: '4:5', long: 1350, short: 1080 },
  { id: '3:2', long: 1200, short: 800 },
  { id: '1:1', long: 1000, short: 1000 },
]

/** 지금 크기가 눕혀진 것인지 세워진 것인지 (정사각형은 가로형으로 본다) */
export function orientationOf(width: number, height: number): CanvasOrientation {
  return width >= height ? 'landscape' : 'portrait'
}

/** 이 비율을 그 방향으로 적용했을 때의 크기 */
export function presetSize(
  preset: CanvasPreset,
  orientation: CanvasOrientation
): { width: number; height: number } {
  return orientation === 'landscape'
    ? { width: preset.long, height: preset.short }
    : { width: preset.short, height: preset.long }
}

/** 지금 대지가 이 비율·방향으로 맞춰져 있는지 */
export function matchesPreset(
  preset: CanvasPreset,
  orientation: CanvasOrientation,
  width: number,
  height: number
): boolean {
  const size = presetSize(preset, orientation)
  return size.width === width && size.height === height
}
