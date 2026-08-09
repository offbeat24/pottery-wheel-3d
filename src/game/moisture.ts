// 흙은 물레 위에서 마른다. 마른 흙은 잘 밀리지 않고 구조 한계에 빨리 도달한다.
// 카운트다운 없이 작업에 리듬을 만드는 장치이므로, 말라도 조작이 잠기지는 않는다.
export const DRY_WHILE_SHAPING = 0.05
export const DRY_WHILE_SPINNING = 0.014
// 마른 흙을 계속 밀면 표면이 트기 시작하는 지점과, 바싹 말랐을 때의 트임 크기.
export const DRY_SURFACE_THRESHOLD = 0.6
export const MAX_TEARING = 0.014
export const WET_RATE = 0.9
// 바싹 말라도 이만큼은 밀린다. 0 이면 손이 멈춘 것처럼 보여 고장으로 읽힌다.
export const MIN_WORKABILITY = 0.34
// 마른 흙이 구조 한계에 도달하는 속도 배수.
export const MAX_FRAGILITY = 2.4

export interface MoistureInput {
  moisture: number
  deltaSeconds: number
  spinning: boolean
  shaping: boolean
  wetting: boolean
}

export function updateMoisture(input: MoistureInput): number {
  const { moisture, deltaSeconds, spinning, shaping, wetting } = input
  if (wetting) return clamp01(moisture + WET_RATE * deltaSeconds)
  if (!spinning) return moisture

  const rate = shaping ? DRY_WHILE_SHAPING : DRY_WHILE_SPINNING
  return clamp01(moisture - rate * deltaSeconds)
}

/** 변형량에 곱하는 계수. 젖은 흙은 1, 마른 흙은 MIN_WORKABILITY. */
export function workability(moisture: number): number {
  return MIN_WORKABILITY + (1 - MIN_WORKABILITY) * clamp01(moisture)
}

/** 구조 한계가 차오르는 속도 배수. 마를수록 잘 갈라진다. */
export function fragility(moisture: number): number {
  return 1 + (MAX_FRAGILITY - 1) * (1 - clamp01(moisture))
}

/** 마른 흙을 밀 때 표면이 트는 정도. 젖어 있으면 0이고, 마를수록 가파르게 커진다. */
export function surfaceTearing(moisture: number): number {
  const dryness = Math.max(0, DRY_SURFACE_THRESHOLD - clamp01(moisture)) / DRY_SURFACE_THRESHOLD
  return MAX_TEARING * dryness
}

export function moistureLabel(moisture: number): string {
  if (moisture >= 0.62) return '촉촉'
  if (moisture >= 0.3) return '꾸덕'
  return '메마름'
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
