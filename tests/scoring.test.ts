import { describe, expect, it } from 'vitest'
import {
  buildSafeProfile,
  createInitialClay,
  CUT_LIMIT_RADIUS,
  MAX_HEIGHT,
  MIN_HEIGHT,
  PROFILE_SAMPLES,
  WIDEN_LIMIT_RADIUS,
} from '../src/game/clay'
import { ORDERS } from '../src/game/orders'
import { CARVING_KNIFE } from '../src/game/shop'
import {
  FIRING_SECONDS,
  FIRING_WINDOW,
  EXTRA_GROOVE_PENALTY,
  MAX_PACE,
  MIN_PACE,
  PACE_SECONDS,
  PACE_WORK_SECONDS,
  firingQuality,
  paceMultiplier,
  techniqueScore,
  scoreClay,
  sellPrice,
} from '../src/game/scoring'

describe('주문 채점', () => {
  it.each(ORDERS)('$name 주문은 손으로 도달할 수 있는 범위 안에 있다', (order) => {
    expect(order.outerRadii).toHaveLength(PROFILE_SAMPLES)
    expect(order.height).toBeGreaterThanOrEqual(MIN_HEIGHT)
    expect(order.height).toBeLessThanOrEqual(MAX_HEIGHT)
    expect(Math.min(...order.outerRadii)).toBeGreaterThan(CUT_LIMIT_RADIUS)
    expect(Math.max(...order.outerRadii)).toBeLessThan(WIDEN_LIMIT_RADIUS)
  })

  // 기법 주문은 형태만 맞아도 만점이 아니다. 요구한 새김까지 했을 때가 만점이다.
  it.each(ORDERS)('$name 주문은 목표 단면과 요구한 기법을 채우면 99점, 초기 점토보다 높다', (order) => {
    const exact = buildSafeProfile(order.height, order.outerRadii)
    const carvings = order.technique?.grooves ?? []
    expect(scoreClay(exact, order, 0, carvings).total).toBeGreaterThanOrEqual(99)
    expect(scoreClay(exact, order).silhouette).toBeGreaterThan(scoreClay(createInitialClay(), order).silhouette)
  })

  it.each(ORDERS.filter((order) => order.technique))('$name 주문은 새김을 빠뜨리면 만점이 되지 않는다', (order) => {
    const exact = buildSafeProfile(order.height, order.outerRadii)
    expect(scoreClay(exact, order).total).toBeLessThan(85)
  })

  it('판매가는 점수와 함께 오르고 실패작도 값이 남는다', () => {
    const price = (total: number): number => sellPrice({ silhouette: 0, height: 0, smoothness: 0, technique: 0, total })
    expect(price(0)).toBe(1000)
    expect(price(100)).toBe(30000)
    expect(price(70)).toBeGreaterThan(price(60))
    expect(price(87) % 100).toBe(0)
  })

  it('잘 만든 작품과 못 만든 작품의 값 차이가 뚜렷하다', () => {
    const price = (total: number): number => sellPrice({ silhouette: 0, height: 0, smoothness: 0, technique: 0, total })
    // 예전 선형 가격에서는 60점과 95점이 1.3배 차이였다.
    expect(price(95) / price(60)).toBeGreaterThan(2)
    expect(price(60) / price(30)).toBeGreaterThan(2)
  })

  it('표면이 트면 매끄러움이 깎이고 총점과 값이 내려간다', () => {
    const order = ORDERS[0]
    const exact = buildSafeProfile(order.height, order.outerRadii)
    const clean = scoreClay(exact, order)
    const torn = scoreClay(exact, order, 1)
    expect(torn.smoothness).toBeLessThan(clean.smoothness * 0.3)
    expect(torn.total).toBeLessThan(clean.total)
    expect(sellPrice(torn)).toBeLessThan(sellPrice(clean))
  })

  it('알맞은 때에 꺼내야 굽기가 100%다', () => {
    expect(firingQuality(FIRING_SECONDS)).toBe(1)
    expect(firingQuality(FIRING_SECONDS + FIRING_WINDOW)).toBe(1)
    expect(firingQuality(FIRING_SECONDS - FIRING_WINDOW)).toBe(1)
  })

  it('일찍 꺼내면 늦게 꺼낸 것보다 더 깎이고, 바닥은 0.5다', () => {
    const early = firingQuality(FIRING_SECONDS - 13)
    const late = firingQuality(FIRING_SECONDS + 13)
    expect(early).toBeLessThan(1)
    expect(early).toBeLessThan(late)
    expect(firingQuality(0)).toBe(0.5)
    expect(firingQuality(600)).toBe(0.5)
  })

  it('주문 id는 중복되지 않는다', () => {
    expect(new Set(ORDERS.map((order) => order.id)).size).toBe(ORDERS.length)
  })

  it('동일한 입력을 항상 동일하게 채점한다', () => {
    const clay = createInitialClay()
    expect(scoreClay(clay, ORDERS[1])).toEqual(scoreClay(clay, ORDERS[1]))
  })
})

