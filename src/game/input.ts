import type { ShapingAction } from './types'

export interface ScreenPoint {
  x: number
  y: number
}

export function shapingActionFromButtons(buttons: number): ShapingAction {
  const left = (buttons & 1) !== 0
  const right = (buttons & 2) !== 0
  if (left && right) return 'pull'
  if (left) return 'narrow'
  if (right) return 'widen'
  return 'idle'
}

export function projectPointerToAxis(
  pointer: ScreenPoint,
  base: ScreenPoint,
  top: ScreenPoint,
): number {
  const axisX = top.x - base.x
  const axisY = top.y - base.y
  const axisLengthSquared = axisX * axisX + axisY * axisY
  if (axisLengthSquared < 0.0001) return 0.5

  const pointerX = pointer.x - base.x
  const pointerY = pointer.y - base.y
  const projection = (pointerX * axisX + pointerY * axisY) / axisLengthSquared
  return Math.min(0.98, Math.max(0.03, projection))
}
