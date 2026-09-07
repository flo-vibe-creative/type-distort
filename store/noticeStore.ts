import { create } from 'zustand'

export interface Notice {
  id: string
  /** 왜 이렇게 됐는지 */
  reason: string
  /** 어떻게 하면 되는지 */
  hint: string
  tone: 'error' | 'info'
}

interface NoticeState {
  notices: Notice[]
  notify: (notice: Omit<Notice, 'id'>) => void
  dismiss: (id: string) => void
  clear: () => void
}

let sequence = 0

/** 안내가 스스로 사라지기까지의 시간 — 오류는 읽을 시간이 더 필요하다 */
const AUTO_DISMISS_MS: Record<Notice['tone'], number> = { info: 6000, error: 14000 }
/** 한꺼번에 여러 파일이 실패해도 화면을 뒤덮지 않도록 최근 것만 남긴다 */
const MAX_VISIBLE = 4

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  notify: (notice) => {
    sequence += 1
    const id = `notice-${sequence}`
    set((state) => ({ notices: [...state.notices, { ...notice, id }].slice(-MAX_VISIBLE) }))

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((state) => ({ notices: state.notices.filter((item) => item.id !== id) }))
      }, AUTO_DISMISS_MS[notice.tone])
    }
  },
  dismiss: (id) => set((state) => ({ notices: state.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}))
