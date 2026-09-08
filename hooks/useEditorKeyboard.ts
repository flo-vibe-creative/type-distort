'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

/** 방향키 한 번에 움직이는 거리 (px) */
const NUDGE = 1
const NUDGE_FAST = 10

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  )
}

/** 캔버스 편집 단축키 */
export function useEditorKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      const state = useEditorStore.getState()
      const ids = state.selectedLayerIds

      // Cmd/Ctrl + Z 되돌리기, Shift를 더하면 다시하기.
      // 키를 누르고 있으면 브라우저가 같은 이벤트를 계속 보내 여러 단계가 한꺼번에
      // 되돌아가므로, 자동으로 반복된 것은 무시해 한 번 누름이 한 단계가 되게 한다.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.repeat) return
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }

      if (event.key === 'Escape') {
        // 빈 곳 클릭과 같은 순서로, 한 단계씩 빠져나온다
        // (골라 둔 조작점 → 점 편집 → 레이어 선택)
        if (state.selectedWarpHandles.length > 0) state.clearWarpHandleSelection()
        else if (state.editingWarpLayerId) state.endWarpEditing()
        else state.selectLayers([])
        return
      }

      if (ids.length === 0) return

      // 점 편집 중에는 방향키와 삭제가 레이어를 건드리지 않게 한다
      if (state.editingWarpLayerId) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        state.removeLayers(ids)
        return
      }

      const step = event.shiftKey ? NUDGE_FAST : NUDGE
      const offset = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
        event.key
      ]
      if (!offset) return

      event.preventDefault()
      const updates: Record<string, { x: number; y: number }> = {}
      for (const id of ids) {
        const layer = state.document.layers.find((item) => item.id === id)
        if (!layer) continue
        updates[id] = { x: layer.transform.x + offset[0], y: layer.transform.y + offset[1] }
      }
      state.updateTransforms(updates)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
