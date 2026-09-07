'use client'

import { RasterLayerView } from '@/components/editor/RasterLayerView'
import { VectorLayerView } from '@/components/editor/VectorLayerView'
import type { Layer } from '@/lib/document/types'

interface LayerViewProps {
  layer: Layer
  canvasWidth: number
  canvasHeight: number
  zoom: number
  dragging: boolean
}

/** 레이어 종류에 맞는 렌더러로 넘긴다 */
export function LayerView({ layer, canvasWidth, canvasHeight, zoom, dragging }: LayerViewProps) {
  if (!layer.visible) return null

  if (layer.source.kind === 'raster') {
    return <RasterLayerView layer={layer} source={layer.source} zoom={zoom} dragging={dragging} />
  }

  return (
    <VectorLayerView
      layer={layer}
      source={layer.source}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      zoom={zoom}
      dragging={dragging}
    />
  )
}
