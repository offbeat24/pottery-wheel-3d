import { describe, expect, it } from 'vitest'
import type { WheelState } from '../src/game/types'
import { CAMERA_ENTER_SPEED, SHAPING_ENTER_SPEED, updateWheel } from '../src/game/wheel'

describe('물레 상태', () => {
  it('페달을 밟는 동안 가속하고 놓으면 감속한다', () => {
    const stopped: WheelState = { speed: 0, pedalDown: true, mode: 'camera' }
    const accelerated = updateWheel(stopped, 0.5)
    const decelerated = updateWheel({ ...accelerated, pedalDown: false }, 0.5)
    expect(accelerated.speed).toBeGreaterThan(0)
    expect(decelerated.speed).toBeLessThan(accelerated.speed)
  })

  it('서로 다른 임곗값으로 카메라와 성형 모드를 전환한다', () => {
    const entered = updateWheel({ speed: SHAPING_ENTER_SPEED - 0.01, pedalDown: true, mode: 'camera' }, 0.1)
    expect(entered.mode).toBe('shaping')

    const staysShaping = updateWheel({ speed: CAMERA_ENTER_SPEED + 0.04, pedalDown: false, mode: 'shaping' }, 0.01)
    expect(staysShaping.mode).toBe('shaping')

    const stopped = updateWheel({ speed: CAMERA_ENTER_SPEED + 0.001, pedalDown: false, mode: 'shaping' }, 0.1)
    expect(stopped.mode).toBe('camera')
  })

  it('속도를 0과 1 사이로 제한한다', () => {
    expect(updateWheel({ speed: 0.99, pedalDown: true, mode: 'shaping' }, 10).speed).toBe(1)
    expect(updateWheel({ speed: 0.01, pedalDown: false, mode: 'camera' }, 10).speed).toBe(0)
  })
})