describe('작업 속도 값', () => {
  it('기준 시간에는 값이 그대로고 빠를수록 오르고 느릴수록 내려간다', () => {
    const worked = PACE_WORK_SECONDS
    expect(paceMultiplier(PACE_SECONDS, worked)).toBeCloseTo(1)
    expect(paceMultiplier(30, worked)).toBeGreaterThan(1)
    expect(paceMultiplier(30, worked)).toBeGreaterThan(paceMultiplier(45, worked))
    expect(paceMultiplier(120, worked)).toBeLessThan(1)
    expect(paceMultiplier(90, worked)).toBeGreaterThan(paceMultiplier(120, worked))
  })

  it('배수는 정해진 범위를 넘지 않는다', () => {
    expect(paceMultiplier(1, 60)).toBeLessThanOrEqual(MAX_PACE)
    expect(paceMultiplier(9999, 60)).toBe(MIN_PACE)
    expect(paceMultiplier(0)).toBe(1)
    expect(paceMultiplier(Number.NaN)).toBe(1)
  })

  it('흙을 만지지 않고 바로 완성하면 속도 보너스가 없다', () => {
    expect(paceMultiplier(3, 0)).toBe(1)
    expect(paceMultiplier(3, PACE_WORK_SECONDS / 2)).toBeLessThan(paceMultiplier(3, PACE_WORK_SECONDS))
    // 느린 쪽 감점은 만진 시간과 무관하게 그대로 적용된다.
    expect(paceMultiplier(150, 0)).toBe(MIN_PACE)
  })

  it('같은 점수면 빨리 만든 작품이 더 비싸다', () => {
    const score = { silhouette: 80, height: 80, smoothness: 80, technique: 0, total: 80 }
    const fast = sellPrice(score, paceMultiplier(25, 20))
    const slow = sellPrice(score, paceMultiplier(150, 40))
    expect(fast).toBeGreaterThan(slow)
    // 빨리 만든 실패작은 천천히 만든 좋은 작품보다 싸다.
    const rushedBad = sellPrice({ silhouette: 40, height: 40, smoothness: 40, technique: 0, total: 40 }, paceMultiplier(20, 20))
    expect(rushedBad).toBeLessThan(slow)
  })
})

