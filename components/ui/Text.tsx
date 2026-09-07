'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { typography, type TypographyVariant } from '@/constants/typography'

type TextElement = 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'label'

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /**
   * Typography variant (필수)
   * ⚠️ 반드시 정의된 variant만 사용해야 합니다.
   *
   * - heading: 50px/800 - 페이지 타이틀
   * - body24: 24px/500 - 큰 본문
   * - body22: 22px/500 - 일반 본문
   * - detail20: 20px/400 - 상세 설명
   * - detail18: 18px/400 - 작은 상세 설명
   * - button30: 30px/700 - 큰 버튼 텍스트
   * - button26: 26px/700 - 작은 버튼 텍스트
   */
  variant: TypographyVariant
  /**
   * 렌더링할 HTML 요소
   * @default 'p'
   */
  as?: TextElement
  /**
   * 텍스트 색상 (Tailwind class)
   * @example 'text-white', 'text-gray-800', 'text-[#3f3fff]'
   */
  color?: string
  /**
   * 텍스트 정렬
   */
  align?: 'left' | 'center' | 'right'
  /**
   * 텍스트 줄 수 제한 (line-clamp)
   */
  lineClamp?: 1 | 2 | 3 | 4 | 5
  /**
   * 텍스트 말줄임 (truncate)
   */
  truncate?: boolean
  /**
   * 자식 요소
   */
  children?: ReactNode
}

/**
 * FLO Design System - Text Component
 * Typography 시스템을 강제하는 텍스트 컴포넌트
 *
 * ⚠️ 중요: 텍스트 스타일링에는 반드시 이 컴포넌트를 사용하세요.
 * 임의의 font-size, font-weight, line-height 사용 금지!
 *
 * @example
 * ```tsx
 * import { Text } from '@/components/ui/Text'
 *
 * // 페이지 타이틀
 * <Text variant="heading" as="h1">페이지 제목</Text>
 *
 * // 본문 텍스트
 * <Text variant="body24">본문 내용</Text>
 *
 * // 상세 설명 (회색)
 * <Text variant="detail20" color="text-gray-600">
 *   상세 설명 텍스트
 * </Text>
 *
 * // 버튼 내 텍스트
 * <Text variant="button30" color="text-white">
 *   버튼 텍스트
 * </Text>
 * ```
 */
export function Text({
  variant,
  as: Component = 'p',
  color = '',
  align,
  lineClamp,
  truncate = false,
  className = '',
  children,
  ...props
}: TextProps) {
  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const lineClampClasses: Record<number, string> = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
    5: 'line-clamp-5',
  }

  const classes = [
    typography[variant],
    color,
    align ? alignClasses[align] : '',
    lineClamp ? lineClampClasses[lineClamp] : '',
    truncate ? 'truncate' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  )
}

Text.displayName = 'Text'

// ============================================================================
// Semantic Text Components (더 엄격한 사용을 위한 래퍼)
// ============================================================================

export interface HeadingProps extends Omit<TextProps, 'variant' | 'as'> {
  /**
   * 헤딩 레벨
   * @default 1
   */
  level?: 1 | 2 | 3
}

/**
 * Heading Component
 * 페이지 타이틀/섹션 헤딩 전용
 *
 * @example
 * <Heading>페이지 제목</Heading>
 * <Heading level={2}>섹션 제목</Heading>
 */
export function Heading({ level = 1, ...props }: HeadingProps) {
  const headingTag = `h${level}` as TextElement
  return <Text variant="heading" as={headingTag} {...props} />
}

Heading.displayName = 'Heading'

export interface BodyTextProps extends Omit<TextProps, 'variant'> {
  /**
   * 본문 크기
   * - 24: 큰 본문 (24px)
   * - 22: 일반 본문 (22px)
   * @default 22
   */
  size?: 22 | 24
}

/**
 * BodyText Component
 * 본문 텍스트 전용
 *
 * @example
 * <BodyText>일반 본문 텍스트</BodyText>
 * <BodyText size={24}>큰 본문 텍스트</BodyText>
 */
export function BodyText({ size = 22, ...props }: BodyTextProps) {
  const variant: TypographyVariant = size === 24 ? 'body24' : 'body22'
  return <Text variant={variant} {...props} />
}

BodyText.displayName = 'BodyText'

export type DetailTextProps = Omit<TextProps, 'variant'>

/**
 * DetailText Component
 * 상세 설명/캡션 전용
 *
 * @example
 * <DetailText>상세 설명 텍스트</DetailText>
 * <DetailText color="text-gray-500">보조 설명</DetailText>
 */
export function DetailText(props: DetailTextProps) {
  return <Text variant="detail20" {...props} />
}

DetailText.displayName = 'DetailText'
