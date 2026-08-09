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
    expect(price(0)).toBe(4000)
    expect(price(100)).toBe(16000)
    expect(price(50)).toBeGreaterThan(price(49))
    expect(price(87) % 100).toBe(0)
  })

  it('주문 id는 중복되지 않는다', () => {
    expect(new Set(ORDERS.map((order) => order.id)).size).toBe(ORDERS.length)
  })

  it('동일한 입력을 항상 동일하게 채점한다', () => {
    const clay = createInitialClay()
    expect(scoreClay(clay, ORDERS[1])).toEqual(scoreClay(clay, ORDERS[1]))
  })
})
