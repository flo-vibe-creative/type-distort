'use client'

import { Text } from '@/components/ui/Text'

export default function EditorPage() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* 상단 바 */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <Text variant="ui14" as="span" color="text-fg-tertiary">
          가져오기
        </Text>
        <Text variant="ui16" as="h1">
          Type Distort
        </Text>
        <Text variant="ui14" as="span" color="text-fg-tertiary">
          내보내기
        </Text>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 좌측 — 레이어 목록 */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <Text variant="ui14" as="h2">
              레이어
            </Text>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            <Text variant="ui13" align="center" color="text-fg-tertiary">
              아직 레이어가 없습니다
            </Text>
          </div>
        </aside>

        {/* 중앙 — 캔버스 */}
        <main className="flex min-w-0 flex-1 items-center justify-center bg-surface-minimal">
          <Text variant="ui13" color="text-fg-tertiary">
            SVG 또는 이미지 파일을 여기에 끌어다 놓으세요
          </Text>
        </main>

        {/* 우측 — 설정 패널 */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-border">
          <div className="flex border-b border-border">
            <button type="button" className="flex-1 border-b-2 border-fg-primary px-4 py-3">
              <Text variant="ui14" as="span">
                배치
              </Text>
            </button>
            <button type="button" className="flex-1 border-b-2 border-transparent px-4 py-3">
              <Text variant="ui14" as="span" color="text-fg-tertiary">
                왜곡
              </Text>
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            <Text variant="ui13" align="center" color="text-fg-tertiary">
              레이어를 선택하면
              <br />
              설정이 표시됩니다
            </Text>
          </div>
        </aside>
      </div>
    </div>
  )
}
