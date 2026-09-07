'use client'

import { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 카드 제목
   */
  title?: string
  /**
   * 카드 부제목
   */
  subtitle?: string
  /**
   * 카드 푸터
   */
  footer?: ReactNode
  /**
   * 패딩 크기
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /**
   * 호버 효과
   */
  hoverable?: boolean
}

/**
 * FLO Design System - Card Component
 *
 * @example
 * ```tsx
 * import { Card } from '@/components/ui/Card'
 *
 * <Card title="카드 제목" subtitle="부제목" hoverable>
 *   <p>카드 내용</p>
 * </Card>
 * ```
 */
export function Card({
  title,
  subtitle,
  footer,
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseClasses = 'bg-white border border-gray-250 rounded-xl transition-all duration-200'

  const hoverClasses = hoverable
    ? 'hover:shadow-lg hover:border-gray-300 cursor-pointer'
    : 'shadow-sm'

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const classes = [baseClasses, hoverClasses, paddingClasses[padding], className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {(title || subtitle) && (
        <div className={padding !== 'none' ? 'mb-4' : ''}>
          {title && <h3 className="text-xl font-bold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
      {footer && (
        <div
          className={`mt-4 pt-4 border-t border-gray-300 ${padding === 'none' ? 'px-6 pb-6' : ''}`}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
