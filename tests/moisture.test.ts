import { describe, expect, it } from 'vitest'
import { DRY_SURFACE_THRESHOLD, MAX_TEARING, surfaceTearing } from '../src/game/moisture'
import {
  MAX_FRAGILITY,
  MIN_WORKABILITY,
  fragility,
  moistureLabel,
  updateMoisture,
  workability,
} from '../src/game/moisture'

const base = { moisture: 1, deltaSeconds: 1, spinning: true, shaping: false, wetting: false }

describe('흙 마름', () => {
  it('성형 중일 때 그냥 돌릴 때보다 빨리 마른다', () => {
    const spinning = updateMoisture(base)
    const shaping = updateMoisture({ ...base, shaping: true })

    expect(spinning).toBeLessThan(1)
    expect(shaping).toBeLessThan(spinning)
  })

  it('물레가 멈춰 있으면 마르지 않는다', () => {
    expect(updateMoisture({ ...base, moisture: 0.5, spinning: false, shaping: true })).toBe(0.5)
  })

  it('물을 묻히면 회복하고 1을 넘지 않는다', () => {
    expect(updateMoisture({ ...base, moisture: 0.2, wetting: true })).toBeGreaterThan(0.2)
    expect(updateMoisture({ ...base, moisture: 0.9, wetting: true })).toBe(1)
  })

  it('아무리 말라도 0 아래로 내려가지 않는다', () => {
    expect(updateMoisture({ ...base, moisture: 0.01, deltaSeconds: 100, shaping: true })).toBe(0)
  })

  it('마른 흙도 조작이 잠기지는 않는다', () => {
    // 0 이 되면 손이 멈춘 것처럼 보여 고장으로 읽힌다.
    expect(workability(0)).toBe(MIN_WORKABILITY)
    expect(workability(0)).toBeGreaterThan(0)
    expect(workability(1)).toBe(1)
    expect(workability(0.5)).toBeGreaterThan(workability(0.2))
  })

  it('마를수록 구조 한계에 빨리 닿는다', () => {
    expect(fragility(1)).toBe(1)
    expect(fragility(0)).toBe(MAX_FRAGILITY)
    expect(fragility(0.2)).toBeGreaterThan(fragility(0.8))
  })

  it('물기 구간마다 다른 이름을 붙인다', () => {
    expect(new Set([moistureLabel(1), moistureLabel(0.45), moistureLabel(0)]).size).toBe(3)
  })
})

describe('마른 흙 표면 트임', () => {
  it('젖어 있으면 트지 않는다', () => {
    expect(surfaceTearing(1)).toBe(0)
    expect(surfaceTearing(DRY_SURFACE_THRESHOLD)).toBe(0)
  })

  it('마를수록 가파르게 커지고 상한을 넘지 않는다', () => {
    expect(surfaceTearing(0.4)).toBeGreaterThan(0)
    expect(surfaceTearing(0.1)).toBeGreaterThan(surfaceTearing(0.4) * 2)
    // 꾸덕(0.45)에서도 이미 눈에 띄게 튼다.
    expect(surfaceTearing(0.45)).toBeGreaterThan(MAX_TEARING * 0.2)
    expect(surfaceTearing(0)).toBeCloseTo(MAX_TEARING, 5)
  })
})
