import type { InteractionMode, WheelState } from './types'

export const WHEEL_ACCELERATION = 0.62
export const WHEEL_DECELERATION = 0.28
export const SHAPING_ENTER_SPEED = 0.1
export const CAMERA_ENTER_SPEED = 0.035

export function updateWheel(state: WheelState, deltaSeconds: number): WheelState {
  const change = state.pedalDown ? WHEEL_ACCELERATION : -WHEEL_DECELERATION
  const speed = Math.min(1, Math.max(0, state.speed + change * deltaSeconds))
  let mode: InteractionMode = state.mode

  if (mode === 'camera' && speed >= SHAPING_ENTER_SPEED) mode = 'shaping'
  if (mode === 'shaping' && speed <= CAMERA_ENTER_SPEED) mode = 'camera'

  return { ...state, speed, mode }
}
