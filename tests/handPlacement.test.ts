import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { computeHandTargets } from '../src/game/handPlacement'

const center = new THREE.Vector3(0, 1.6, 0)
const towardCamera = new THREE.Vector3(0, 0, 1)

describe('카메라 상대 손 배치', () => {
  it('카메라의 화면 좌우 방향에 맞춰 두 손을 배치한다', () => {
    const fromFront = computeHandTargets({
      center,
      cameraRight: new THREE.Vector3(1, 0, 0),
      towardCamera,
      outerRadius: 0.8,
      innerRadius: 0.6,
      action: 'narrow',
      shaping: true,
    })
    expect(fromFront.left.x).toBeLessThan(0)
    expect(fromFront.right.x).toBeGreaterThan(0)
    expect(fromFront.left.y).toBeCloseTo(center.y)

    const fromSide = computeHandTargets({
      center,
      cameraRight: new THREE.Vector3(0, 0, -1),
      towardCamera: new THREE.Vector3(1, 0, 0),
      outerRadius: 0.8,
      innerRadius: 0.6,
      action: 'narrow',
      shaping: true,
    })
    expect(fromSide.left.z).toBeGreaterThan(0)
    expect(fromSide.right.z).toBeLessThan(0)
  })

  it('넓히는 손은 점토 안쪽이면서 카메라 앞쪽에 보여준다', () => {
    const targets = computeHandTargets({
      center,
      cameraRight: new THREE.Vector3(1, 0, 0),
      towardCamera,
      outerRadius: 0.9,
      innerRadius: 0.68,
      action: 'widen',
      shaping: true,
    })
    expect(targets.right.x).toBeLessThan(0.9)
    expect(targets.right.z).toBeGreaterThan(0.6)
    expect(targets.right.y).toBeGreaterThan(center.y)
  })

  it('시점 조절 중에는 손을 작업대 양옆의 대기 위치로 보낸다', () => {
    const targets = computeHandTargets({
      center,
      cameraRight: new THREE.Vector3(1, 0, 0),
      towardCamera,
      outerRadius: 0.8,
      innerRadius: 0.6,
      action: 'idle',
      shaping: false,
    })
    expect(targets.left.y).toBe(0.72)
    expect(targets.right.y).toBe(0.72)
    expect(targets.left.x).toBeLessThan(-1.7)
    expect(targets.right.x).toBeGreaterThan(1.7)
  })
})
