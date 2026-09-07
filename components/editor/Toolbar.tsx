'use client'

import { useRef, useState } from 'react'
import { ExportDialog } from '@/components/editor/ExportDialog'
import { Text } from '@/components/ui/Text'
import { useFileImport } from '@/hooks/useFileImport'
import { supportedImportLabel } from '@/lib/document/importFiles'
import { useEditorStore } from '@/store/editorStore'

export function Toolbar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { importFileList, importing } = useFileImport()
  const [exportOpen, setExportOpen] = useState(false)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const canUndo = useEditorStore((state) => state.past.length > 0)
  const canRedo = useEditorStore((state) => state.future.length > 0)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-minimal disabled:opacity-50"
        >
          <Text variant="ui13" as="span">
            {importing ? '가져오는 중…' : '+ 가져오기'}
          </Text>
        </button>
        <Text variant="caption12" as="span" color="text-fg-tertiary">
          {supportedImportLabel}
        </Text>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
          multiple
          hidden
          onChange={(event) => {
            void importFileList(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      </div>

      <Text variant="ui16" as="h1">
        Type Distort
      </Text>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="되돌리기 (Cmd+Z)"
          className="rounded-md border border-border px-2.5 py-1.5 hover:bg-surface-minimal disabled:opacity-30"
        >
          <Text variant="ui13" as="span">
            ↶
          </Text>
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="다시하기 (Cmd+Shift+Z)"
          className="rounded-md border border-border px-2.5 py-1.5 hover:bg-surface-minimal disabled:opacity-30"
        >
          <Text variant="ui13" as="span">
            ↷
          </Text>
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-minimal"
        >
          <Text variant="ui13" as="span">
            내보내기
          </Text>
        </button>
        {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
      </div>
    </header>
  )
}
