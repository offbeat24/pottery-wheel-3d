import { describe, expect, it } from 'vitest'
import {
  SPONGE_CAPACITY,
  SPONGE_TRANSFER_PER_SECOND,
  createInitialCraftState,
  rubWater,
  shapingEfficiency,
  soakSponge,
  speedRiskMultiplier,
  updateMoisture,
} from '../src/game/process'

const forming = (moisture: number) => ({ ...createInitialCraftState(), moisture })

describe('물그릇과 스펀지', () => {
  it('물그릇에서 적신 스펀지는 가득 찬다', () => {
    expect(soakSponge()).toBe(SPONGE_CAPACITY)
  })

  it('마른 스펀지는 아무리 문질러도 수분을 올리지 않는다', () => {
    const state = forming(40)
    const rubbed = rubWater(state, 0, 1)
    expect(rubbed.state.moisture).toBe(40)
    expect(rubbed.spongeWater).toBe(0)
    expect(rubbed.state).toBe(state)
  })

  it('젖은 스펀지로 문지르면 수분이 오르고 스펀지 물이 그만큼 줄어든다', () => {
    const rubbed = rubWater(forming(40), SPONGE_CAPACITY, 0.5)
    const transferred = SPONGE_TRANSFER_PER_SECOND * 0.5
    expect(rubbed.state.moisture).toBeCloseTo(40 + transferred)
    expect(rubbed.spongeWater).toBeCloseTo(SPONGE_CAPACITY - transferred)
  })

  it('문지르는 시간이 길수록 더 많이 전달되고 스펀지가 비면 멈춘다', () => {
    const short = rubWater(forming(20), SPONGE_CAPACITY, 0.5)
    const long = rubWater(forming(20), SPONGE_CAPACITY, 1.5)
    expect(long.state.moisture).toBeGreaterThan(short.state.moisture)

    const drained = rubWater(forming(20), 12, 10)
    expect(drained.spongeWater).toBe(0)
    expect(drained.state.moisture).toBe(32)
  })

  it('수분이 100%면 더 들어가지 않고 스펀지 물도 낭비되지 않는다', () => {
    const rubbed = rubWater(forming(100), SPONGE_CAPACITY, 1)
    expect(rubbed.state.moisture).toBe(100)
    expect(rubbed.spongeWater).toBe(SPONGE_CAPACITY)
  })

  it('고쳐 넣은 스펀지 값은 범위 안으로 자른다', () => {
    expect(rubWater(forming(50), -5, 1).spongeWater).toBe(0)
    expect(rubWater(forming(50), 9999, 0).spongeWater).toBe(SPONGE_CAPACITY)
    expect(rubWater(forming(50), SPONGE_CAPACITY, -1).state.moisture).toBe(50)
  })

  it('한 번 적신 스펀지로 마른 흙을 적정 수분까지 되살릴 수 있다', () => {
    // 마른 흙(성형 효율 급락)에서 시작해 문지르면 적정 구간으로 돌아온다.
    const dry = forming(14)
    expect(shapingEfficiency(0.55, dry.moisture)).toBeLessThan(0.2)
    const rubbed = rubWater(dry, SPONGE_CAPACITY, 1.2)
    expect(shapingEfficiency(0.55, rubbed.state.moisture)).toBe(1)
  })

  it('계속 문지르면 과습 구간에 들어가 효율이 떨어지고 위험이 커진다', () => {
    const soaked = rubWater(forming(70), SPONGE_CAPACITY, 1).state
    expect(soaked.moisture).toBeGreaterThan(92)
    expect(shapingEfficiency(0.55, soaked.moisture)).toBeLessThan(1)
    expect(speedRiskMultiplier(0.55, soaked.moisture)).toBeGreaterThan(
      speedRiskMultiplier(0.55, 70),
    )
  })

  it('바른 물은 작업하는 동안 다시 마른다', () => {
    const wet = rubWater(forming(30), SPONGE_CAPACITY, 1).state
    const worked = updateMoisture(wet, 6, true, 0.6)
    expect(worked.moisture).toBeLessThan(wet.moisture)
  })
})
