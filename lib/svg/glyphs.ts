import { boundsOfCommands, type Bounds } from '@/lib/geometry/bbox'
import type { PathCommand } from '@/lib/svg/pathData'

/** 경로 하나 안의 이어진 덩어리 (글자의 바깥선 또는 그 안의 구멍) */
export interface CommandGroup {
  commands: PathCommand[]
  bounds: Bounds
}

/** 경로를 M 명령 기준으로 이어진 덩어리들로 나눈다 */
export function splitSubpaths(commands: readonly PathCommand[]): CommandGroup[] {
  const groups: CommandGroup[] = []
  let current: PathCommand[] | null = null

  const finish = () => {
    if (!current || current.length === 0) return
    const bounds = boundsOfCommands(current)
    if (bounds) groups.push({ commands: current, bounds })
    current = null
  }

  for (const command of commands) {
    if (command.type === 'M') {
      finish()
      current = [command]
      continue
    }
    // M보다 앞에 오는 명령은 시작점이 없어 그릴 수 없다
    if (!current) continue
    current.push(command)
  }
  finish()

  return groups
}

/**
 * 덩어리들을 글자 단위로 묶는다.
 *
 * 가져온 SVG에는 "여기까지가 한 글자"라는 정보가 없으므로, 가로로 겹치는 덩어리를
 * 한 글자로 본다. O의 구멍처럼 바깥선 안에 든 것은 자연히 같은 글자로 묶이고,
 * 나란히 떨어져 있는 글자들은 따로 나뉜다.
 *
 * @returns 입력과 같은 순서로, 각 덩어리가 몇 번째 글자에 속하는지 (왼쪽부터 0)
 */
export function groupIntoGlyphs(groups: readonly CommandGroup[]): number[] {
  const order = groups
    .map((group, index) => ({ index, bounds: group.bounds }))
    .sort((a, b) => a.bounds.minX - b.bounds.minX)

  const glyphOf = new Array<number>(groups.length).fill(0)
  let glyphIndex = -1
  let clusterMaxX = -Infinity

  for (const item of order) {
    // 앞선 덩어리와 가로로 겹치지 않으면 새 글자가 시작된 것으로 본다
    if (item.bounds.minX >= clusterMaxX) {
      glyphIndex += 1
      clusterMaxX = item.bounds.maxX
    } else {
      clusterMaxX = Math.max(clusterMaxX, item.bounds.maxX)
    }
    glyphOf[item.index] = glyphIndex
  }

  return glyphOf
}
