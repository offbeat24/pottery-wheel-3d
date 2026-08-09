import { sampleOuterRadius } from './clay'
import type { ClayProfile, OrderDefinition, ScoreBreakdown } from './types'

/** surfaceDamage: 마른 흙을 밀어 표면이 튼 정도(0~1). 매끄러움을 직접 깎는다. */
export function scoreClay(profile: ClayProfile, order: OrderDefinition, surfaceDamage = 0): ScoreBreakdown {
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
  const total = Math.round(silhouette * 0.65 + height * 0.25 + smoothness * 0.1)

  return {
    silhouette: Math.round(silhouette),
    height: Math.round(height),
    smoothness: Math.round(smoothness),
    total,
  }
}

// 판매가는 점수만으로 정한다. 선형이면 못 만든 것과 잘 만든 것의 값이 비슷해지므로
// 위쪽으로 가파른 곡선을 쓴다. 실패작도 값이 0은 아니다.
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
