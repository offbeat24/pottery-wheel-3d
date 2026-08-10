import { sampleOuterRadius } from './clay'
import type { ClayProfile, OrderDefinition, ScoreBreakdown } from './types'

// 기법: 도구가 열어주는 주문은 형태만으로 판정할 수 없다. 홈을 어디에, 몇 줄, 어떤 순서로
// 새겼는지를 따로 본다. 요구가 없는 주문은 100점이고 가중치도 0이라 예전 배점 그대로다.
export const TECHNIQUE_WEIGHT = 0.2
/** 홈으로 인정되는 최소 깊이. 물로 다듬어 뭉개지면 이 아래로 내려간다. */
export const MIN_GROOVE_DEPTH = 0.03
/** 순서를 어겼을 때 깎이는 최대 비율. */
export const ORDER_PENALTY = 0.35
/** 요구보다 더 새긴 홈 하나마다 깎이는 비율. */
export const EXTRA_GROOVE_PENALTY = 0.12
/** 오차 한계 중 만점으로 인정하는 심의 비율. */
export const CORE_RATIO = 0.4
/** 홈 깊이를 잴 때 어깨로 삼는 높이 간격. */
const GROOVE_SHOULDER = 0.07

/**
 * 그 높이에서 몸통이 얼마나 파였는지. 위아래 어깨 평균에서 가운데를 뺀 값이다.
 * 어깨가 옆 홈까지 닿으면 깊이가 얕게 나오므로, 홈이 촘촘한 주문에서는 좁혀서 잰다.
 */
export function grooveDepth(profile: ClayProfile, normalizedHeight: number, shoulder = GROOVE_SHOULDER): number {
  const core = sampleOuterRadius(profile, normalizedHeight)
  const above = sampleOuterRadius(profile, Math.min(1, normalizedHeight + shoulder))
  const below = sampleOuterRadius(profile, Math.max(0, normalizedHeight - shoulder))
  return (above + below) / 2 - core
}

/**
 * 기법 점수. 위치 정확도 × 실제로 남은 깊이를 재고, 순서를 어긋난 만큼과
 * 군더더기로 더 새긴 만큼을 깎는다. carvings는 새긴 높이를 새긴 순서대로 담은 기록이다.
 */
