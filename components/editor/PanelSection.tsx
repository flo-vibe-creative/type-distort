'use client'

import { Text } from '@/components/ui/Text'

/** 설정 패널 안의 한 묶음 */
export function PanelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border px-4 py-3">
      <div className="mb-2">
        <Text variant="caption12" as="h3" color="text-fg-tertiary">
          {title}
        </Text>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
