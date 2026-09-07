// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseSvg } from '@/lib/svg/parse'

function ok(source: string) {
  const result = parseSvg(source)
  if (!result.ok) throw new Error(`파싱 실패: ${result.reason}`)
  return result.svg
}

describe('parseSvg — 크기', () => {
  it('viewBox에서 크기를 읽는다', () => {
    const svg = ok('<svg viewBox="0 0 200 100"><path d="M0 0L1 1"/></svg>')
    expect(svg.width).toBe(200)
    expect(svg.height).toBe(100)
  })

  it('viewBox의 시작점이 0이 아니면 원점으로 당겨온다', () => {
    const svg = ok('<svg viewBox="10 20 200 100"><path d="M10 20L11 21"/></svg>')
    expect(svg.shapes[0].commands[0]).toEqual({ type: 'M', x: 0, y: 0 })
  })

  it('viewBox가 없으면 width/height 속성을 쓴다', () => {
    const svg = ok('<svg width="80" height="40"><path d="M0 0L1 1"/></svg>')
    expect(svg.width).toBe(80)
    expect(svg.height).toBe(40)
  })

  it('px 단위가 붙은 크기도 읽는다', () => {
    const svg = ok('<svg width="80px" height="40px"><path d="M0 0L1 1"/></svg>')
    expect(svg.width).toBe(80)
  })
})

describe('parseSvg — 도형', () => {
  it('rect를 닫힌 사각형 경로로 바꾼다', () => {
    const svg = ok('<svg viewBox="0 0 100 100"><rect x="10" y="20" width="30" height="40"/></svg>')
    const commands = svg.shapes[0].commands
    expect(commands[0]).toEqual({ type: 'M', x: 10, y: 20 })
    expect(commands).toContainEqual({ type: 'L', x: 40, y: 20 })
    expect(commands).toContainEqual({ type: 'L', x: 40, y: 60 })
    expect(commands.at(-1)).toEqual({ type: 'Z' })
  })

  it('circle을 곡선 경로로 바꾸고 시작점으로 되돌아온다', () => {
    const svg = ok('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="10"/></svg>')
    const commands = svg.shapes[0].commands
    expect(commands[0]).toEqual({ type: 'M', x: 60, y: 50 })
    expect(commands.some((c) => c.type === 'C')).toBe(true)
  })

  it('polygon은 닫히고 polyline은 열린다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><polygon points="0,0 10,0 10,10"/><polyline points="0,0 5,5"/></svg>'
    )
    expect(svg.shapes[0].commands.at(-1)).toEqual({ type: 'Z' })
    expect(svg.shapes[1].commands.at(-1)).not.toEqual({ type: 'Z' })
  })

  it('line을 직선 경로로 바꾼다', () => {
    const svg = ok('<svg viewBox="0 0 100 100"><line x1="1" y1="2" x2="3" y2="4"/></svg>')
    expect(svg.shapes[0].commands).toEqual([
      { type: 'M', x: 1, y: 2 },
      { type: 'L', x: 3, y: 4 },
    ])
  })
})

describe('parseSvg — 그룹과 변형', () => {
  it('중첩된 g의 transform을 모두 곱해 좌표에 적용한다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><g transform="translate(10 0)"><g transform="scale(2)"><path d="M 1 1 L 2 2"/></g></g></svg>'
    )
    expect(svg.shapes[0].commands).toEqual([
      { type: 'M', x: 12, y: 2 },
      { type: 'L', x: 14, y: 4 },
    ])
  })

  it('곡선의 제어점에도 변형을 적용한다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><path transform="translate(5 5)" d="M 0 0 C 1 1 2 2 3 3"/></svg>'
    )
    expect(svg.shapes[0].commands[1]).toEqual({
      type: 'C',
      x1: 6,
      y1: 6,
      x2: 7,
      y2: 7,
      x: 8,
      y: 8,
    })
  })
})

describe('parseSvg — 색과 속성', () => {
  it('채우기 색을 보존하고, 없으면 검정으로 본다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><path fill="#ff0000" d="M0 0L1 1"/><path d="M0 0L1 1"/></svg>'
    )
    expect(svg.shapes[0].fill).toBe('#ff0000')
    expect(svg.shapes[1].fill).toBe('#000000')
  })

  it('부모 g의 채우기 색을 물려받는다', () => {
    const svg = ok('<svg viewBox="0 0 100 100"><g fill="#00ff00"><path d="M0 0L1 1"/></g></svg>')
    expect(svg.shapes[0].fill).toBe('#00ff00')
  })

  it('style 속성이 presentation 속성보다 우선한다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><path fill="#ff0000" style="fill:#0000ff" d="M0 0L1 1"/></svg>'
    )
    expect(svg.shapes[0].fill).toBe('#0000ff')
  })

  it('fill-rule과 투명도를 읽는다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><path fill-rule="evenodd" opacity="0.5" d="M0 0L1 1"/></svg>'
    )
    expect(svg.shapes[0].fillRule).toBe('evenodd')
    expect(svg.shapes[0].opacity).toBe(0.5)
  })

  it('fill="none"인 도형은 그릴 것이 없어 제외한다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><path fill="none" d="M0 0L1 1"/><path d="M2 2L3 3"/></svg>'
    )
    expect(svg.shapes).toHaveLength(1)
    expect(svg.shapes[0].commands[0]).toEqual({ type: 'M', x: 2, y: 2 })
  })

  it('display:none과 defs 안의 도형은 건너뛴다', () => {
    const svg = ok(
      '<svg viewBox="0 0 100 100"><defs><path d="M0 0L1 1"/></defs><path display="none" d="M0 0L1 1"/><path d="M2 2L3 3"/></svg>'
    )
    expect(svg.shapes).toHaveLength(1)
    expect(svg.shapes[0].commands[0]).toEqual({ type: 'M', x: 2, y: 2 })
  })
})

describe('parseSvg — 거절해야 하는 파일', () => {
  it('살아있는 텍스트가 있으면 윤곽선 변환을 안내한다', () => {
    const result = parseSvg('<svg viewBox="0 0 100 100"><text x="0" y="10">안녕</text></svg>')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('글자')
    expect(result.hint).toContain('윤곽선')
  })

  it('SVG가 아닌 파일은 형식을 안내한다', () => {
    const result = parseSvg('<html><body>hello</body></html>')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.hint).toBeTruthy()
  })

  it('깨진 파일은 다시 저장하도록 안내한다', () => {
    const result = parseSvg('<svg viewBox="0 0 10 10"><path')
    expect(result.ok).toBe(false)
  })

  it('그릴 도형이 하나도 없으면 알려준다', () => {
    const result = parseSvg('<svg viewBox="0 0 100 100"></svg>')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('도형')
  })

  it('크기를 알 수 없으면 알려준다', () => {
    const result = parseSvg('<svg><path d="M0 0L1 1"/></svg>')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('크기')
  })
})
