'use client'

import { Text } from '@/components/ui/Text'
import { useNoticeStore } from '@/store/noticeStore'

/** 실패나 알림을 "왜 → 어떻게" 순서로 보여준다 */
export function NoticeList() {
  const notices = useNoticeStore((state) => state.notices)
  const dismiss = useNoticeStore((state) => state.dismiss)

  if (notices.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 flex-col gap-2 px-4">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${
            notice.tone === 'error'
              ? 'border-red-200 bg-surface'
              : 'border-border bg-surface'
          }`}
        >
          <div className="min-w-0 flex-1">
            <Text variant="ui13" color="text-fg-primary">
              {notice.reason}
            </Text>
            <div className="mt-1">
              <Text variant="caption12" color="text-fg-secondary">
                {notice.hint}
              </Text>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(notice.id)}
            className="shrink-0 text-fg-tertiary hover:text-fg-primary"
            aria-label="닫기"
          >
            <Text variant="caption12" as="span">
              ✕
            </Text>
          </button>
        </div>
      ))}
    </div>
  )
}
