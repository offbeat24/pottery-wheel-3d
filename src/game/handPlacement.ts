import * as THREE from 'three'
import type { ShapingAction } from './types'

export interface HandPlacementInput {
  center: THREE.Vector3
  cameraRight: THREE.Vector3
  towardCamera: THREE.Vector3
  outerRadius: number
  innerRadius: number
  action: ShapingAction
  shaping: boolean
}

export interface HandTargets {
  left: THREE.Vector3
  right: THREE.Vector3
}

export function computeHandTargets(input: HandPlacementInput): HandTargets {
  const { center, cameraRight, towardCamera, outerRadius, innerRadius, action, shaping } = input
  const left = center.clone().addScaledVector(cameraRight, -1.8).addScaledVector(towardCamera, 0.6)
  const right = center.clone().addScaledVector(cameraRight, 1.8).addScaledVector(towardCamera, 0.6)
  left.y = 0.72
  right.y = 0.72

  if (!shaping) return { left, right }

  const leftDistance = outerRadius + (action === 'narrow' || action === 'pull' ? 0.1 : 0.3)
  left.copy(center).addScaledVector(cameraRight, -leftDistance).addScaledVector(towardCamera, 0.2)

  if (action === 'widen') {
    right.copy(center)
      .addScaledVector(cameraRight, Math.max(0.14, innerRadius * 0.52))
      .addScaledVector(towardCamera, outerRadius * 0.76)
    right.y += 0.07
  } else {
    const rightDistance = outerRadius + (action === 'pull' ? 0.1 : 0.3)
    right.copy(center).addScaledVector(cameraRight, rightDistance).addScaledVector(towardCamera, 0.2)
  }

  return { left, right }
}
