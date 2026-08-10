import { describe, expect, it } from 'vitest'
import { buildSafeProfile, createInitialClay } from '../src/game/clay'
import { ORDERS } from '../src/game/orders'
import { scoreClay, sellPrice } from '../src/game/scoring'

describe('주문 채점', () => {
  it('목표 단면과 같은 점토는 99점 이상이다', () => {
    const order = ORDERS[0]
    const exact = buildSafeProfile(order.height, order.outerRadii)
    expect(scoreClay(exact, order).total).toBeGreaterThanOrEqual(99)
  })

  it('목표와 멀어지면 실루엣 점수가 감소한다', () => {
    const order = ORDERS[2]
    const exact = buildSafeProfile(order.height, order.outerRadii)
    const initial = createInitialClay()
    expect(scoreClay(exact, order).silhouette).toBeGreaterThan(scoreClay(initial, order).silhouette)
  })

  it('동일한 입력을 항상 동일하게 채점한다', () => {
    const clay = createInitialClay()
    expect(scoreClay(clay, ORDERS[1])).toEqual(scoreClay(clay, ORDERS[1]))
  })

  it('점수 곡선으로 기본 판매가를 계산한다', () => {
    expect([30, 60, 87, 100].map((score) => sellPrice(score))).toEqual([2600, 9500, 21800, 30000])
    expect(sellPrice(0)).toBe(1000)
    expect(sellPrice(100)).toBe(30000)
  })
})
