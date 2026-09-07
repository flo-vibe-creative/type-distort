'use client'

import { useMemo } from 'react'
import type { Layer } from '@/lib/document/types'
import { warpedBounds } from '@/lib/render/layerBounds'
import {
  HANDLE_IDS,
  frameCorners,
  handleLocalPoint,
  localToCanvas,
  type HandleId,
} from '@/lib/render/layerFrame'
import type { Point } from '@/lib/warp/types'

/** 화면에서 보이는 핸들 한 변의 크기 (px) */
const HANDLE_SIZE = 9
/** 모서리 바깥 이 정도까지가 회전 영역이다 (px) */
const ROTATE_ZONE = 18

const CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

interface TransformHandlesProps {
  layer: Layer
  zoom: number
  onResizeStart: (handle: HandleId, event: React.PointerEvent) => void
  onRotateStart: (event: React.PointerEvent) => void
}

/**
 * 선택된 레이어의 배치 핸들.
 * 캔버스 좌표로 그리되, 확대해도 핸들 크기는 화면에서 일정하게 유지한다.
 */
export function TransformHandles({
  layer,
  zoom,
  onResizeStart,
  onRotateStart,
}: TransformHandlesProps) {
  const bounds = useMemo(() => warpedBounds(layer), [layer])
  const corners = useMemo(() => frameCorners(layer.transform, bounds), [layer.transform, bounds])

  const size = HANDLE_SIZE / zoom
  const rotateZone = ROTATE_ZONE / zoom
  const outline = corners.map((p) => `${p.x},${p.y}`).join(' ')

  const handlePoints: { id: HandleId; point: Point }[] = HANDLE_IDS.map((id) => ({
    id,
    point: localToCanvas(layer.transform, handleLocalPoint(bounds, id)),
  }))

  return (
    <g>
      <polygon
        points={outline}
        fill="none"
        stroke="#3f3fff"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {handlePoints.map(({ id, point }) => (
        <g key={id}>
          {/* 모서리 바깥쪽은 회전 영역 — 눈에는 보이지 않는다 */}
          {(id === 'nw' || id === 'ne' || id === 'se' || id === 'sw') && (
            <rect
              x={point.x - rotateZone}
              y={point.y - rotateZone}
              width={rotateZone * 2}
              height={rotateZone * 2}
              fill="transparent"
              style={{ cursor: 'grab', pointerEvents: 'auto' }}
              onPointerDown={onRotateStart}
            />
          )}
          <rect
            x={point.x - size / 2}
            y={point.y - size / 2}
            width={size}
            height={size}
            fill="#ffffff"
            stroke="#3f3fff"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: CURSORS[id], pointerEvents: 'auto' }}
            onPointerDown={(event) => onResizeStart(id, event)}
          />
        </g>
      ))}
    </g>
  )
}
