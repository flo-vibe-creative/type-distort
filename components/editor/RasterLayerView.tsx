'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Layer, RasterLayerSource } from '@/lib/document/types'
import { renderWarpedBitmap } from '@/lib/raster/glRenderer'
import { warpedBounds } from '@/lib/render/layerBounds'

interface RasterLayerViewProps {
  layer: Layer
  source: RasterLayerSource
  zoom: number
  dragging: boolean
}

/** 조작 중과 평상시의 격자 조밀도 */
const GRID_WHILE_DRAGGING = 24
const GRID_WHEN_IDLE = 64
/** 캔버스가 지나치게 커지지 않도록 두는 배율 상한 */
const MAX_PIXEL_SCALE = 4

/**
 * 이미지 레이어를 격자 메쉬로 늘려 그린다.
 * 공유 WebGL 캔버스에 그린 결과를 이 레이어의 캔버스로 옮겨 담아, 레이어 순서를 지킨다.
 */
export function RasterLayerView({ layer, source, zoom, dragging }: RasterLayerViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bounds = useMemo(() => warpedBounds(layer), [layer])

  const width = Math.max(1, bounds.maxX - bounds.minX)
  const height = Math.max(1, bounds.maxY - bounds.minY)

  const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const pixelScale = Math.min(
    MAX_PIXEL_SCALE,
    Math.max(
      0.25,
      zoom *
        Math.max(Math.abs(layer.transform.scaleX), Math.abs(layer.transform.scaleY)) *
        devicePixelRatio
    )
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rendered = renderWarpedBitmap({
      bitmap: source.bitmap,
      warp: layer.warp,
      sourceWidth: source.width,
      sourceHeight: source.height,
      bounds,
      pixelScale,
      gridSize: dragging ? GRID_WHILE_DRAGGING : GRID_WHEN_IDLE,
    })

    const context = canvas.getContext('2d')
    if (!context) return

    if (!rendered) {
      // WebGL을 쓸 수 없으면 왜곡 없이 원본이라도 보여준다
      canvas.width = Math.max(1, Math.round(source.width * pixelScale))
      canvas.height = Math.max(1, Math.round(source.height * pixelScale))
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(source.bitmap, 0, 0, canvas.width, canvas.height)
      return
    }

    canvas.width = rendered.width
    canvas.height = rendered.height
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(rendered, 0, 0)
  }, [source.bitmap, source.width, source.height, layer.warp, bounds, pixelScale, dragging])

  const { x, y, scaleX, scaleY, rotation } = layer.transform

  return (
    <canvas
      ref={canvasRef}
      data-layer-id={layer.id}
      className="absolute left-0 top-0"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transformOrigin: '0 0',
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY}) translate(${bounds.minX}px, ${bounds.minY}px)`,
      }}
    />
  )
}
