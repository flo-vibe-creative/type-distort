'use client'

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 버튼 스타일 변형
   * - primary: 파란색 배경 (#3f3fff)
   * - secondary: 흰색 배경, 검은색 텍스트
   * - outline: 흰색 배경, 파란색 테두리/텍스트
   * - outlineDark: 투명 배경, 검은색 테두리 (라이트 배경용)
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'outlineDark'
  /**
   * 버튼 모양
   * - round: 완전 둥근 형태 (pill)
   * - square: 약간 둥근 모서리
   */
  shape?: 'round' | 'square'
  /**
   * 버튼 크기
   * - sm: 작은 버튼
   * - md: 중간 버튼
   * - lg: 큰 버튼 (프로모션용)
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * 전체 너비 사용
   */
  fullWidth?: boolean
  /**
   * 로딩 상태
   */
  loading?: boolean
  /**
   * 왼쪽 아이콘
   */
  leftIcon?: ReactNode
  /**
   * 오른쪽 아이콘 (링크 화살표 등)
   */
  rightIcon?: ReactNode
  /**
   * 링크 화살표 표시
   */
  showArrow?: boolean
}

/**
 * FLO Design System - Button Component
 * Based on Figma: Common Asset BA 프로모션 에셋
 *
 * @example
 * ```tsx
 * import { Button } from '@/components/ui/Button'
 *
 * // 기본 사용
 * <Button variant="primary" size="md">클릭하세요</Button>
 *
 * // 둥근 프로모션 버튼
 * <Button variant="primary" shape="round" size="lg" showArrow>
 *   선물 자세히 보기
 * </Button>
 *
 * // 아웃라인 버튼 (다크 배경)
 * <Button variant="outline" shape="round">
 *   선물 자세히 보기
 * </Button>
 *
 * // 작은 공유 버튼
 * <Button variant="outlineDark" size="sm" showArrow>
 *   친구에게 공유하기
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      shape = 'round',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      showArrow = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 tracking-[-0.5px]'

    const variantClasses = {
      primary:
        'bg-[#3f3fff] text-white hover:bg-[#3535e6] active:bg-[#2b2bcc] focus-visible:ring-[#3f3fff] disabled:bg-[#3f3fff]/50 disabled:text-white/50',
      secondary:
        'bg-white text-black rounded-[68px] hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400 disabled:bg-white/50 disabled:text-black/50',
      outline:
        'bg-white text-[#3F3FFF] border-2 border-[#3F3FFF] font-normal hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-[#3F3FFF] disabled:bg-white/50 disabled:text-[#3F3FFF]/50 disabled:border-[#3F3FFF]/50',
      outlineDark:
        'bg-transparent border-2 border-black text-black rounded-full hover:bg-black/5 active:bg-black/10 focus-visible:ring-black disabled:border-black/50 disabled:text-black/50',
    }

    const shapeClasses = {
      round: 'rounded-full',
      square: 'rounded-[10px]',
    }

    const sizeClasses = {
      sm: 'h-[45px] px-[35px] py-[10px] text-[26px] leading-[45px] gap-[2px]',
      md: 'h-[90px] px-[75px] py-[32px] text-[30px] leading-[35px] gap-px',
      lg: 'h-[100px] px-[75px] py-[32px] text-[32px] leading-[36px] gap-px',
    }

    const widthClass = fullWidth ? 'w-full' : ''
    const disabledClass = disabled || loading ? 'cursor-not-allowed' : ''

    const classes = [
      baseClasses,
      variantClasses[variant],
      shapeClasses[shape],
      sizeClasses[size],
      widthClass,
      disabledClass,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const iconSizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-6 h-6',
    }

    const ArrowIcon = () => (
      <svg
        className={iconSizeClasses[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    )

    const LoadingSpinner = () => (
      <svg
        className={`animate-spin ${iconSizeClasses[size]}`}
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
    )

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {leftIcon && <span className="shrink-0 pr-[15px]">{leftIcon}</span>}
            <span>{children}</span>
            {showArrow && !rightIcon && <ArrowIcon />}
            {rightIcon && <span className="shrink-0 pl-[15px]">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
