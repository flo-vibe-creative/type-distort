'use client'

import { useMemo } from 'react'
import type { Layer, VectorLayerSource } from '@/lib/document/types'
import { toleranceForZoom, warpCommandsToPathData } from '@/lib/render/warpShape'

interface VectorLayerViewProps {
  layer: Layer
  source: VectorLayerSource
  canvasWidth: number
  canvasHeight: number
  zoom: number
  /** 조작 중에는 거칠게 그려 반응 속도를 지킨다 */
  dragging: boolean
}

/**
 * 벡터 레이어를 SVG로 그린다.
 * 화면에 보이는 것이 그대로 내보내기 결과가 되도록 브라우저의 SVG 렌더러를 그대로 쓴다.
 */
export function VectorLayerView({
  layer,
  source,
  canvasWidth,
  canvasHeight,
  zoom,
  dragging,
}: VectorLayerViewProps) {
  const tolerance = toleranceForZoom(zoom, layer.transform.scale, dragging)

  const paths = useMemo(
    () =>
      source.shapes.map((shape, index) => ({
        key: index,
        d: warpCommandsToPathData(shape.commands, source.bounds, layer.warp, tolerance),
        fill: shape.fill,
        fillRule: shape.fillRule,
        opacity: shape.opacity,
      })),
    [source.shapes, source.bounds, layer.warp, tolerance]
  )

  const { x, y, scale, rotation } = layer.transform

  return (
    <svg
      width={canvasWidth}
      height={canvasHeight}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      className="pointer-events-none absolute left-0 top-0"
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            fill={path.fill}
            fillRule={path.fillRule}
            opacity={path.opacity}
          />
        ))}
      </g>
    </svg>
  )
}
