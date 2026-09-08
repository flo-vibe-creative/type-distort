'use client'

import { useMemo } from 'react'
import type { Layer } from '@/lib/document/types'
import { localToCanvas } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { warpHandles } from '@/lib/warp/handles'
import { MESH_SIZE } from '@/lib/warp/mesh'
import { applyWarp } from '@/lib/warp/registry'
import type { Point } from '@/lib/warp/types'

/** 화면에서 보이는 조작점 지름 (px) */
const HANDLE_SIZE = 10
/** 점 편집 중에는 잡기 쉽도록 조금 키운다 */
const EDITING_HANDLE_SIZE = 13
/** 골라 둔 점은 조금 더 크게 그려 눈에 띄게 한다 */
const SELECTED_EXTRA = 3
/** 격자 줄을 잡을 수 있는 두께 (px) — 선 자체는 얇게 보이지만 이만큼은 눌린다 */
const LINE_HIT_WIDTH = 7
const ACCENT = '#7b3fff'

export type MeshLine = { kind: 'row' | 'column'; index: number }

interface WarpHandlesProps {
  layer: Layer
  zoom: number
  /** 점 편집 중인지 — 격자 줄을 눌러 통째로 고를 수 있게 된다 */
  editing: boolean
  /** 여러 개를 골라 함께 옮길 때 골라 둔 조작점들 */
  selectedHandleIds: readonly string[]
  onHandleDown: (handleId: string, event: React.PointerEvent) => void
  onMeshLineDown: (line: MeshLine, event: React.PointerEvent) => void
}

function dashedLine(points: readonly Point[], key: string | number) {
  return (
    <polyline
      key={key}
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke={ACCENT}
      strokeWidth={1}
      strokeDasharray="4 3"
      vectorEffect="non-scaling-stroke"
    />
  )
}

/** 효과별 안내선 — 지금 무엇을 조절하고 있는지 눈으로 알 수 있게 한다 */
function GuideLines({
  layer,
  toCanvas,
  editing,
  hitWidth,
  onMeshLineDown,
}: {
  layer: Layer
  toCanvas: (p: Point) => Point
  editing: boolean
  hitWidth: number
  onMeshLineDown: (line: MeshLine, event: React.PointerEvent) => void
}) {
  const size = warpDomainSize(layer)

  if (layer.warp.type === 'arc') {
    const baseline = layer.warp.params.baseline
    const samples = Array.from({ length: 49 }, (_, index) =>
      toCanvas(applyWarp(layer.warp, index / 48, baseline, size))
    )
    return dashedLine(samples, 'arc')
  }

  if (layer.warp.type === 'bulge') {
    const steps = 64
    const center = { x: layer.warp.params.cx * size.width, y: layer.warp.params.cy * size.height }
    const radius = (layer.warp.params.radius * Math.hypot(size.width, size.height)) / 2
    const circle = Array.from({ length: steps + 1 }, (_, index) => {
      const angle = (index / steps) * Math.PI * 2
      return toCanvas({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    })
    return dashedLine(circle, 'bulge')
  }

  if (layer.warp.type === 'perspective') {
    const outline = layer.warp.params.corners
      .map((corner) => toCanvas({ x: corner.x * size.width, y: corner.y * size.height }))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    return (
      <polygon
        points={outline}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  // 메쉬 — 제어점을 가로줄과 세로줄로 이어 격자를 보여준다.
  // 점 편집 중에는 줄을 눌러 그 줄의 네 점을 통째로 고를 수 있다.
  const grid = layer.warp.params.points.map((point) =>
    toCanvas({ x: point.x * size.width, y: point.y * size.height })
  )
  const lines: { line: MeshLine; points: Point[] }[] = []
  for (let index = 0; index < MESH_SIZE; index += 1) {
    lines.push({
      line: { kind: 'row', index },
      points: Array.from({ length: MESH_SIZE }, (_, col) => grid[index * MESH_SIZE + col]),
    })
    lines.push({
      line: { kind: 'column', index },
      points: Array.from({ length: MESH_SIZE }, (_, row) => grid[row * MESH_SIZE + index]),
    })
  }

  return (
    <>
      {lines.map(({ line, points }) => dashedLine(points, `${line.kind}-${line.index}`))}
      {editing &&
        lines.map(({ line, points }) => (
          <polyline
            key={`hit-${line.kind}-${line.index}`}
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="transparent"
            strokeWidth={hitWidth}
            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
            onPointerDown={(event) => onMeshLineDown(line, event)}
          />
        ))}
    </>
  )
}

export function WarpHandles({
  layer,
  zoom,
  editing,
  selectedHandleIds,
  onHandleDown,
  onMeshLineDown,
}: WarpHandlesProps) {
  const size = warpDomainSize(layer)
  const toCanvas = useMemo(
    () => (point: Point) => localToCanvas(layer.transform, point),
    [layer.transform]
  )
  const handles = useMemo(() => warpHandles(layer.warp, size), [layer.warp, size])
  const baseSize = editing ? EDITING_HANDLE_SIZE : HANDLE_SIZE

  return (
    <g>
      <GuideLines
        layer={layer}
        toCanvas={toCanvas}
        editing={editing}
        hitWidth={LINE_HIT_WIDTH / zoom}
        onMeshLineDown={onMeshLineDown}
      />

      {handles.map((handle) => {
        const point = toCanvas(handle.local)
        const selected = selectedHandleIds.includes(handle.id)
        // 기준선·반경 핸들과 골라 둔 점은 채워서 그려, 그냥 놓인 점들과 구분되게 한다
        const filled = selected || handle.role !== 'point'
        return (
          <circle
            key={handle.id}
            cx={point.x}
            cy={point.y}
            r={(baseSize + (selected ? SELECTED_EXTRA : 0)) / 2 / zoom}
            fill={filled ? ACCENT : '#ffffff'}
            stroke={selected ? '#ffffff' : ACCENT}
            strokeWidth={selected ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: handle.role === 'anchor' ? 'move' : 'grab',
              pointerEvents: 'auto',
            }}
            onPointerDown={(event) => onHandleDown(handle.id, event)}
          />
        )
      })}
    </g>
  )
}
