'use client'

import { useMemo } from 'react'
import type { Layer } from '@/lib/document/types'
import type { Bounds } from '@/lib/geometry/bbox'
import { frameBounds } from '@/lib/render/canvasBounds'
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
const ACCENT = '#3f3fff'

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

interface SelectionFrameProps {
  layer: Layer
  zoom: number
  /** 여러 레이어를 골랐을 때는 기준이 하나가 아니라 크기·회전 핸들을 두지 않는다 */
  showHandles: boolean
  onResizeStart: (handle: HandleId, event: React.PointerEvent) => void
  onRotateStart: (event: React.PointerEvent) => void
}

/**
 * 고른 레이어를 감싸는 선택 상자.
 * 캔버스 좌표로 그리되, 확대해도 핸들 크기는 화면에서 일정하게 유지한다.
 */
export function SelectionFrame({
  layer,
  zoom,
  showHandles,
  onResizeStart,
  onRotateStart,
}: SelectionFrameProps) {
  const bounds = useMemo(() => frameBounds(layer, zoom), [layer, zoom])
  const corners = useMemo(() => frameCorners(layer.transform, bounds), [layer.transform, bounds])

  const size = HANDLE_SIZE / zoom
  const rotateZone = ROTATE_ZONE / zoom
  const outline = corners.map((p) => `${p.x},${p.y}`).join(' ')

  const handlePoints: { id: HandleId; point: Point }[] = showHandles
    ? HANDLE_IDS.map((id) => ({
        id,
        point: localToCanvas(layer.transform, handleLocalPoint(bounds, id)),
      }))
    : []

  return (
    <g>
      <polygon
        points={outline}
        fill="none"
        stroke={ACCENT}
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
            stroke={ACCENT}
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

/** 여러 레이어를 골랐을 때 전체를 감싸는 사각형 */
export function MultiSelectionOutline({ bounds }: { bounds: Bounds }) {
  return (
    <rect
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.maxX - bounds.minX}
      height={bounds.maxY - bounds.minY}
      fill="none"
      stroke={ACCENT}
      strokeWidth={1}
      strokeDasharray="5 4"
      vectorEffect="non-scaling-stroke"
    />
  )
}
