'use client'

import type { Layer } from '@/lib/document/types'
import { localToCanvas } from '@/lib/render/layerFrame'
import { warpDomainSize } from '@/lib/render/layerSource'
import { bulgeGeometry } from '@/lib/warp/bulge'
import { MESH_SIZE } from '@/lib/warp/mesh'
import { applyWarp, type WarpState } from '@/lib/warp/registry'
import { activeWarpOf } from '@/lib/warp/stackHandles'
import type { Point } from '@/lib/warp/types'

/** 화면에서 보이는 조작점 지름 (px) */
const HANDLE_SIZE = 10
/** 점 편집 중에는 잡기 쉽도록 조금 키운다 */
const EDITING_HANDLE_SIZE = 13
/** 볼록의 원 중심 표시는 중앙점과 헷갈리지 않게 작게 그린다 */
const CENTER_MARK_SIZE = 7
/** 골라 둔 점은 조금 더 크게 그려 눈에 띄게 한다 */
const SELECTED_EXTRA = 3
/** 격자 줄을 잡을 수 있는 두께 (px) — 선 자체는 얇게 보이지만 이만큼은 눌린다 */
const LINE_HIT_WIDTH = 7
const ACCENT = '#7b3fff'
/** 퍼스펙티브 외곽선의 변 하나를 몇 조각으로 나눠 그릴지 */
const EDGE_SAMPLES = 12

export type MeshLine = { kind: 'row' | 'column'; index: number }

interface WarpHandlesProps {
  layer: Layer
  /** 패널에서 펼친 효과 — 이 효과의 조작점만 그린다 */
  activeWarpId: string | null
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
  warp,
  size,
  toCanvas,
  editing,
  hitWidth,
  onHandleDown,
  onMeshLineDown,
}: {
  warp: WarpState
  size: { width: number; height: number }
  /** 이 효과 기준 자리를 캔버스 위 보이는 자리로 옮긴다 (뒤 효과 + 배치) */
  toCanvas: (p: Point) => Point
  editing: boolean
  hitWidth: number
  onHandleDown: (handleId: string, event: React.PointerEvent) => void
  onMeshLineDown: (line: MeshLine, event: React.PointerEvent) => void
}) {
  if (warp.type === 'arc') {
    const baseline = warp.params.baseline
    const samples = Array.from({ length: 49 }, (_, index) =>
      toCanvas(applyWarp(warp, index / 48, baseline, size))
    )
    return dashedLine(samples, 'arc')
  }

  if (warp.type === 'bulge') {
    const steps = 64
    const { center, radius } = bulgeGeometry(warp.params, size)
    const circle = Array.from({ length: steps + 1 }, (_, index) => {
      const angle = (index / steps) * Math.PI * 2
      return toCanvas({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    })
    // 점선 원을 잡아 끌면 원과 중앙점이 함께 옮겨진다
    return (
      <>
        {dashedLine(circle, 'bulge')}
        <polyline
          points={circle.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="transparent"
          strokeWidth={hitWidth}
          style={{ cursor: 'move', pointerEvents: 'stroke' }}
          onPointerDown={(event) => onHandleDown('bulge-area', event)}
        />
      </>
    )
  }

  if (warp.type === 'perspective') {
    // 뒤 효과를 거치면 곧은 변도 휘므로 변마다 점을 여러 개 찍어 잇는다
    const corners = warp.params.corners.map((corner) => ({
      x: corner.x * size.width,
      y: corner.y * size.height,
    }))
    const outline = corners
      .flatMap((corner, index) => {
        const next = corners[(index + 1) % corners.length]
        return Array.from({ length: EDGE_SAMPLES }, (_, step) =>
          toCanvas({
            x: corner.x + ((next.x - corner.x) * step) / EDGE_SAMPLES,
            y: corner.y + ((next.y - corner.y) * step) / EDGE_SAMPLES,
          })
        )
      })
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
  const grid = warp.params.points.map((point) =>
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
  activeWarpId,
  zoom,
  editing,
  selectedHandleIds,
  onHandleDown,
  onMeshLineDown,
}: WarpHandlesProps) {
  const size = warpDomainSize(layer)
  // 조작점은 많아야 열여섯 개라 그릴 때마다 새로 구해도 가볍다
  const active = activeWarpOf(layer.warps, activeWarpId, size)
  if (!active) return null
  const toCanvas = (point: Point) => localToCanvas(layer.transform, active.toDisplay(point))
  const baseSize = editing ? EDITING_HANDLE_SIZE : HANDLE_SIZE

  return (
    <g>
      <GuideLines
        warp={active.effect}
        size={size}
        toCanvas={toCanvas}
        editing={editing}
        hitWidth={LINE_HIT_WIDTH / zoom}
        onHandleDown={onHandleDown}
        onMeshLineDown={onMeshLineDown}
      />

      {active.handles.map((handle) => {
        const point = localToCanvas(layer.transform, handle.display)
        const selected = selectedHandleIds.includes(handle.id)
        // 기준선·반경 핸들과 골라 둔 점은 채워서 그려, 그냥 놓인 점들과 구분되게 한다
        const filled = selected || (handle.role !== 'point' && handle.role !== 'center')
        const diameter =
          handle.role === 'center' ? CENTER_MARK_SIZE : baseSize + (selected ? SELECTED_EXTRA : 0)
        return (
          <circle
            key={handle.id}
            cx={point.x}
            cy={point.y}
            r={diameter / 2 / zoom}
            fill={filled ? ACCENT : '#ffffff'}
            stroke={selected ? '#ffffff' : ACCENT}
            strokeWidth={selected ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: handle.role === 'anchor' || handle.role === 'center' ? 'move' : 'grab',
              pointerEvents: 'auto',
            }}
            onPointerDown={(event) => onHandleDown(handle.id, event)}
          />
        )
      })}
    </g>
  )
}
