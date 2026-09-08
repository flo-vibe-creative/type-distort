'use client'

import { useMemo } from 'react'
import type { Layer, VectorLayerSource } from '@/lib/document/types'
import { spacedVectorSource } from '@/lib/render/layerSource'
import { overlayStyle, overlayViewBox } from '@/lib/render/overlay'
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
  const tolerance = toleranceForZoom(
    zoom,
    Math.max(Math.abs(layer.transform.scaleX), Math.abs(layer.transform.scaleY)),
    dragging
  )

  const spaced = useMemo(
    () => spacedVectorSource(source, layer.letterSpacing),
    [source, layer.letterSpacing]
  )

  const paths = useMemo(
    () =>
      spaced.shapes.map((shape, index) => ({
        key: index,
        d: warpCommandsToPathData(shape.commands, spaced.bounds, layer.warp, tolerance),
        fill: layer.fillOverride ?? shape.fill,
        fillRule: shape.fillRule,
        opacity: shape.opacity,
      })),
    [spaced, layer.warp, layer.fillOverride, tolerance]
  )

  const { x, y, scaleX, scaleY, rotation } = layer.transform

  return (
    <svg
      viewBox={overlayViewBox(canvasWidth, canvasHeight)}
      className="pointer-events-none absolute"
      style={{ ...overlayStyle(canvasWidth, canvasHeight), overflow: 'visible' }}
      aria-hidden
    >
      <g
        data-layer-id={layer.id}
        style={{ pointerEvents: 'auto' }}
        transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scaleX} ${scaleY})`}
      >
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
