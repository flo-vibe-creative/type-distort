import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Type Distort',
  description: '타이포그래피를 가져와 왜곡하고 내보내는 툴',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-surface font-pretendard text-fg-primary antialiased">{children}</body>
    </html>
  )
}
