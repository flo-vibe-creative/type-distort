/**
 * 두 방향 사이의 각도 차이를 -180~180도 사이로 접는다.
 *
 * atan2로 구한 방향은 왼쪽 수평선(±180°)에서 끊겨 있어서, 포인터가 그 선을 가로지르면
 * 단순히 빼기만 해서는 한 바퀴(360°)를 더 센 값이 나온다.
 */
export function normalizeDegrees(degrees: number): number {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180
  // -180과 180은 같은 방향이므로 180으로 맞춘다
  return wrapped === -180 ? 180 : wrapped
}
