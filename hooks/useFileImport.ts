'use client'

import { useCallback, useState } from 'react'
import { importFiles, supportedImportLabel } from '@/lib/document/importFiles'
import { useEditorStore } from '@/store/editorStore'
import { useNoticeStore } from '@/store/noticeStore'

/**
 * 파일을 레이어로 가져오는 흐름을 한곳에 모은다.
 * 버튼으로 고르든 끌어다 놓든 같은 처리를 거친다.
 */
export function useFileImport() {
  const addLayers = useEditorStore((state) => state.addLayers)
  const notify = useNoticeStore((state) => state.notify)
  const [importing, setImporting] = useState(false)

  const importFileList = useCallback(
    async (files: readonly File[]) => {
      if (files.length === 0) return
      setImporting(true)
      try {
        const outcome = await importFiles(files)

        if (outcome.layers.length > 0) addLayers(outcome.layers)

        outcome.problems.forEach((problem) => {
          notify({ reason: problem.reason, hint: problem.hint, tone: 'error' })
        })

        if (outcome.scaledDown.length > 0) {
          notify({
            reason: `${outcome.scaledDown.join(', ')}이(가) 화면에 그릴 수 있는 최대 크기를 넘어 자동으로 줄였습니다.`,
            hint: '더 선명하게 쓰려면 원본을 4096px 이하로 줄여서 다시 가져와 주세요.',
            tone: 'info',
          })
        }
      } catch {
        notify({
          reason: '파일을 가져오는 중 문제가 생겼습니다.',
          hint: `${supportedImportLabel} 파일인지 확인한 뒤 다시 시도해 주세요.`,
          tone: 'error',
        })
      } finally {
        setImporting(false)
      }
    },
    [addLayers, notify]
  )

  return { importFileList, importing }
}
