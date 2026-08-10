import { describe, expect, it } from 'vitest'
import { MAX_HEIGHT } from '../src/game/clay'
import * as process from '../src/game/process'
import {
  addReserveClay,
  FULL_EFFICIENCY_MAX_SPEED,
  rubWater,
  createInitialCraftState,
  shapingEfficiency,
  updateMoisture,
  wetClayColor,
} from '../src/game/process'

describe('현실적인 도예 제작 과정', () => {
  it('작업 중 수분이 줄고 물을 적시면 회복된다', () => {
    const initial = createInitialCraftState()
    const dry = updateMoisture(initial, 10, true, 0.6)
    expect(dry.moisture).toBeLessThan(initial.moisture)
    expect(rubWater(dry, 100, 1).state.moisture).toBeGreaterThan(dry.moisture)
  })

  it('중속과 적정 수분에서 성형 효율이 가장 높다', () => {
    expect(FULL_EFFICIENCY_MAX_SPEED).toBe(0.85)
    expect(shapingEfficiency(0.55, 70)).toBe(1)
    expect(shapingEfficiency(0.85, 70)).toBe(1)
    expect(shapingEfficiency(0.8501, 70)).toBeLessThan(1)
    expect(shapingEfficiency(0.9, 70)).toBeCloseTo(0.91)
    expect(shapingEfficiency(1, 70)).toBeCloseTo(0.73)
    expect(shapingEfficiency(1, 10)).toBeLessThan(shapingEfficiency(1, 70))
    expect(shapingEfficiency(1, 100)).toBeLessThan(shapingEfficiency(1, 70))
    expect(shapingEfficiency(0.55, 10)).toBeLessThan(0.2)
  })

  it('예비 흙은 질량을 늘리고 남은 개수를 줄인다', () => {
    const forming = createInitialCraftState()
    const withClay = addReserveClay(forming)
    expect(withClay.clayMass).toBeGreaterThan(forming.clayMass)
    expect(withClay.reserveLumps).toBe(1)
    expect(addReserveClay(forming, MAX_HEIGHT)).toBe(forming)
  })

  it('제작 상태와 계산에는 형태 맞추기에 필요한 값만 둔다', () => {
    expect(Object.keys(createInitialCraftState()).sort()).toEqual(['clayMass', 'moisture', 'reserveLumps'])
    expect(Object.keys(process)).not.toEqual(expect.arrayContaining([
      'applyGlaze', 'attachHandle', 'finishForming', 'firePiece', 'setKilnTemperature', 'updateDrying',
    ]))
  })

  it('흙은 수분이 줄면 더 밝은 색으로 변한다', () => {
    expect(wetClayColor(82)).not.toBe(wetClayColor(20))
  })
})
