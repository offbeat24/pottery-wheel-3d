import type { CraftState } from './types'
import { MAX_HEIGHT } from './clay'

export const DRY_MOISTURE_LIMIT = 24
export const WET_MOISTURE_LIMIT = 88

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
    moisture: 82,
    clayMass: 1200,
    reserveLumps: 2,
  }
}

export function updateMoisture(state: CraftState, deltaSeconds: number, touching: boolean, speed: number): CraftState {
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
  if (remaining <= 0 || deltaSeconds <= 0) {
    return { state, spongeWater: remaining }
  }
  const transfer = Math.min(remaining, SPONGE_TRANSFER_PER_SECOND * deltaSeconds, 100 - state.moisture)
  if (transfer <= 0) return { state, spongeWater: remaining }
  return { state: { ...state, moisture: state.moisture + transfer }, spongeWater: remaining - transfer }
}

export function addReserveClay(state: CraftState, currentHeight = 0): CraftState {
  if (state.reserveLumps <= 0 || currentHeight >= MAX_HEIGHT) return state
  return { ...state, clayMass: state.clayMass + 180, reserveLumps: state.reserveLumps - 1, moisture: Math.min(100, state.moisture + 8) }
}

export function wetClayColor(moisture: number): number {
  const dry = 1 - Math.min(1, Math.max(0, moisture / 82))
  return blendHex(0x9f4f38, 0xd3825d, dry)
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
