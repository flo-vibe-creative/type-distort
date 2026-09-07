'use client'

import { CanvasStage } from '@/components/editor/CanvasStage'
import { DropZone } from '@/components/editor/DropZone'
import { InspectorPanel } from '@/components/editor/InspectorPanel'
import { LayerPanel } from '@/components/editor/LayerPanel'
import { NoticeList } from '@/components/editor/NoticeList'
import { Toolbar } from '@/components/editor/Toolbar'
import { useEditorKeyboard } from '@/hooks/useEditorKeyboard'

export default function EditorPage() {
  useEditorKeyboard()

  return (
    <DropZone>
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LayerPanel />
        <CanvasStage />
        <InspectorPanel />
      </div>
      <NoticeList />
    </DropZone>
  )
}
