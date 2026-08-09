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
import { scoreClay, sellPrice } from '../src/game/scoring'

describe('주문 채점', () => {
  it.each(ORDERS)('$name 주문은 손으로 도달할 수 있는 범위 안에 있다', (order) => {
    expect(order.outerRadii).toHaveLength(PROFILE_SAMPLES)
    expect(order.height).toBeGreaterThanOrEqual(MIN_HEIGHT)
    expect(order.height).toBeLessThanOrEqual(MAX_HEIGHT)
    expect(Math.min(...order.outerRadii)).toBeGreaterThan(CUT_LIMIT_RADIUS)
    expect(Math.max(...order.outerRadii)).toBeLessThan(WIDEN_LIMIT_RADIUS)
  })

  it.each(ORDERS)('$name 주문은 목표 단면과 같으면 99점, 초기 점토보다 높다', (order) => {
    const exact = buildSafeProfile(order.height, order.outerRadii)
    expect(scoreClay(exact, order).total).toBeGreaterThanOrEqual(99)
    expect(scoreClay(exact, order).silhouette).toBeGreaterThan(scoreClay(createInitialClay(), order).silhouette)
  })

  it('판매가는 점수와 함께 오르고 실패작도 값이 남는다', () => {
    const price = (total: number): number => sellPrice({ silhouette: 0, height: 0, smoothness: 0, total })
    expect(price(0)).toBe(1000)
    expect(price(100)).toBe(30000)
    expect(price(70)).toBeGreaterThan(price(60))
    expect(price(87) % 100).toBe(0)
  })

  it('잘 만든 작품과 못 만든 작품의 값 차이가 뚜렷하다', () => {
    const price = (total: number): number => sellPrice({ silhouette: 0, height: 0, smoothness: 0, total })
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

  it('주문 id는 중복되지 않는다', () => {
    expect(new Set(ORDERS.map((order) => order.id)).size).toBe(ORDERS.length)
  })

  it('동일한 입력을 항상 동일하게 채점한다', () => {
    const clay = createInitialClay()
    expect(scoreClay(clay, ORDERS[1])).toEqual(scoreClay(clay, ORDERS[1]))
  })
})
