import { describe, expect, it } from 'vitest'
import { PROFILE_SAMPLES } from '../src/game/clay'
import { parseGallery } from '../src/game/gallery'

const radii = (value = 0.7): number[] => Array.from({ length: PROFILE_SAMPLES }, () => value)

describe('전시 저장 복원', () => {
  it('저장한 작품을 그대로 되살린다', () => {
    const saved = JSON.stringify({ 'morning-cup': { height: 1.4, outerRadii: radii() } })
    expect(parseGallery(saved)).toEqual({ 'morning-cup': { height: 1.4, outerRadii: radii() } })
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
