import { describe, expect, it } from 'vitest'
import { projectPointerToAxis, shapingActionFromButtons } from '../src/game/input'

describe('손 입력 해석', () => {
  it('좌·우·양쪽 마우스 버튼을 올바른 성형 동작으로 변환한다', () => {
    expect(shapingActionFromButtons(0)).toBe('idle')
    expect(shapingActionFromButtons(1)).toBe('narrow')
    expect(shapingActionFromButtons(2)).toBe('widen')
    expect(shapingActionFromButtons(3)).toBe('pull')
  })

  it('커서가 점토 윤곽 밖에 있어도 중심축 높이를 계속 계산한다', () => {
    const base = { x: 500, y: 700 }
    const top = { x: 500, y: 200 }
    expect(projectPointerToAxis({ x: 900, y: 450 }, base, top)).toBeCloseTo(0.5)
    expect(projectPointerToAxis({ x: 100, y: 325 }, base, top)).toBeCloseTo(0.75)
  })

  it('점토보다 위아래로 벗어난 커서는 안전 범위로 제한한다', () => {
    const base = { x: 500, y: 700 }
    const top = { x: 500, y: 200 }
    expect(projectPointerToAxis({ x: 500, y: 900 }, base, top)).toBe(0.03)
    expect(projectPointerToAxis({ x: 500, y: 0 }, base, top)).toBe(0.98)
  })
})