describe('도구 기법 채점', () => {
  const carved = ORDERS.filter((order) => order.technique)
  const cup = ORDERS.find((order) => order.id === 'carved-cup')!
  const jar = ORDERS.find((order) => order.id === 'carved-jar')!
  const shaped = (order: typeof cup) => buildSafeProfile(order.height, order.outerRadii)

  it('기법 요구가 있는 주문은 도구를 함께 요구한다', () => {
    expect(carved.length).toBeGreaterThan(0)
    for (const order of carved) {
      expect(order.requires).toBe(order.technique!.tool)
      expect(order.technique!.tool).toBe(CARVING_KNIFE)
      expect(order.technique!.grooves.every((groove) => groove > 0 && groove < 1)).toBe(true)
    }
  })

  it('라운드가 올라가면 요구가 늘고 오차가 좁아진다', () => {
    expect(jar.technique!.grooves.length).toBeGreaterThan(cup.technique!.grooves.length)
    expect(jar.technique!.tolerance).toBeLessThan(cup.technique!.tolerance)
    expect(jar.technique!.ordered).toBe(true)
  })

  it('요구가 없는 주문은 기법 만점이고 총점 배점이 예전과 같다', () => {
    const plain = ORDERS.find((order) => !order.technique)!
    const exact = buildSafeProfile(plain.height, plain.outerRadii)
    expect(techniqueScore(exact, plain)).toBe(100)
    expect(scoreClay(exact, plain).technique).toBe(100)
    expect(scoreClay(exact, plain).total).toBeGreaterThanOrEqual(99)
  })

  it('요구한 자리에 새기면 높고, 새기지 않으면 0이다', () => {
    expect(techniqueScore(shaped(cup), cup, [0.5])).toBe(100)
    expect(techniqueScore(shaped(cup), cup, [])).toBe(0)
    expect(techniqueScore(shaped(cup), cup, [0.2])).toBe(0)
  })

  it('오차 한계 안쪽의 심까지는 맞춘 것으로 보고, 그 밖은 멀어질수록 내려간다', () => {
    // 조각칼 오차 10%p · 심 4%p. 커서 정밀도가 2%p 남짓이라 심이 없으면 정확히 겨눠도 만점이 안 나온다.
    expect(techniqueScore(shaped(cup), cup, [0.5])).toBe(100)
    expect(techniqueScore(shaped(cup), cup, [0.53])).toBe(100)
    const near = techniqueScore(shaped(cup), cup, [0.56])
    const far = techniqueScore(shaped(cup), cup, [0.59])
    expect(near).toBeLessThan(100)
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
  })

  it('순서를 요구하는 주문은 아래에서 위로 새겨야 만점이다', () => {
    const inOrder = techniqueScore(shaped(jar), jar, [0.6, 0.68, 0.76])
    const reversed = techniqueScore(shaped(jar), jar, [0.76, 0.68, 0.6])
    expect(inOrder).toBe(100)
    expect(reversed).toBeLessThan(inOrder)
    expect(reversed).toBeGreaterThan(0)
  })

  it('요구보다 많이 새기면 군더더기로 깎인다', () => {
    const clean = techniqueScore(shaped(jar), jar, [0.6, 0.68, 0.76])
    const messy = techniqueScore(shaped(jar), jar, [0.6, 0.68, 0.76, 0.3, 0.9])
    expect(messy).toBeLessThan(clean)
    expect(messy).toBeCloseTo(clean * (1 - EXTRA_GROOVE_PENALTY * 2), 0)
  })

  it('새긴 기록만 남고 홈이 뭉개졌으면 점수도 사라진다', () => {
    // 주문 단면에는 홈이 있지만, 물로 다듬어 평평해진 몸통에는 없다.
    const flat = buildSafeProfile(cup.height, cup.outerRadii.map(() => 0.7))
    expect(techniqueScore(flat, cup, [0.5])).toBe(0)
  })

  it('기법 점수가 총점을 움직인다', () => {
    const profile = shaped(jar)
    const done = scoreClay(profile, jar, 0, [0.6, 0.68, 0.76])
    const skipped = scoreClay(profile, jar, 0, [])
    expect(done.total).toBeGreaterThan(skipped.total)
    expect(done.total - skipped.total).toBeGreaterThanOrEqual(19)
  })
})

describe('판매가 구성', () => {
  const score = (total: number) => ({ silhouette: 0, height: 0, smoothness: 0, technique: 0, total })

  it('굽기는 총점에 곱해져 곡선을 한 번 더 통과하므로 효과가 증폭된다', () => {
    const perfect = sellPrice(score(87))
    const overbaked = sellPrice(score(Math.round(87 * 0.65)))
    // 값 배수로 곱했다면 0.65배였겠지만, 총점에 곱하면 그보다 훨씬 많이 깎인다.
    expect(overbaked / perfect).toBeLessThan(0.5)
    expect(overbaked / perfect).toBeGreaterThan(0.3)
  })

  it('작업 속도와 공방 배수는 곡선 밖에서 곱해진다', () => {
    expect(sellPrice(score(100), 2 * MAX_PACE)).toBe(81000)
    expect(sellPrice(score(0), MIN_PACE)).toBe(700)
  })

  it('실효 상한과 하한이 문서와 같다', () => {
    const highest = sellPrice({ ...score(100), total: Math.round(100 * 1) }, 2 * MAX_PACE)
    const lowest = sellPrice({ ...score(0), total: Math.round(0 * 0.5) }, 1 * MIN_PACE)
    expect(highest).toBe(81000)
    expect(lowest).toBe(700)
  })
})
