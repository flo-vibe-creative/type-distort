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

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  notify: (notice) => {
    sequence += 1
    const id = `notice-${sequence}`
    set((state) => ({ notices: [...state.notices, { ...notice, id }] }))
  },
  dismiss: (id) => set((state) => ({ notices: state.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}))
