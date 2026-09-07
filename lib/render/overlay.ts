/**
 * 캔버스 밖으로 나간 도형과 핸들도 클릭할 수 있어야 한다.
 *
 * SVG는 overflow를 visible로 두면 요소 밖에도 그려주지만, 클릭 판정은 요소 안에서만 일어난다.
 * 그래서 레이어와 핸들을 담는 SVG를 캔버스보다 이만큼 넓게 잡는다.
 */
export const OVERLAY_PADDING = 4000

export function overlayViewBox(canvasWidth: number, canvasHeight: number): string {
  return `${-OVERLAY_PADDING} ${-OVERLAY_PADDING} ${canvasWidth + OVERLAY_PADDING * 2} ${canvasHeight + OVERLAY_PADDING * 2}`
}

export function overlayStyle(canvasWidth: number, canvasHeight: number) {
  return {
    left: `${-OVERLAY_PADDING}px`,
    top: `${-OVERLAY_PADDING}px`,
    width: `${canvasWidth + OVERLAY_PADDING * 2}px`,
    height: `${canvasHeight + OVERLAY_PADDING * 2}px`,
    // 전역 스타일의 max-width: 100% 가 넓힌 폭을 도로 줄여버리는 것을 막는다
    maxWidth: 'none',
    maxHeight: 'none',
  } as const
}
