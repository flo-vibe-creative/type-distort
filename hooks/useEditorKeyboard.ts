'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

/** 방향키 한 번에 움직이는 거리 (px) */
const NUDGE = 1
const NUDGE_FAST = 10

/** 글자를 직접 쳐 넣는 칸들 — 여기서는 브라우저의 글자 되돌리기가 우선이다 */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
])

/**
 * 글자를 치는 중인지.
 *
 * 슬라이더·색 견본·체크박스도 `input` 태그지만 글자를 치는 곳이 아니므로,
 * 그런 것을 만진 뒤에도 단축키가 계속 동작해야 한다.
 */
function isTextEntry(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  if (element.isContentEditable) return true
  if (element.tagName === 'TEXTAREA') return true
  if (element.tagName === 'INPUT') {
    return TEXT_INPUT_TYPES.has((element as HTMLInputElement).type)
  }
  return false
}

/** 방향키·삭제키를 그 자리에서 쓰는 조작 요소인지 (슬라이더, 드롭다운 등) */
function isFormControl(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    isTextEntry(element) || element.tagName === 'INPUT' || element.tagName === 'SELECT'
  )
}

/** 누른 키가 Z인지. 한글 입력 상태에서는 event.key가 다른 글자로 오므로 물리 키도 함께 본다. */
function isUndoKey(event: KeyboardEvent): boolean {
  return event.code === 'KeyZ' || event.key.toLowerCase() === 'z'
}

/** 캔버스 편집 단축키 */
export function useEditorKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useEditorStore.getState()

      // Cmd/Ctrl + Z 되돌리기, Shift를 더하면 다시하기 (Ctrl+Y도 다시하기).
      // 키를 누르고 있으면 브라우저가 같은 이벤트를 계속 보내 여러 단계가 한꺼번에
      // 되돌아가므로, 자동으로 반복된 것은 무시해 한 번 누름이 한 단계가 되게 한다.
      const withCommand = event.metaKey || event.ctrlKey
      if (withCommand && isUndoKey(event) && !isTextEntry(event.target)) {
        event.preventDefault()
        if (event.repeat) return
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (event.ctrlKey && event.code === 'KeyY' && !isTextEntry(event.target)) {
        event.preventDefault()
        if (!event.repeat) state.redo()
        return
      }

      if (isTextEntry(event.target)) return

      if (event.key === 'Escape') {
        // 빈 곳 클릭과 같은 순서로, 한 단계씩 빠져나온다
        // (골라 둔 조작점 → 점 편집 → 레이어 선택)
        if (state.selectedWarpHandles.length > 0) state.clearWarpHandleSelection()
        else if (state.editingWarpLayerId) state.endWarpEditing()
        else state.selectLayers([])
        return
      }

      // 슬라이더나 드롭다운에 손이 가 있으면 방향키·삭제는 그쪽 몫이다
      if (isFormControl(event.target)) return

      const ids = state.selectedLayerIds
      if (ids.length === 0) return

      // 점 편집 중에는 방향키와 삭제가 레이어를 건드리지 않게 한다
      if (state.editingWarpLayerId) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        state.removeLayers(ids)
        return
      }

      const step = event.shiftKey ? NUDGE_FAST : NUDGE
      const offset = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[event.key]
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
