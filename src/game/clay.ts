import type { ClayProfile } from './types'

export const PROFILE_SAMPLES = 48
export const MIN_OUTER_RADIUS = 0.34
export const MAX_OUTER_RADIUS = 1.16
export const CUT_LIMIT_RADIUS = 0.39
export const WIDEN_LIMIT_RADIUS = 1.12
export const MIN_WALL_THICKNESS = 0.09
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
    return 0.72 + Math.sin(t * Math.PI) * 0.09 - t * 0.12
  })
  return buildSafeProfile(1.18, outerRadii, 0)
}

export function cloneProfile(profile: ClayProfile): ClayProfile {
  return {
    height: profile.height,
    outerRadii: [...profile.outerRadii],
    innerRadii: [...profile.innerRadii],
    opening: profile.opening,
  }
}

export function deformRadius(
  profile: ClayProfile,
  centerIndex: number,
  amount: number,
  brushSize = 4.5,
): ClayProfile {
  const targetVolume = estimateClayVolume(profile)
  const nextOuter = [...profile.outerRadii]
  const nextInner = [...profile.innerRadii]
  for (let index = 0; index < nextOuter.length; index += 1) {
    const distance = (index - centerIndex) / brushSize
    const influence = Math.exp(-distance * distance * 1.7)
    nextOuter[index] = clamp(nextOuter[index] + amount * influence, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS)
    if (profile.opening > 0.2) {
      const innerMotion = amount > 0 ? amount * 1.32 : amount * 0.58
      nextInner[index] = Math.max(0.025, nextInner[index] + innerMotion * influence)
    }
  }
  const raw = buildProfile(
    profile.height,
    smoothProfile(nextOuter, 0.12),
    smoothProfile(nextInner, 0.1),
    profile.opening,
  )
  return conserveClayVolume(raw, targetVolume)
}

export function changeHeight(profile: ClayProfile, amount: number): ClayProfile {
  const oldHeight = profile.height
  const minimumHeight = Math.min(oldHeight, MIN_HEIGHT)
  const height = clamp(oldHeight + amount, minimumHeight, MAX_HEIGHT)
  if (height === oldHeight) return cloneProfile(profile)

  const volumeScale = Math.sqrt(oldHeight / height)
  const outerRadii = smoothProfile(profile.outerRadii.map((radius) => radius * volumeScale), 0.08)
  const innerRadii = smoothProfile(profile.innerRadii.map((radius) => radius * volumeScale), 0.08)
  return buildProfile(height, outerRadii, innerRadii, profile.opening)
}

export function openCenter(profile: ClayProfile, amount: number): ClayProfile {
  const targetVolume = estimateClayVolume(profile)
  const opening = clamp(profile.opening + amount, 0, 1)
  const innerRadii = profile.outerRadii.map((radius, index) => {
    const t = index / Math.max(1, profile.outerRadii.length - 1)
    const depth = smoothStep(INNER_FLOOR_HEIGHT / profile.height, 0.34, t)
    return Math.max(0.025, (radius - MIN_WALL_THICKNESS) * depth * opening)
  })
  return conserveClayVolume(buildProfile(profile.height, profile.outerRadii, innerRadii, opening), targetVolume)
}

export function estimateClayVolume(profile: ClayProfile): number {
  const last = Math.max(1, profile.outerRadii.length - 1)
  const sliceHeight = profile.height / last
  let volume = 0
  for (let index = 0; index < last; index += 1) {
    const areaA = Math.PI * Math.max(0, profile.outerRadii[index] ** 2 - profile.innerRadii[index] ** 2)
    const areaB = Math.PI * Math.max(0, profile.outerRadii[index + 1] ** 2 - profile.innerRadii[index + 1] ** 2)
    volume += (areaA + areaB) * 0.5 * sliceHeight
  }
  return volume
}

export function minimumWallThickness(profile: ClayProfile): number {
  if (profile.opening < 0.2) return Math.min(...profile.outerRadii)
  return Math.min(...profile.outerRadii.map((outer, index) => outer - profile.innerRadii[index]))
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

export function buildSafeProfile(height: number, outerRadii: number[], opening = 1): ClayProfile {
  const safeOuter = outerRadii.map((radius) => clamp(radius, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS))
  const innerRadii = safeOuter.map((radius, index) => {
    const t = index / Math.max(1, safeOuter.length - 1)
    const openingCurve = smoothStep(INNER_FLOOR_HEIGHT / height, 0.28, t)
    return Math.max(0.025, (radius - MIN_WALL_THICKNESS) * openingCurve * clamp(opening, 0, 1))
  })
  return buildProfile(height, safeOuter, innerRadii, opening)
}

export function cutClayAt(profile: ClayProfile, centerIndex: number): CutResult | null {
  const safeIndex = Math.round(clamp(centerIndex, 7, profile.outerRadii.length - 6))
  if (profile.outerRadii[safeIndex] > CUT_LIMIT_RADIUS) return null

  const normalizedCut = safeIndex / (profile.outerRadii.length - 1)
  const cutHeight = profile.height * normalizedCut
  const remainingOuter = resampleRange(profile.outerRadii, 0, normalizedCut, PROFILE_SAMPLES)
  const detachedOuter = resampleRange(profile.outerRadii, normalizedCut, 1, Math.max(12, PROFILE_SAMPLES - safeIndex))

  return {
    remaining: buildSafeProfile(cutHeight, remainingOuter, profile.opening),
    detached: buildSafeProfile(Math.max(0.22, profile.height - cutHeight), detachedOuter, profile.opening),
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
  const innerRadii = Array.from({ length: sampleCount }, (_, index) => {
    const normalizedHeight = index / Math.max(1, sampleCount - 1)
    const start = sampleArray(from.innerRadii, normalizedHeight)
    const end = sampleArray(to.innerRadii, normalizedHeight)
    return start + (end - start) * t
  })
  return buildProfile(
    from.height + (to.height - from.height) * t,
    outerRadii,
    innerRadii,
    from.opening + (to.opening - from.opening) * t,
  )
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

function buildProfile(height: number, outerRadii: number[], innerRadii: number[], opening: number): ClayProfile {
  const safeHeight = clamp(height, 0.28, MAX_HEIGHT)
  const safeOuter = outerRadii.map((radius) => clamp(radius, MIN_OUTER_RADIUS, MAX_OUTER_RADIUS))
  const safeInner = safeOuter.map((outer, index) => {
    if (opening < 0.02) return 0.025
    return clamp(innerRadii[index] ?? 0.025, 0.025, Math.max(0.025, outer - MIN_WALL_THICKNESS))
  })
  return { height: safeHeight, outerRadii: safeOuter, innerRadii: safeInner, opening: clamp(opening, 0, 1) }
}

function conserveClayVolume(profile: ClayProfile, targetVolume: number): ClayProfile {
  let low = 0.72
  let high = 1.38
  let best = profile
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const scale = (low + high) * 0.5
    const candidate = buildProfile(
      profile.height,
      profile.outerRadii.map((radius) => radius * scale),
      profile.innerRadii.map((radius) => radius * scale),
      profile.opening,
    )
    best = candidate
    if (estimateClayVolume(candidate) < targetVolume) low = scale
    else high = scale
  }
  const bestVolume = estimateClayVolume(best)
  if (bestVolume > 0 && Math.abs(bestVolume - targetVolume) / targetVolume > 0.001) {
    return buildProfile(
      best.height * (targetVolume / bestVolume),
      best.outerRadii,
      best.innerRadii,
      best.opening,
    )
  }
  return best
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
