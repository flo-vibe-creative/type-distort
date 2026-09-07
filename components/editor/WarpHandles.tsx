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
const ACCENT = '#7b3fff'

interface WarpHandlesProps {
  layer: Layer
  zoom: number
  onHandleDown: (handleId: string, event: React.PointerEvent) => void
}

/** 효과별 안내선 — 지금 무엇을 조절하고 있는지 눈으로 알 수 있게 한다 */
function GuideLines({ layer, toCanvas }: { layer: Layer; toCanvas: (p: Point) => Point }) {
  const size = warpDomainSize(layer)

  if (layer.warp.type === 'arc') {
    const baseline = layer.warp.params.baseline
    const samples = Array.from({ length: 49 }, (_, index) =>
      toCanvas(applyWarp(layer.warp, index / 48, baseline, size))
    )
    return (
      <polyline
        points={samples.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    )
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
    return (
      <polyline
        points={circle.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    )
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

  // 메쉬 — 제어점을 가로줄과 세로줄로 이어 격자를 보여준다
  const grid = layer.warp.params.points.map((point) =>
    toCanvas({ x: point.x * size.width, y: point.y * size.height })
  )
  const lines: string[] = []
  for (let index = 0; index < MESH_SIZE; index += 1) {
    const row = Array.from({ length: MESH_SIZE }, (_, col) => grid[index * MESH_SIZE + col])
    const column = Array.from({ length: MESH_SIZE }, (_, r) => grid[r * MESH_SIZE + index])
    lines.push(row.map((p) => `${p.x},${p.y}`).join(' '))
    lines.push(column.map((p) => `${p.x},${p.y}`).join(' '))
  }
  return (
    <>
      {lines.map((points, index) => (
        <polyline
          key={index}
          points={points}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </>
  )
}

export function WarpHandles({ layer, zoom, onHandleDown }: WarpHandlesProps) {
  const size = warpDomainSize(layer)
  const toCanvas = useMemo(
    () => (point: Point) => localToCanvas(layer.transform, point),
    [layer.transform]
  )
  const handles = useMemo(() => warpHandles(layer.warp, size), [layer.warp, size])
  const radius = HANDLE_SIZE / 2 / zoom

  return (
    <g>
      <GuideLines layer={layer} toCanvas={toCanvas} />

      {handles.map((handle) => {
        const point = toCanvas(handle.local)
        // 기준선·반경 핸들은 채워서 그려, 자리를 옮기는 점들과 구분되게 한다
        const filled = handle.role !== 'point'
        return (
          <circle
            key={handle.id}
            cx={point.x}
            cy={point.y}
            r={radius}
            fill={filled ? ACCENT : '#ffffff'}
            stroke={ACCENT}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: handle.role === 'baseline' ? 'ns-resize' : 'grab',
              pointerEvents: 'auto',
            }}
            onPointerDown={(event) => onHandleDown(handle.id, event)}
          />
        )
      })}
    </g>
  )
}
