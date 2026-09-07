'use client'

import { CanvasStage } from '@/components/editor/CanvasStage'
import { DropZone } from '@/components/editor/DropZone'
import { LayerPanel } from '@/components/editor/LayerPanel'
import { NoticeList } from '@/components/editor/NoticeList'
import { Toolbar } from '@/components/editor/Toolbar'
import { Text } from '@/components/ui/Text'
import { useEditorStore } from '@/store/editorStore'

export default function EditorPage() {
  const mode = useEditorStore((state) => state.mode)
  const setMode = useEditorStore((state) => state.setMode)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)

  return (
    <DropZone>
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        <LayerPanel />
        <CanvasStage />

        <aside className="flex w-72 shrink-0 flex-col border-l border-border">
          <div className="flex border-b border-border">
            {(['transform', 'warp'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`flex-1 border-b-2 px-4 py-3 ${
                  mode === tab ? 'border-fg-primary' : 'border-transparent'
                }`}
              >
                <Text
                  variant="ui14"
                  as="span"
                  color={mode === tab ? 'text-fg-primary' : 'text-fg-tertiary'}
                >
                  {tab === 'transform' ? '배치' : '왜곡'}
                </Text>
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-center px-4">
            <Text variant="ui13" align="center" color="text-fg-tertiary">
              {selectedLayerId ? '다음 단계에서 구현합니다' : '레이어를 선택하면\n설정이 표시됩니다'}
            </Text>
          </div>
        </aside>
      </div>

      <NoticeList />
    </DropZone>
  )
}
