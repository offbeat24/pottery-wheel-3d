import { describe, expect, it } from 'vitest'
import {
  DRY_MOISTURE_LIMIT,
  WET_MOISTURE_LIMIT,
  createInitialCraftState,
  moistureResponse,
  rubWater,
  shapingEfficiency,
  speedRiskMultiplier,
  structuralPressureGain,
  updateMoisture,
} from '../src/game/process'

describe('MOISTURE-001 수분 물성', () => {
  it.each([
    [DRY_MOISTURE_LIMIT - 0.01, 'dry'],
    [DRY_MOISTURE_LIMIT, 'balanced'],
    [WET_MOISTURE_LIMIT, 'balanced'],
    [WET_MOISTURE_LIMIT + 0.01, 'wet'],
  ] as const)('수분 %s의 경계 상태는 %s이다', (moisture, state) => {
    expect(moistureResponse(moisture).state).toBe(state)
  })

  it('같은 중속 입력에서 적정 수분이 가장 잘 빚어지고 양 극단의 위험이 커진다', () => {
    const speed = 0.6
    const dry = 10
    const balanced = 60
    const wet = 100

    expect(shapingEfficiency(speed, balanced)).toBeGreaterThan(shapingEfficiency(speed, dry))
    expect(shapingEfficiency(speed, balanced)).toBeGreaterThan(shapingEfficiency(speed, wet))
    expect(speedRiskMultiplier(speed, dry)).toBeGreaterThan(speedRiskMultiplier(speed, balanced))
    expect(speedRiskMultiplier(speed, wet)).toBeGreaterThan(speedRiskMultiplier(speed, balanced))
    expect(moistureResponse(wet).sagRate).toBeGreaterThan(0)
    expect(moistureResponse(dry).sagRate).toBe(0)
  })

  it('마른 흙은 물로, 과습한 흙은 잠시 기다려 안전 구간으로 돌아온다', () => {
    const initial = createInitialCraftState()
    const dry = { ...initial, moisture: 10 }
    const wet = { ...initial, moisture: 100 }

    expect(moistureResponse(rubWater(dry, 100, 1).state.moisture).state).toBe('balanced')
    expect(moistureResponse(updateMoisture(wet, 5, false, 0).moisture).state).toBe('balanced')
  })

  it('과습한 흙은 중속 성형을 계속하면 붕괴 압력 임계값에 도달한다', () => {
    expect(structuralPressureGain(2, 0.6, 100, false)).toBeGreaterThanOrEqual(1)
    expect(structuralPressureGain(2, 0.6, 10, false)).toBeGreaterThan(0)
    expect(structuralPressureGain(2, 0.6, 60, false)).toBe(0)
    expect(structuralPressureGain(0.58, 0.6, 60, true)).toBe(1)
  })
})
