'use client'

import { HTMLAttributes } from 'react'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 스피너 크기
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * 스피너 색상
   */
  variant?: 'primary' | 'secondary' | 'white'
  /**
   * 로딩 텍스트
   */
  label?: string
}

/**
 * FLO Design System - Spinner Component
 *
 * @example
 * ```tsx
 * import { Spinner } from '@/components/ui/Spinner'
 *
 * <Spinner size="lg" label="로딩중..." />
 * ```
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  label,
  className = '',
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const variantClasses = {
    primary: 'text-blue-800',
    secondary: 'text-gray-800',
    white: 'text-white',
  }

  const spinnerClasses = ['animate-spin', sizeClasses[size], variantClasses[variant]].join(' ')

  const containerClasses = ['flex flex-col items-center gap-2', className].filter(Boolean).join(' ')

  return (
    <div className={containerClasses} {...props}>
      <svg
        className={spinnerClasses}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <span className="text-sm text-gray-600 font-medium">{label}</span>}
    </div>
  )
}
