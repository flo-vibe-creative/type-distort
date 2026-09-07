import { createRasterLayer, createVectorLayer } from '@/lib/document/createLayer'
import type { Layer } from '@/lib/document/types'
import { loadRasterFile, supportedImportLabel } from '@/lib/raster/loadImage'
import { parseSvg } from '@/lib/svg/parse'

export interface ImportProblem {
  reason: string
  hint: string
}

export interface ImportOutcome {
  layers: Layer[]
  problems: ImportProblem[]
  /** 텍스처 한계를 넘어 자동으로 줄인 이미지 이름들 */
  scaledDown: string[]
}

function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

/**
 * 사용자가 고르거나 끌어다 놓은 파일들을 레이어로 바꾼다.
 * 일부가 실패해도 나머지는 그대로 가져오고, 실패한 것만 안내에 모아 돌려준다.
 */
export async function importFiles(files: readonly File[]): Promise<ImportOutcome> {
  const layers: Layer[] = []
  const problems: ImportProblem[] = []
  const scaledDown: string[] = []

  for (const file of files) {
    if (isSvgFile(file)) {
      const source = await file.text()
      const parsed = parseSvg(source)
      if (!parsed.ok) {
        problems.push({ reason: `${file.name} — ${parsed.reason}`, hint: parsed.hint })
        continue
      }
      layers.push(createVectorLayer(parsed.svg, file.name))
      continue
    }

    const loaded = await loadRasterFile(file)
    if (!loaded.ok) {
      problems.push({ reason: loaded.reason, hint: loaded.hint })
      continue
    }
    if (loaded.image.scaledDown) scaledDown.push(file.name)
    layers.push(createRasterLayer(loaded.image, file.name))
  }

  return { layers, problems, scaledDown }
}

export { supportedImportLabel }
