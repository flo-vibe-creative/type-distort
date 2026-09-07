'use client'

import { useEffect, useState } from 'react'
import { restoreDocument, saveDocumentSoon } from '@/store/persist'
import { useEditorStore } from '@/store/editorStore'

/**
 * 작업 내용을 브라우저에 자동으로 저장하고, 다시 열었을 때 되살린다.
 * 저장은 모두 사용자 브라우저 안에서만 이루어지며 어디로도 보내지 않는다.
 */
export function useDocumentPersistence() {
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    let cancelled = false

    void restoreDocument().then((document) => {
      if (cancelled) return
      if (document && document.layers.length > 0) {
        useEditorStore.getState().replaceDocument(document)
      }
      setRestoring(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // 되살리는 중에 저장하면 빈 문서로 덮어쓸 수 있으므로 끝난 뒤에 시작한다
    if (restoring) return
    return useEditorStore.subscribe((state, previous) => {
      if (state.document !== previous.document) saveDocumentSoon(state.document)
    })
  }, [restoring])

  return { restoring }
}
