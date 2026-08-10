import { describe, expect, it } from 'vitest'
import {
  addReserveClay,
  addWater,
  applyGlaze,
  attachHandle,
  createInitialCraftState,
  finishForming,
  firePiece,
  firedClayColor,
  firedGlazeColor,
  setKilnTemperature,
  shapingEfficiency,
  updateDrying,
  updateGlazeCoverage,
  updateMoisture,
  wetClayColor,
} from '../src/game/process'

describe('현실적인 도예 제작 과정', () => {
  it('작업 중 수분이 줄고 물을 적시면 회복된다', () => {
    const initial = createInitialCraftState()
    const dry = updateMoisture(initial, 10, true, 0.6)
    expect(dry.moisture).toBeLessThan(initial.moisture)
    expect(addWater(dry).moisture).toBeGreaterThan(dry.moisture)
  })

  it('중속과 적정 수분에서 성형 효율이 가장 높다', () => {
    expect(shapingEfficiency(0.55, 70)).toBe(1)
    expect(shapingEfficiency(0.95, 70)).toBeLessThan(1)
    expect(shapingEfficiency(0.55, 10)).toBeLessThan(0.2)
  })

  it('예비 흙과 손잡이는 질량을 늘리고 사용 상태를 기록한다', () => {
    const forming = createInitialCraftState()
    const withClay = addReserveClay(forming)
    const withHandle = attachHandle(withClay)
    expect(withClay.clayMass).toBeGreaterThan(forming.clayMass)
    expect(withClay.reserveLumps).toBe(1)
    expect(withHandle.handleAttached).toBe(true)
  })

  it('성형을 마쳐도 수분을 덮어쓰지 않고 건조를 거쳐 가죽경도가 된다', () => {
    const wet = addWater(createInitialCraftState())
    const drying = finishForming(wet)
    expect(drying.stage).toBe('drying')
    expect(drying.moisture).toBe(wet.moisture)
    expect(updateDrying(drying, 1, false)).toEqual(drying)

    const partlyDry = updateDrying(drying, 1, true)
    expect(partlyDry.stage).toBe('drying')
    expect(partlyDry.moisture).toBeLessThan(wet.moisture)

    const leatherHard = updateDrying(partlyDry, 10, true)
    expect(leatherHard.stage).toBe('leather-hard')
    expect(leatherHard.moisture).toBe(18)
  })

  it('유약의 적정 온도에 가까울수록 소성 품질이 높다', () => {
    const dry = updateDrying(finishForming(createInitialCraftState()), 10, true)
    const glazed = updateGlazeCoverage(applyGlaze(dry, 'celadon'), 1)
    const ideal = firePiece(setKilnTemperature(glazed, 1240))
    const cold = firePiece(setKilnTemperature(glazed, 900))
    expect(ideal.stage).toBe('fired')
    expect(ideal.firingQuality).toBeGreaterThan(cold.firingQuality!)
  })

  it('유약 도포율이 높을수록 같은 온도에서 소성 품질이 높다', () => {
    const dry = updateDrying(finishForming(createInitialCraftState()), 10, true)
    const sparse = firePiece(updateGlazeCoverage(applyGlaze(dry, 'cream'), 0.2))
    const covered = firePiece(updateGlazeCoverage(applyGlaze(dry, 'cream'), 0.95))
    expect(covered.firingQuality).toBeGreaterThan(sparse.firingQuality!)
  })

  it('무유약과 유약은 온도에 따라 서로 다른 최종 색을 만든다', () => {
    expect(firedClayColor(900)).not.toBe(firedClayColor(1300))
    expect(firedGlazeColor('celadon', 1000)).not.toBe(firedGlazeColor('celadon', 1240))
    const dry = updateDrying(finishForming(createInitialCraftState()), 10, true)
    const unglazed = firePiece(applyGlaze(dry, 'unglazed'))
    expect(unglazed.stage).toBe('fired')
  })

  it('흙은 수분이 줄면 더 밝은 색으로 변한다', () => {
    expect(wetClayColor(82)).not.toBe(wetClayColor(18))
  })
})
