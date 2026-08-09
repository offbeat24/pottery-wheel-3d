import { describe, expect, it } from 'vitest'
import { PROFILE_SAMPLES } from '../src/game/clay'
import { parseEarnings, parseGallery } from '../src/game/gallery'

const radii = (value = 0.7): number[] => Array.from({ length: PROFILE_SAMPLES }, () => value)

describe('전시 저장 복원', () => {
  it('저장한 작품을 그대로 되살린다', () => {
    const saved = JSON.stringify({ 'morning-cup': { height: 1.4, outerRadii: radii(), damage: 0.4 } })
    expect(parseGallery(saved)).toEqual({ 'morning-cup': { height: 1.4, outerRadii: radii(), damage: 0.4 } })
  })

  it('트임 값이 없거나 범위를 벗어난 저장본은 0으로 본다', () => {
    const noDamage = JSON.stringify({ old: { height: 1.4, outerRadii: radii() } })
    const badDamage = JSON.stringify({ hacked: { height: 1.4, outerRadii: radii(), damage: -5 } })
    expect(parseGallery(noDamage).old.damage).toBe(0)
    expect(parseGallery(badDamage).hacked.damage).toBe(0)
  })

  it('빈 값이나 깨진 JSON은 빈 전시로 취급한다', () => {
    expect(parseGallery(null)).toEqual({})
    expect(parseGallery('{')).toEqual({})
    expect(parseGallery('[1,2,3]')).toEqual({})
  })

  it('형태가 어긋난 항목만 버리고 나머지는 살린다', () => {
    const saved = JSON.stringify({
      good: { height: 1.4, outerRadii: radii() },
      shortRadii: { height: 1.4, outerRadii: [0.7, 0.7] },
      badHeight: { height: 99, outerRadii: radii() },
      nanRadius: { height: 1.4, outerRadii: [Number.NaN, ...radii().slice(1)] },
      nothing: null,
    })
    expect(Object.keys(parseGallery(saved))).toEqual(['good'])
  })
})

describe('수익 복원', () => {
  it('저장된 수익을 정수로 읽는다', () => {
    expect(parseEarnings('12400')).toBe(12400)
    expect(parseEarnings('12400.9')).toBe(12400)
  })

  it('없거나 음수거나 숫자가 아니면 0으로 시작한다', () => {
    expect(parseEarnings(null)).toBe(0)
    expect(parseEarnings('많이')).toBe(0)
    expect(parseEarnings('-500')).toBe(0)
  })
})