export function techniqueScore(
  profile: ClayProfile,
  order: OrderDefinition,
  carvings: readonly number[] = [],
): number {
  const spec = order.technique
  if (!spec) return 100
  if (spec.grooves.length === 0) return 100

  const used = carvings.map(() => false)
  const matched: number[] = []
  let placement = 0

  for (const target of spec.grooves) {
    let best = -1
    let bestDistance = Number.POSITIVE_INFINITY
    carvings.forEach((height, index) => {
      if (used[index]) return
      const distance = Math.abs(height - target)
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    if (best < 0 || bestDistance >= spec.tolerance) continue
    used[best] = true
    matched.push(best)
    // 오차 한계 안쪽의 좁은 심(core)까지는 맞춘 것으로 본다. 커서로 조준할 수 있는 정밀도가
    // 높이 2%p 남짓이라, 심이 없으면 정확히 겨눠도 만점이 나오지 않는다.
    const core = spec.tolerance * CORE_RATIO
    const accuracy = bestDistance <= core ? 1 : 1 - (bestDistance - core) / (spec.tolerance - core)
    // 새겼다고 기록만 남고 물로 다듬어 뭉개졌으면 점수도 함께 사라진다.
    const shoulder = Math.min(GROOVE_SHOULDER, spec.tolerance * 0.8)
    const depth = Math.min(1, Math.max(0, grooveDepth(profile, target, shoulder) / MIN_GROOVE_DEPTH))
    placement += accuracy * depth
  }

  let score = (placement / spec.grooves.length) * 100

  if (spec.ordered && matched.length > 1) {
    let inversions = 0
    for (let a = 0; a < matched.length; a += 1) {
      for (let b = a + 1; b < matched.length; b += 1) {
        if (matched[a] > matched[b]) inversions += 1
      }
    }
    const pairs = (matched.length * (matched.length - 1)) / 2
    score *= 1 - ORDER_PENALTY * (inversions / pairs)
  }

  const extra = Math.max(0, carvings.length - spec.grooves.length)
  score *= Math.max(0.4, 1 - extra * EXTRA_GROOVE_PENALTY)
  return clampScore(score)
}

/**
 * surfaceDamage: 마른 흙을 밀어 표면이 튼 정도(0~1). 매끄러움을 직접 깎는다.
 * carvings: 조각칼로 새긴 높이를 새긴 순서대로 담은 기록.
 */
export function scoreClay(
  profile: ClayProfile,
  order: OrderDefinition,
  surfaceDamage = 0,
  carvings: readonly number[] = [],
): ScoreBreakdown {
  const sampleCount = 64
  let accumulatedError = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / (sampleCount - 1)
    accumulatedError += Math.abs(sampleOuterRadius(profile, t) - sampleOrder(order, t))
  }

  const meanError = accumulatedError / sampleCount
  const silhouette = clampScore((1 - meanError / 0.42) * 100)
  const height = clampScore((1 - Math.abs(profile.height - order.height) / 0.72) * 100)
  const smoothness = calculateSmoothness(profile.outerRadii, order.outerRadii) * (1 - clampScore(surfaceDamage * 100) / 100 * 0.8)
  const technique = techniqueScore(profile, order, carvings)
  // 기법 요구가 있는 주문은 그 몫을 실루엣과 높이에서 떼어 온다.
  const total = order.technique
    ? Math.round(silhouette * 0.5 + height * 0.2 + smoothness * 0.1 + technique * TECHNIQUE_WEIGHT)
    : Math.round(silhouette * 0.65 + height * 0.25 + smoothness * 0.1)

  return {
    silhouette: Math.round(silhouette),
    height: Math.round(height),
    smoothness: Math.round(smoothness),
    technique: Math.round(technique),
    total,
  }
}

// 굽기: 너무 일찍 꺼내면 설익고 너무 늦게 꺼내면 과하게 익는다.
export const FIRING_SECONDS = 35
export const FIRING_WINDOW = 3

/** 꺼낸 시점의 굽기 완성도(0.5~1). 알맞은 창 안이면 1이다. */
export function firingQuality(elapsedSeconds: number): number {
  const off = Math.abs(elapsedSeconds - FIRING_SECONDS) - FIRING_WINDOW
  if (off <= 0) return 1
  const early = elapsedSeconds < FIRING_SECONDS
  // 설익은 쪽이 더 아프다. 덜 구운 그릇은 못 쓰지만 더 구운 그릇은 색만 상한다.
  const penalty = off / (early ? 22 : 34)
  return Math.max(0.5, 1 - penalty)
}

// 작업 속도: 같은 점수라면 빨리 빚어낸 손이 더 받는다. 60초가 기준이고 그보다
// 빠르면 값이 오르고 느리면 내려간다. 점수 곡선과 곱해지므로 빨리 만든 실패작은 여전히 싸다.
export const PACE_SECONDS = 60
export const MAX_PACE = 1.35
export const MIN_PACE = 0.7
// 보너스를 다 받으려면 이만큼은 흙을 만져야 한다. 손대지 않은 점토를 바로 완성해
// 최고 배수를 챙기는 길을 막는다(초기 점토가 첫 주문과 이미 닮아 있다).
export const PACE_WORK_SECONDS = 8

/** 완성까지 걸린 시간이 판매가에 곱해지는 배수(0.7~1.35). workedSeconds는 실제로 흙을 만진 시간. */
export function paceMultiplier(seconds: number, workedSeconds = seconds): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 1
  const raw = 1 + ((PACE_SECONDS - seconds) / PACE_SECONDS) * 0.5
  const bounded = Math.min(MAX_PACE, Math.max(MIN_PACE, raw))
  if (bounded <= 1) return bounded
  const credit = Math.min(1, Math.max(0, workedSeconds) / PACE_WORK_SECONDS)
  return 1 + (bounded - 1) * credit
}

// 판매가는 점수와 작업 속도로 정한다. 선형이면 못 만든 것과 잘 만든 것의 값이 비슷해지므로
// 점수는 위쪽으로 가파른 곡선을 쓴다. 실패작도 값이 0은 아니다.
export function sellPrice(score: ScoreBreakdown, multiplier = 1): number {
  const quality = clampScore(score.total) / 100
  return Math.round(((1000 + 29000 * Math.pow(quality, 2.4)) * multiplier) / 100) * 100
}

function sampleOrder(order: OrderDefinition, normalizedHeight: number): number {
  const position = normalizedHeight * (order.outerRadii.length - 1)
  const low = Math.floor(position)
  const high = Math.min(order.outerRadii.length - 1, low + 1)
  const blend = position - low
  return order.outerRadii[low] * (1 - blend) + order.outerRadii[high] * blend
}

// 주문이 홈을 요구하면 그만큼의 거칠기는 흠이 아니다. 목표보다 얼마나 더 거친지를 본다.
function calculateSmoothness(radii: number[], targetRadii: number[]): number {
  const excess = roughness(radii) - roughness(targetRadii)
  return clampScore((1 - Math.max(0, excess - 0.004) / 0.035) * 100)
}

function roughness(radii: number[]): number {
  let total = 0
  for (let index = 1; index < radii.length - 1; index += 1) {
    total += Math.abs(radii[index - 1] - radii[index] * 2 + radii[index + 1])
  }
  return total / Math.max(1, radii.length - 2)
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value))
}
