import { describe, expect, it } from 'vitest'
import {
  MAX_TEXTURE_SIZE,
  fitWithinLimit,
  isSupportedImageType,
  supportedImportLabel,
} from '@/lib/raster/loadImage'

describe('fitWithinLimit', () => {
  it('한계보다 작으면 그대로 둔다', () => {
    expect(fitWithinLimit(800, 600, 4096)).toEqual({ width: 800, height: 600, scaledDown: false })
  })

  it('긴 변이 한계를 넘으면 비율을 유지하며 줄인다', () => {
    const fitted = fitWithinLimit(8000, 4000, 4096)
    expect(fitted.scaledDown).toBe(true)
    expect(fitted.width).toBe(4096)
    expect(fitted.height).toBe(2048)
  })

  it('세로가 더 길어도 긴 변을 기준으로 줄인다', () => {
    const fitted = fitWithinLimit(1000, 10000, 4096)
    expect(fitted.height).toBe(4096)
    expect(fitted.width).toBe(410)
  })

  it('줄인 뒤에도 최소 1px은 남는다', () => {
    const fitted = fitWithinLimit(10000, 1, 4096)
    expect(fitted.height).toBe(1)
  })

  it('기본 한계는 그래픽 카드 텍스처 한계인 4096이다', () => {
    expect(MAX_TEXTURE_SIZE).toBe(4096)
  })
})

describe('isSupportedImageType', () => {
  it('PNG와 JPEG를 받는다', () => {
    expect(isSupportedImageType('image/png', 'a.png')).toBe(true)
    expect(isSupportedImageType('image/jpeg', 'a.jpg')).toBe(true)
  })

  it('형식 정보가 비어 있으면 확장자로 판단한다', () => {
    expect(isSupportedImageType('', 'photo.JPEG')).toBe(true)
    expect(isSupportedImageType('', 'photo.webp')).toBe(false)
  })

  it('그 외 형식은 받지 않는다', () => {
    expect(isSupportedImageType('image/gif', 'a.gif')).toBe(false)
    expect(isSupportedImageType('application/pdf', 'a.pdf')).toBe(false)
  })

  it('SVG는 벡터 경로로 따로 처리하므로 이미지로는 받지 않는다', () => {
    expect(isSupportedImageType('image/svg+xml', 'a.svg')).toBe(false)
  })

  it('안내 문구에 지원 형식이 모두 적혀 있다', () => {
    expect(supportedImportLabel).toContain('SVG')
    expect(supportedImportLabel).toContain('PNG')
    expect(supportedImportLabel).toContain('JPEG')
  })
})
