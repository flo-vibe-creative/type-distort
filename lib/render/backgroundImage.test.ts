import { describe, expect, it } from 'vitest'
import { backgroundImageRect } from '@/lib/render/backgroundImage'

const canvas = { width: 1200, height: 800 }
// 캔버스보다 납작한 이미지 — 채우기로 넣으면 좌우가 넘친다
const wide = { width: 2000, height: 1000 }
const center = { x: 0.5, y: 0.5 }

describe('채우기', () => {
  it('짧은 쪽에 맞춰 키워 캔버스를 완전히 덮는다', () => {
    const rect = backgroundImageRect(canvas, wide, 'cover', center)
    expect(rect.width).toBeGreaterThanOrEqual(canvas.width)
    expect(rect.height).toBeGreaterThanOrEqual(canvas.height)
    // 세로가 짧은 쪽이므로 세로가 딱 맞는다
    expect(rect.height).toBeCloseTo(800, 6)
    expect(rect.width).toBeCloseTo(1600, 6)
  })

  it('가운데면 넘치는 양이 좌우로 똑같이 나뉜다', () => {
    const rect = backgroundImageRect(canvas, wide, 'cover', center)
    expect(rect.x).toBeCloseTo(-200, 6)
    expect(rect.y).toBeCloseTo(0, 6)
  })

  it('0%면 왼쪽·위에 붙고, 100%면 오른쪽·아래에 붙는다', () => {
    expect(backgroundImageRect(canvas, wide, 'cover', { x: 0, y: 0 }).x).toBeCloseTo(0, 6)
    expect(backgroundImageRect(canvas, wide, 'cover', { x: 1, y: 0 }).x).toBeCloseTo(-400, 6)
  })

  it('위치를 어디에 두든 여백이 생기지 않는다', () => {
    for (const image of [wide, { width: 800, height: 2000 }, { width: 1200, height: 800 }]) {
      for (const x of [0, 0.25, 0.5, 0.75, 1]) {
        for (const y of [0, 0.5, 1]) {
          const rect = backgroundImageRect(canvas, image, 'cover', { x, y })
          expect(rect.x).toBeLessThanOrEqual(1e-9)
          expect(rect.y).toBeLessThanOrEqual(1e-9)
          expect(rect.x + rect.width).toBeGreaterThanOrEqual(canvas.width - 1e-9)
          expect(rect.y + rect.height).toBeGreaterThanOrEqual(canvas.height - 1e-9)
        }
      }
    }
  })

  it('범위를 벗어난 위치 값은 0~1 안으로 당겨온다', () => {
    const left = backgroundImageRect(canvas, wide, 'cover', { x: -5, y: 0 })
    expect(left.x).toBeCloseTo(0, 6)
    const right = backgroundImageRect(canvas, wide, 'cover', { x: 5, y: 0 })
    expect(right.x).toBeCloseTo(-400, 6)
  })
})

describe('맞추기', () => {
  it('긴 쪽에 맞춰 줄여 전체가 보이고, 가운데에 놓인다', () => {
    const rect = backgroundImageRect(canvas, wide, 'contain', { x: 0, y: 0 })
    expect(rect.width).toBeCloseTo(1200, 6)
    expect(rect.height).toBeCloseTo(600, 6)
    // 위치 값과 무관하게 가운데 — 맞추기는 여백이 생기는 방식이라 위치를 두지 않는다
    expect(rect.x).toBeCloseTo(0, 6)
    expect(rect.y).toBeCloseTo(100, 6)
  })
})

describe('늘이기', () => {
  it('비율을 무시하고 캔버스에 정확히 맞춘다', () => {
    expect(backgroundImageRect(canvas, wide, 'stretch', center)).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    })
  })
})

describe('알 수 없는 크기', () => {
  it('이미지 크기를 모르면 캔버스에 그대로 맞춘다', () => {
    expect(backgroundImageRect(canvas, { width: 0, height: 0 }, 'cover', center)).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    })
  })
})
