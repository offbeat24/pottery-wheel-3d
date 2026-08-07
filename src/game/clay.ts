import type { ClayProfile } from './types'

export const PROFILE_SAMPLES = 48
export const MIN_OUTER_RADIUS = 0.34
export const MAX_OUTER_RADIUS = 1.16
export const CUT_LIMIT_RADIUS = 0.39
export const WIDEN_LIMIT_RADIUS = 1.12
export const MIN_WALL_THICKNESS = 0.16
export const MIN_HEIGHT = 1.05
export const MAX_HEIGHT = 2.05
export const INNER_FLOOR_HEIGHT = 0.16

export interface CutResult {
  remaining: ClayProfile
  detached: ClayProfile
  cutHeight: number
}

export function createInitialClay(): ClayProfile {
  const outerRadii = Array.from({ length: PROFILE_SAMPLES }, (_, index) => {
    const t = index / (PROFILE_SAMPLES - 1)
    return 0.76 + Math.sin(t * Math.PI) * 0.06 - t * 0.025
  })
  return buildSafeProfile(1.52, outerRadii)
}

export function cloneProfile(profile: ClayProfile): ClayProfile {
  return {
    height: profile.height,
    outerRadii: [...profile.outerRadii],
    innerRadii: [...profile.innerRadii],
  }
}

export function deformRadius(
  profile: ClayProfile,
  centerIndex: number,
  amount: number,
  brushSize = 4.5,
): ClayProfile {
  const nextOuter = [...profile.outerRadii]
  for (let index = 0; index < nextOuter.length; index += 1) {
    const distance = (index - centerIndex) / brushSize
    const influence = Math.exp(-distance * distance * 1.7)
    nextOuter[index] = clamp(nextOuter[index] + amount * influence, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS)
  }
  return buildSafeProfile(profile.height, smoothProfile(nextOuter, 0.12))
}

export function changeHeight(profile: ClayProfile, amount: number): ClayProfile {
  const oldHeight = profile.height
  const minimumHeight = Math.min(oldHeight, MIN_HEIGHT)
  const height = clamp(oldHeight + amount, minimumHeight, MAX_HEIGHT)
  if (height === oldHeight) return cloneProfile(profile)

  const volumeScale = Math.sqrt(oldHeight / height)
  const outerRadii = smoothProfile(
    profile.outerRadii.map((radius) => clamp(radius * volumeScale, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS)),
    0.08,
  )
  return buildSafeProfile(height, outerRadii)
}

export function smoothProfile(radii: number[], strength: number): number[] {
  const next = [...radii]
  for (let index = 1; index < radii.length - 1; index += 1) {
    const average = (radii[index - 1] + radii[index + 1]) / 2
    next[index] = radii[index] * (1 - strength) + average * strength
  }
  return next
}

export function sampleOuterRadius(profile: ClayProfile, normalizedHeight: number): number {
  return sampleArray(profile.outerRadii, normalizedHeight)
}

export function sampleInnerRadius(profile: ClayProfile, normalizedHeight: number): number {
  return sampleArray(profile.innerRadii, normalizedHeight)
}

export function buildSafeProfile(height: number, outerRadii: number[]): ClayProfile {
  const safeOuter = outerRadii.map((radius) => clamp(radius, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS))
  const innerRadii = safeOuter.map((radius, index) => {
    const t = index / Math.max(1, safeOuter.length - 1)
    const opening = smoothStep(INNER_FLOOR_HEIGHT / height, 0.28, t)
    return Math.max(0.025, (radius - MIN_WALL_THICKNESS) * opening)
  })
  return { height: clamp(height, 0.28, MAX_HEIGHT), outerRadii: safeOuter, innerRadii }
}

export function cutClayAt(profile: ClayProfile, centerIndex: number): CutResult | null {
  const safeIndex = Math.round(clamp(centerIndex, 7, profile.outerRadii.length - 6))
  if (profile.outerRadii[safeIndex] > CUT_LIMIT_RADIUS) return null

  const normalizedCut = safeIndex / (profile.outerRadii.length - 1)
  const cutHeight = profile.height * normalizedCut
  const remainingOuter = resampleRange(profile.outerRadii, 0, normalizedCut, PROFILE_SAMPLES)
  const detachedOuter = resampleRange(profile.outerRadii, normalizedCut, 1, Math.max(12, PROFILE_SAMPLES - safeIndex))

  return {
    remaining: buildSafeProfile(cutHeight, remainingOuter),
    detached: buildSafeProfile(Math.max(0.22, profile.height - cutHeight), detachedOuter),
    cutHeight,
  }
}

export function collapseWideSection(profile: ClayProfile, centerIndex: number): ClayProfile {
  const folded = deformRadius(profile, centerIndex, -0.3, 8.5)
  const heightLoss = Math.min(0.18, Math.max(0.1, profile.height * 0.09))
  return changeHeight(folded, -heightLoss)
}

export function interpolateClayProfile(from: ClayProfile, to: ClayProfile, progress: number): ClayProfile {
  const t = clamp(progress, 0, 1)
  const sampleCount = Math.max(from.outerRadii.length, to.outerRadii.length)
  const outerRadii = Array.from({ length: sampleCount }, (_, index) => {
    const normalizedHeight = index / Math.max(1, sampleCount - 1)
    const start = sampleArray(from.outerRadii, normalizedHeight)
    const end = sampleArray(to.outerRadii, normalizedHeight)
    return start + (end - start) * t
  })
  return buildSafeProfile(from.height + (to.height - from.height) * t, outerRadii)
}

export function isNarrowLimit(profile: ClayProfile, centerIndex: number): boolean {
  return profile.outerRadii[clampIndex(centerIndex, profile.outerRadii.length)] <= CUT_LIMIT_RADIUS
}

export function isWidenLimit(profile: ClayProfile, centerIndex: number): boolean {
  return profile.outerRadii[clampIndex(centerIndex, profile.outerRadii.length)] >= WIDEN_LIMIT_RADIUS
}

function sampleArray(values: number[], normalizedHeight: number): number {
  const position = clamp(normalizedHeight, 0, 1) * (values.length - 1)
  const low = Math.floor(position)
  const high = Math.min(values.length - 1, low + 1)
  const blend = position - low
  return values[low] * (1 - blend) + values[high] * blend
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function resampleRange(values: number[], start: number, end: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1)
    return sampleArray(values, start + (end - start) * t)
  })
}

function clampIndex(index: number, length: number): number {
  return Math.round(clamp(index, 0, length - 1))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
