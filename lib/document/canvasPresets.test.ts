import { describe, expect, it } from 'vitest'
import {
  CANVAS_PRESETS,
  matchesPreset,
  orientationOf,
  presetSize,
} from '@/lib/document/canvasPresets'

describe('CANVAS_PRESETS', () => {
  it('네 가지 비율을 순서대로 담고 있다', () => {
    expect(CANVAS_PRESETS.map((p) => p.id)).toEqual(['16:9', '4:5', '3:2', '1:1'])
  })

  it('모든 기본값은 긴 변이 짧은 변보다 작지 않다', () => {
    CANVAS_PRESETS.forEach((preset) => {
      expect(preset.long).toBeGreaterThanOrEqual(preset.short)
    })
  })
})

describe('orientationOf', () => {
  it('가로가 더 길면 가로형이다', () => {
    expect(orientationOf(1920, 1080)).toBe('landscape')
  })

  it('세로가 더 길면 세로형이다', () => {
    expect(orientationOf(1080, 1350)).toBe('portrait')
  })

  it('정사각형은 가로형으로 본다', () => {
    expect(orientationOf(1000, 1000)).toBe('landscape')
  })
})

describe('presetSize', () => {
  const find = (id: string) => CANVAS_PRESETS.find((p) => p.id === id)!

  it('가로형은 긴 변이 가로로 간다', () => {
    expect(presetSize(find('16:9'), 'landscape')).toEqual({ width: 1920, height: 1080 })
    expect(presetSize(find('3:2'), 'landscape')).toEqual({ width: 1200, height: 800 })
  })

  it('세로형은 긴 변이 세로로 간다', () => {
    expect(presetSize(find('16:9'), 'portrait')).toEqual({ width: 1080, height: 1920 })
    expect(presetSize(find('4:5'), 'portrait')).toEqual({ width: 1080, height: 1350 })
  })

  it('정사각형은 방향과 무관하게 같다', () => {
    expect(presetSize(find('1:1'), 'portrait')).toEqual({ width: 1000, height: 1000 })
    expect(presetSize(find('1:1'), 'landscape')).toEqual({ width: 1000, height: 1000 })
  })
})

describe('matchesPreset', () => {
  const find = (id: string) => CANVAS_PRESETS.find((p) => p.id === id)!

  it('지금 크기와 정확히 같으면 고른 것으로 본다', () => {
    expect(matchesPreset(find('4:5'), 'portrait', 1080, 1350)).toBe(true)
  })

  it('방향이 다르면 다른 것으로 본다', () => {
    expect(matchesPreset(find('4:5'), 'landscape', 1080, 1350)).toBe(false)
  })

  it('크기가 다르면 다른 것으로 본다', () => {
    expect(matchesPreset(find('3:2'), 'landscape', 1201, 800)).toBe(false)
  })
})
