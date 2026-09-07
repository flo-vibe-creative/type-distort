/**
 * FLO Design System - Typography Tokens
 *
 * Text 컴포넌트에서 사용되는 typography variant 정의.
 * 임의의 font-size/weight 사용을 방지하고 디자인 시스템을 강제합니다.
 *
 * @see components/ui/Text.tsx
 */

export const typography = {
  /** 50px / 800 - 페이지 타이틀 */
  heading: 'text-[50px] font-[800] leading-tight tracking-[-0.5px]',
  /** 24px / 500 - 큰 본문 */
  body24: 'text-[24px] font-[500] leading-[34px] tracking-[-0.3px]',
  /** 22px / 500 - 일반 본문 */
  body22: 'text-[22px] font-[500] leading-[32px] tracking-[-0.3px]',
  /** 20px / 400 - 상세 설명 */
  detail20: 'text-[20px] font-[400] leading-[30px] tracking-[-0.2px]',
  /** 18px / 400 - 작은 상세 설명 */
  detail18: 'text-[18px] font-[400] leading-[26px] tracking-[-0.2px]',
  /** 12px / 400 - 캡션/주석 */
  caption12: 'text-[12px] font-[400] leading-[18px] tracking-[-0.1px]',
  /** 10px / 400 - 최소 캡션 */
  caption10: 'text-[10px] font-[400] leading-[16px] tracking-[-0.1px]',
  /** 8px / 400 - 6pt */
  caption8: 'text-[8px] font-[400] leading-[12px] tracking-[-0.1px]',
  /** 6px / 400 */
  caption6: 'text-[6px] font-[400] leading-[10px] tracking-[-0.1px]',
  /** 16px / 600 - 에디터 패널 제목 */
  ui16: 'text-[16px] font-[600] leading-[22px] tracking-[-0.2px]',
  /** 14px / 500 - 에디터 본문/라벨 */
  ui14: 'text-[14px] font-[500] leading-[20px] tracking-[-0.1px]',
  /** 13px / 400 - 에디터 보조 라벨 */
  ui13: 'text-[13px] font-[400] leading-[18px] tracking-[-0.1px]',
  /** 30px / 700 - 큰 버튼 텍스트 */
  button30: 'text-[30px] font-[700] leading-[35px] tracking-[-0.5px]',
  /** 26px / 700 - 작은 버튼 텍스트 */
  button26: 'text-[26px] font-[700] leading-[45px] tracking-[-0.5px]',
} as const

export type TypographyVariant = keyof typeof typography
