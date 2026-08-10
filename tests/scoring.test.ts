import { describe, expect, it } from 'vitest'
import { buildSafeProfile, createInitialClay } from '../src/game/clay'
import { ORDERS } from '../src/game/orders'
import { firingMultiplier, paceMultiplier, scoreClay, sellPrice } from '../src/game/scoring'

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
    expect(sellPrice(0, 1, 0.7)).toBe(700)
    expect(sellPrice(100, 1, 1.35)).toBe(40500)
  })

  it('굽기 품질은 점수와 함께 곡선 안에서 증폭된다', () => {
    expect(sellPrice(87, 0.65)).toBe(8400)
    expect(sellPrice(87, 0.5)).toBe(4900)
    expect(firingMultiplier(20)).toBe(0.5)
    expect(firingMultiplier(100)).toBe(1)
    expect(firingMultiplier(-10)).toBe(0.5)
    expect(firingMultiplier(120)).toBe(1)
  })

  it('빠른 작업 보너스는 흙을 만진 시간만큼만 적용한다', () => {
    expect(paceMultiplier(15, 0)).toBe(1)
    expect(paceMultiplier(15, 4)).toBeCloseTo(1.175)
    expect(paceMultiplier(15, 8)).toBe(1.35)
    expect(paceMultiplier(15, 80)).toBe(1.35)
    expect(paceMultiplier(90, 8)).toBe(0.75)
    expect(paceMultiplier(150, 8)).toBe(0.7)
  })
})
