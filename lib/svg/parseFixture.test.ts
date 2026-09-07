// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { boundsOfCommands, mergeBounds, type Bounds } from '@/lib/geometry/bbox'
import { flattenPath } from '@/lib/svg/flatten'
import { parseSvg } from '@/lib/svg/parse'

const source = readFileSync(
  path.join(__dirname, '__fixtures__', 'outlined-word.svg'),
  'utf-8'
)

describe('디자인 툴에서 내보낸 SVG 샘플', () => {
  const result = parseSvg(source)
  if (!result.ok) throw new Error(result.reason)
  const svg = result.svg

  it('아트보드 크기를 읽는다', () => {
    expect(svg.width).toBe(240)
    expect(svg.height).toBe(80)
  })

  it('clipPath와 defs 안의 도형은 세지 않고 실제 글자 세 덩어리만 가져온다', () => {
    expect(svg.shapes).toHaveLength(3)
  })

  it('그룹의 transform이 좌표에 반영된다', () => {
    expect(svg.shapes[0].commands[0]).toEqual({ type: 'M', x: 20, y: 10 })
  })

  it('구멍 있는 글자는 하위 경로 두 개로 나뉜다', () => {
    const subpaths = flattenPath(svg.shapes[1].commands, 0.1)
    expect(subpaths).toHaveLength(2)
    expect(svg.shapes[1].fillRule).toBe('evenodd')
  })

  it('색을 도형별로 보존한다', () => {
    expect(svg.shapes[0].fill).toBe('#111111')
    expect(svg.shapes[2].fill).toBe('#3f3fff')
  })

  it('전체 내용이 아트보드 안에 들어온다', () => {
    let bounds: Bounds | null = null
    svg.shapes.forEach((shape) => {
      bounds = mergeBounds(bounds, boundsOfCommands(shape.commands))
    })
    expect(bounds).not.toBeNull()
    const box = bounds as unknown as Bounds
    expect(box.minX).toBeGreaterThanOrEqual(0)
    expect(box.minY).toBeGreaterThanOrEqual(0)
    expect(box.maxX).toBeLessThanOrEqual(240)
    expect(box.maxY).toBeLessThanOrEqual(80)
  })
})
