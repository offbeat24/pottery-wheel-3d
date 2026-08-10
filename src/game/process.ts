import type { CraftState, GlazeChoice, GlazeId } from './types'

export const GLAZES: Record<GlazeId, { name: string; color: number; optimalTemperature: number }> = {
  celadon: { name: '비취 청자', color: 0x7f9d87, optimalTemperature: 1240 },
  cream: { name: '쌀빛 백유', color: 0xd8c4a0, optimalTemperature: 1180 },
  iron: { name: '철유 갈색', color: 0x563c32, optimalTemperature: 1260 },
}

export const LEATHER_HARD_MOISTURE = 18
export const DRY_MOISTURE_LIMIT = 24
export const WET_MOISTURE_LIMIT = 88
const DRYING_RATE_PER_SECOND = 34

export function moistureResponse(moisture: number): {
  state: 'dry' | 'balanced' | 'wet'
  shapingFactor: number
  riskMultiplier: number
  sagRate: number
} {
  if (moisture < DRY_MOISTURE_LIMIT) {
    const wetness = Math.max(0, moisture) / DRY_MOISTURE_LIMIT
    return {
      state: 'dry',
      shapingFactor: 0.05 + wetness * wetness * 0.4,
      riskMultiplier: 1.55 + (1 - wetness) * 1.2,
      sagRate: 0,
    }
  }
  if (moisture > WET_MOISTURE_LIMIT) {
    const excess = Math.min(1, (moisture - WET_MOISTURE_LIMIT) / (100 - WET_MOISTURE_LIMIT))
    return {
      state: 'wet',
      shapingFactor: 1 - excess * 0.45,
      riskMultiplier: 1.4 + excess * 1.8,
      sagRate: 0.015 + excess * 0.075,
    }
  }
  return {
    state: 'balanced',
    shapingFactor: moisture < 34 ? 0.62 + (moisture - DRY_MOISTURE_LIMIT) * 0.038 : 1,
    riskMultiplier: 1,
    sagRate: 0,
  }
}

export function createInitialCraftState(): CraftState {
  return {
    stage: 'forming',
    moisture: 82,
    clayMass: 1200,
    reserveLumps: 2,
    handleAttached: false,
    glaze: null,
    glazeCoverage: 0,
    kilnTemperature: 1220,
    firingQuality: null,
  }
}

export function updateMoisture(state: CraftState, deltaSeconds: number, touching: boolean, speed: number): CraftState {
  if (state.stage !== 'forming') return state
  const workingLoss = touching ? 1.25 + speed * 1.65 : state.moisture > WET_MOISTURE_LIMIT ? 2.5 : 0.18
  return { ...state, moisture: Math.max(0, state.moisture - workingLoss * deltaSeconds) }
}

// 물은 물그릇에서만 나온다. 스펀지에 머금은 만큼만 점토로 옮겨가고, 다 쓰면 다시 적셔야 한다.
export const SPONGE_CAPACITY = 100
/** 문지르는 동안 1초에 옮겨가는 물의 양. 가득 찬 스펀지는 약 2.4초면 빈다. */
export const SPONGE_TRANSFER_PER_SECOND = 42

export function soakSponge(): number {
  return SPONGE_CAPACITY
}

export interface RubResult {
  state: CraftState
  spongeWater: number
}

/**
 * 젖은 스펀지로 점토를 문지른 결과. 마른 스펀지는 아무것도 옮기지 않고,
 * 이미 물이 찬 점토에는 더 들어가지 않으므로 스펀지의 물도 줄지 않는다.
 */
export function rubWater(state: CraftState, spongeWater: number, deltaSeconds: number): RubResult {
  const remaining = Math.min(SPONGE_CAPACITY, Math.max(0, spongeWater))
  if (state.stage !== 'forming' || remaining <= 0 || deltaSeconds <= 0) {
    return { state, spongeWater: remaining }
  }
  const transfer = Math.min(remaining, SPONGE_TRANSFER_PER_SECOND * deltaSeconds, 100 - state.moisture)
  if (transfer <= 0) return { state, spongeWater: remaining }
  return { state: { ...state, moisture: state.moisture + transfer }, spongeWater: remaining - transfer }
}

export function addReserveClay(state: CraftState): CraftState {
  if (state.stage !== 'forming' || state.reserveLumps <= 0) return state
  return { ...state, clayMass: state.clayMass + 180, reserveLumps: state.reserveLumps - 1, moisture: Math.min(100, state.moisture + 8) }
}

export function attachHandle(state: CraftState): CraftState {
  if (state.stage !== 'forming' || state.handleAttached) return state
  return { ...state, handleAttached: true, clayMass: state.clayMass + 90 }
}

