import { describe, expect, it } from 'vitest'
import { availableOrders } from '../src/game/orders'
import { CARVING_KNIFE, SHOP_ITEMS, WIDE_STUDIO, parseOwned, priceMultiplier } from '../src/game/shop'
import { sellPrice } from '../src/game/scoring'

describe('공방 상점', () => {
  it('저장된 보유 목록에서 아는 물건만 살린다', () => {
    expect(parseOwned(JSON.stringify([CARVING_KNIFE, 'free-money']))).toEqual([CARVING_KNIFE])
    expect(parseOwned('{')).toEqual([])
    expect(parseOwned(null)).toEqual([])
  })

  it('이사한 공방은 판매가를 올린다', () => {
    const score = { silhouette: 80, height: 80, smoothness: 80, total: 80 }
    expect(priceMultiplier([])).toBe(1)
    expect(sellPrice(score, priceMultiplier([WIDE_STUDIO]))).toBeGreaterThan(sellPrice(score))
  })

  it('조각칼 주문은 조각칼을 가져야 열린다', () => {
    const locked = availableOrders([])
    const unlocked = availableOrders([CARVING_KNIFE])
    expect(locked.every((order) => order.requires === undefined)).toBe(true)
    expect(unlocked.length).toBeGreaterThan(locked.length)
    expect(unlocked.some((order) => order.requires === CARVING_KNIFE)).toBe(true)
  })

  it('상점 물건의 id는 중복되지 않고 값이 있다', () => {
    expect(new Set(SHOP_ITEMS.map((item) => item.id)).size).toBe(SHOP_ITEMS.length)
    expect(SHOP_ITEMS.every((item) => item.price > 0)).toBe(true)
  })
})
