import { describe, expect, it } from 'vitest'
import { parsePathData } from '@/lib/svg/pathData'

describe('parsePathData', () => {
  it('빈 문자열은 빈 목록이다', () => {
    expect(parsePathData('')).toEqual([])
  })

  it('절대 좌표 M/L을 그대로 읽는다', () => {
    expect(parsePathData('M 10 20 L 30 40')).toEqual([
      { type: 'M', x: 10, y: 20 },
      { type: 'L', x: 30, y: 40 },
    ])
  })

  it('상대 좌표를 절대 좌표로 바꾼다', () => {
    expect(parsePathData('m 10 20 l 5 5')).toEqual([
      { type: 'M', x: 10, y: 20 },
      { type: 'L', x: 15, y: 25 },
    ])
  })

  it('H와 V를 L로 편다', () => {
    expect(parsePathData('M 0 0 H 50 V 60 h -10 v -20')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 50, y: 0 },
      { type: 'L', x: 50, y: 60 },
      { type: 'L', x: 40, y: 60 },
      { type: 'L', x: 40, y: 40 },
    ])
  })

  it('C 곡선을 읽는다', () => {
    expect(parsePathData('M 0 0 C 1 2 3 4 5 6')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
    ])
  })

  it('명령을 반복해 쓰면 같은 명령이 이어진 것으로 본다', () => {
    expect(parsePathData('M 0 0 L 1 1 2 2')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 1, y: 1 },
      { type: 'L', x: 2, y: 2 },
    ])
  })

  it('M을 반복해 쓰면 두 번째부터는 L로 이어진다', () => {
    expect(parsePathData('M 0 0 1 1')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 1, y: 1 },
    ])
  })

  it('Q 2차 곡선을 3차 곡선으로 올린다', () => {
    const [, curve] = parsePathData('M 0 0 Q 3 3 6 0')
    expect(curve).toEqual({ type: 'C', x1: 2, y1: 2, x2: 4, y2: 2, x: 6, y: 0 })
  })

  it('S는 직전 곡선의 제어점을 반사해 이어붙인다', () => {
    const [, , smooth] = parsePathData('M 0 0 C 1 1 2 2 3 3 S 5 5 6 6')
    expect(smooth).toEqual({ type: 'C', x1: 4, y1: 4, x2: 5, y2: 5, x: 6, y: 6 })
  })

  it('T는 직전 2차 곡선의 제어점을 반사한다', () => {
    const [, , smooth] = parsePathData('M 0 0 Q 2 2 4 0 T 8 0')
    // 반사된 2차 제어점은 (6, -2) → 3차로 올리면 아래 값이 된다
    expect(smooth).toEqual({ type: 'C', x1: 16 / 3, y1: -4 / 3, x2: 20 / 3, y2: -4 / 3, x: 8, y: 0 })
  })

  it('Z는 닫기 명령으로 남는다', () => {
    expect(parsePathData('M 0 0 L 1 1 Z')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 1, y: 1 },
      { type: 'Z' },
    ])
  })

  it('Z 뒤의 상대 좌표는 하위 경로 시작점을 기준으로 삼는다', () => {
    expect(parsePathData('M 10 10 L 20 20 Z l 5 0')).toEqual([
      { type: 'M', x: 10, y: 10 },
      { type: 'L', x: 20, y: 20 },
      { type: 'Z' },
      { type: 'L', x: 15, y: 10 },
    ])
  })

  it('A 원호를 3차 곡선 여러 개로 근사한다', () => {
    const commands = parsePathData('M 0 0 A 10 10 0 0 1 20 0')
    expect(commands[0]).toEqual({ type: 'M', x: 0, y: 0 })
    expect(commands.length).toBeGreaterThan(1)
    commands.slice(1).forEach((c) => expect(c.type).toBe('C'))
    const last = commands[commands.length - 1]
    if (last.type !== 'C') throw new Error('C 여야 한다')
    expect(last.x).toBeCloseTo(20, 6)
    expect(last.y).toBeCloseTo(0, 6)
  })

  it('반지름이 0인 A는 직선으로 처리한다', () => {
    expect(parsePathData('M 0 0 A 0 0 0 0 1 20 0')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 20, y: 0 },
    ])
  })

  it('쉼표와 붙여쓴 음수를 구분해 읽는다', () => {
    expect(parsePathData('M0,0L-1.5-2.5')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: -1.5, y: -2.5 },
    ])
  })

  it('숫자가 모자란 명령은 버리고 앞부분을 살린다', () => {
    expect(parsePathData('M 0 0 L 5 5 L 9')).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 5, y: 5 },
    ])
  })
})
