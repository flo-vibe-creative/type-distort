import type { Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { localToCanvas } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { supportsMultiSelect, warpHandles } from '@/lib/warp/handles'
import { MESH_SIZE } from '@/lib/warp/mesh'

/**
 * 영역 안에 든 왜곡 조작점들을 골라낸다.
 *
 * 여러 개를 함께 옮길 수 없는 효과(아크·볼록)는 영역으로 골라도 소용이 없으므로 비워 둔다.
 */
export function handleIdsWithin(layer: Layer, rect: Bounds): string[] {
  if (!supportsMultiSelect(layer.warp.type)) return []

  const size = warpDomainSize(layer)
  return warpHandles(layer.warp, size)
    .filter((handle) => {
      const point = localToCanvas(layer.transform, handle.local)
      return (
        point.x >= rect.minX &&
        point.x <= rect.maxX &&
        point.y >= rect.minY &&
        point.y <= rect.maxY
      )
    })
    .map((handle) => handle.id)
}

/** 메쉬 격자의 가로줄 하나에 놓인 점들 (위에서부터 0) */
export function meshRowHandleIds(row: number): string[] {
  if (row < 0 || row >= MESH_SIZE) return []
  return Array.from({ length: MESH_SIZE }, (_, col) => `mesh-${row * MESH_SIZE + col}`)
}

/** 메쉬 격자의 세로줄 하나에 놓인 점들 (왼쪽부터 0) */
export function meshColumnHandleIds(column: number): string[] {
  if (column < 0 || column >= MESH_SIZE) return []
  return Array.from({ length: MESH_SIZE }, (_, row) => `mesh-${row * MESH_SIZE + column}`)
}
