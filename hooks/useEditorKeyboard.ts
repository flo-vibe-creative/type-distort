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
      const id = state.selectedLayerId

      // Cmd/Ctrl + Z 되돌리기, Shift를 더하면 다시하기
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }

      if (event.key === 'Escape') {
        // 골라 둔 조작점 → 왜곡 모드 → 레이어 선택 순서로 한 단계씩 빠져나온다
        if (state.selectedWarpHandles.length > 0) state.clearWarpHandleSelection()
        else if (state.mode === 'warp') state.setMode('transform')
        else state.selectLayer(null)
        return
      }

      if (!id) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        state.removeLayer(id)
        return
      }

      const step = event.shiftKey ? NUDGE_FAST : NUDGE
      const layer = state.document.layers.find((l) => l.id === id)
      if (!layer) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          state.updateTransform(id, { x: layer.transform.x - step })
          break
        case 'ArrowRight':
          event.preventDefault()
          state.updateTransform(id, { x: layer.transform.x + step })
          break
        case 'ArrowUp':
          event.preventDefault()
          state.updateTransform(id, { y: layer.transform.y - step })
          break
        case 'ArrowDown':
          event.preventDefault()
          state.updateTransform(id, { y: layer.transform.y + step })
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
