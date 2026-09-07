// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createVectorLayer, layerNameFromFileName } from '@/lib/document/createLayer'
import { sourceSize } from '@/lib/document/types'
import { parseSvg } from '@/lib/svg/parse'

function parse(source: string) {
  const result = parseSvg(source)
  if (!result.ok) throw new Error(result.reason)
  return result.svg
}

describe('layerNameFromFileName', () => {
  it('확장자를 떼어낸다', () => {
    expect(layerNameFromFileName('WOW.svg')).toBe('WOW')
    expect(layerNameFromFileName('my.logo.png')).toBe('my.logo')
  })

  it('이름이 없으면 기본 이름을 쓴다', () => {
    expect(layerNameFromFileName('')).toBe('레이어')
    expect(layerNameFromFileName('.svg')).toBe('레이어')
  })
})

describe('createVectorLayer', () => {
  const svg = parse('<svg viewBox="0 0 200 100"><rect x="20" y="10" width="60" height="30"/></svg>')

  it('내용이 실제로 차지하는 범위를 왜곡 기준 영역으로 잡는다', () => {
    const layer = createVectorLayer(svg, 'WOW.svg')
    expect(layer.source.kind).toBe('vector')
    expect(sourceSize(layer.source)).toEqual({ width: 60, height: 30 })
  })

  it('배치는 스토어가 정하므로 원점에서 시작한다', () => {
    const layer = createVectorLayer(svg, 'WOW.svg')
    expect(layer.transform).toEqual({ x: 0, y: 0, scale: 1, rotation: 0 })
  })

  it('처음에는 왜곡이 걸려 있지 않다', () => {
    const layer = createVectorLayer(svg, 'WOW.svg')
    expect(layer.warp.type).toBe('arc')
    expect(layer.visible).toBe(true)
  })

  it('레이어마다 서로 다른 id를 준다', () => {
    const a = createVectorLayer(svg, 'a.svg')
    const b = createVectorLayer(svg, 'b.svg')
    expect(a.id).not.toBe(b.id)
  })
})
