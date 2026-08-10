import { sampleOuterRadius } from './clay'
import type { ClayProfile, OrderDefinition, ScoreBreakdown } from './types'

export function sellPrice(totalScore: number): number {
  const normalizedScore = Math.max(0, Math.min(100, totalScore)) / 100
  return Math.round((1000 + 29000 * normalizedScore ** 2.4) / 100) * 100
}

export function scoreClay(profile: ClayProfile, order: OrderDefinition): ScoreBreakdown {
  const sampleCount = 64
  let accumulatedError = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / (sampleCount - 1)
    accumulatedError += Math.abs(sampleOuterRadius(profile, t) - sampleOrder(order, t))
  }

  const meanError = accumulatedError / sampleCount
  const silhouette = clampScore((1 - meanError / 0.42) * 100)
  const height = clampScore((1 - Math.abs(profile.height - order.height) / 0.72) * 100)
  const smoothness = calculateSmoothness(profile.outerRadii)
  const total = Math.round(silhouette * 0.65 + height * 0.25 + smoothness * 0.1)

  return {
    silhouette: Math.round(silhouette),
    height: Math.round(height),
    smoothness: Math.round(smoothness),
    total,
  }
}

function sampleOrder(order: OrderDefinition, normalizedHeight: number): number {
  const position = normalizedHeight * (order.outerRadii.length - 1)
  const low = Math.floor(position)
  const high = Math.min(order.outerRadii.length - 1, low + 1)
  const blend = position - low
  return order.outerRadii[low] * (1 - blend) + order.outerRadii[high] * blend
}

function calculateSmoothness(radii: number[]): number {
  let roughness = 0
  for (let index = 1; index < radii.length - 1; index += 1) {
    roughness += Math.abs(radii[index - 1] - radii[index] * 2 + radii[index + 1])
  }
  const average = roughness / Math.max(1, radii.length - 2)
  return clampScore((1 - Math.max(0, average - 0.004) / 0.035) * 100)
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value))
}