export function finishForming(state: CraftState): CraftState {
  if (state.stage !== 'forming') return state
  return { ...state, stage: 'drying' }
}

export function updateDrying(state: CraftState, deltaSeconds: number, active: boolean): CraftState {
  if (state.stage !== 'drying' || !active) return state
  const moisture = Math.max(LEATHER_HARD_MOISTURE, state.moisture - DRYING_RATE_PER_SECOND * Math.max(0, deltaSeconds))
  return {
    ...state,
    stage: moisture <= LEATHER_HARD_MOISTURE ? 'leather-hard' : 'drying',
    moisture,
  }
}

export function applyGlaze(state: CraftState, glaze: GlazeChoice): CraftState {
  if (state.stage !== 'leather-hard' && state.stage !== 'glazing') return state
  return { ...state, stage: 'glazing', glaze, glazeCoverage: glaze === state.glaze ? state.glazeCoverage : 0 }
}

export function updateGlazeCoverage(state: CraftState, coverage: number): CraftState {
  if (state.stage !== 'glazing' || state.glaze === 'unglazed' || state.glaze === null) return state
  return { ...state, glazeCoverage: Math.min(1, Math.max(0, coverage)) }
}

export function setKilnTemperature(state: CraftState, temperature: number): CraftState {
  return { ...state, kilnTemperature: Math.round(Math.min(1300, Math.max(900, temperature))) }
}

export function firePiece(state: CraftState): CraftState {
  if (state.stage !== 'glazing' || !state.glaze) return state
  const ideal = state.glaze === 'unglazed' ? 1000 : GLAZES[state.glaze].optimalTemperature
  const temperaturePenalty = Math.abs(state.kilnTemperature - ideal) * (state.glaze === 'unglazed' ? 0.28 : 0.34)
  const coveragePenalty = state.glaze === 'unglazed' ? 0 : (1 - state.glazeCoverage) * 48
  const firingQuality = Math.round(Math.max(20, Math.min(100, 100 - temperaturePenalty - coveragePenalty)))
  return { ...state, stage: 'fired', moisture: 0, firingQuality }
}

export function wetClayColor(moisture: number): number {
  const dry = 1 - Math.min(1, Math.max(0, moisture / 82))
  return blendHex(0x9f4f38, 0xd3825d, dry)
}

export function firedClayColor(temperature: number): number {
  const t = Math.min(1300, Math.max(900, temperature))
  if (t <= 1050) return blendHex(0xc77c55, 0xa94f35, (t - 900) / 150)
  return blendHex(0xa94f35, 0x512a25, (t - 1050) / 250)
}

export function firedGlazeColor(glaze: GlazeId, temperature: number): number {
  const ideal = GLAZES[glaze].optimalTemperature
  const base = GLAZES[glaze].color
  if (temperature < ideal) {
    const severity = Math.min(1, (ideal - temperature) / 260)
    return blendHex(base, glaze === 'cream' ? 0xb9916a : 0x8d7053, severity * 0.72)
  }
  const severity = Math.min(1, (temperature - ideal) / 170)
  return blendHex(base, 0x342724, severity * 0.76)
}

function blendHex(from: number, to: number, amount: number): number {
  const t = Math.min(1, Math.max(0, amount))
  const channel = (shift: number): number => {
    const start = (from >> shift) & 0xff
    const end = (to >> shift) & 0xff
    return Math.round(start + (end - start) * t)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export function shapingEfficiency(speed: number, moisture: number): number {
  const speedFactor = speed < 0.12
    ? 0
    : speed < 0.34
      ? 0.55 + (speed - 0.12) * 1.7
      : speed <= 0.72
        ? 1
        : Math.max(0.38, 1 - (speed - 0.72) * 1.8)
  return Math.min(1, speedFactor * moistureResponse(moisture).shapingFactor)
}

export function speedRiskMultiplier(speed: number, moisture: number): number {
  const speedRisk = speed > 0.82 ? 1 + (speed - 0.82) * 7 : 1
  return speedRisk * moistureResponse(moisture).riskMultiplier
}

export function structuralPressureGain(
  deltaSeconds: number,
  speed: number,
  moisture: number,
  atShapeLimit: boolean,
): number {
  const state = moistureResponse(moisture).state
  const materialInstability = (state === 'wet' && speed > 0.52) || (state === 'dry' && speed > 0.12)
  if (!atShapeLimit && !materialInstability) return 0
  const failureDelay = atShapeLimit ? 0.58 : state === 'dry' ? 5.4 : 3.8
  return deltaSeconds / failureDelay * speedRiskMultiplier(speed, moisture)
}
