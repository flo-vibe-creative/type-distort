'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Text } from '@/components/ui/Text'
import { useFileImport } from '@/hooks/useFileImport'

/** 화면 전체에 파일을 끌어다 놓을 수 있게 감싼다 */
export function DropZone({ children }: { children: ReactNode }) {
  const { importFileList } = useFileImport()
  const [dragOver, setDragOver] = useState(false)
  // 자식 요소를 지날 때마다 dragleave가 발생하므로 깊이를 세어 깜빡임을 막는다
  const depth = useRef(0)

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        depth.current += 1
        setDragOver(true)
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragOver(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        depth.current = 0
        setDragOver(false)
        void importFileList(Array.from(event.dataTransfer.files))
      }}
    >
      {children}

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-4 border-dashed border-blue-800 bg-blue-50/70">
          <Text variant="ui16" color="text-blue-800">
            여기에 놓으면 레이어로 추가됩니다
          </Text>
        </div>
      )}
    </div>
  )
}
