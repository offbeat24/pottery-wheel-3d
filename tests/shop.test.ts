import { describe, expect, it } from 'vitest'
import { availableOrders } from '../src/game/orders'
import {
  CARVING_KNIFE,
  DISPLAY_CASE,
  HILL_STUDIO,
  LACQUER_CASE,
  SHOP_ITEMS,
  WIDE_STUDIO,
  bestOwned,
  parseOwned,
  priceMultiplier,
} from '../src/game/shop'
import { sellPrice } from '../src/game/scoring'

describe('공방 상점', () => {
  it('저장된 보유 목록에서 아는 물건만 살린다', () => {
    expect(parseOwned(JSON.stringify([CARVING_KNIFE, 'free-money']))).toEqual([CARVING_KNIFE])
    expect(parseOwned('{')).toEqual([])
    expect(parseOwned(null)).toEqual([])
  })

  it('이사한 공방은 판매가를 올린다', () => {
    const score = { silhouette: 80, height: 80, smoothness: 80, technique: 0, total: 80 }
    expect(priceMultiplier([])).toBe(1)
    expect(sellPrice(score, priceMultiplier([WIDE_STUDIO]))).toBeGreaterThan(sellPrice(score))
  })

  it('같은 갈래를 여러 개 가지면 가장 좋은 것을 쓴다', () => {
    expect(priceMultiplier([HILL_STUDIO, WIDE_STUDIO])).toBe(priceMultiplier([HILL_STUDIO]))
    expect(priceMultiplier([HILL_STUDIO])).toBeGreaterThan(priceMultiplier([WIDE_STUDIO]))
    expect(bestOwned([DISPLAY_CASE, LACQUER_CASE], 'shelf')?.id).toBe(LACQUER_CASE)
    expect(bestOwned([], 'shelf')).toBeNull()
  })

  it('공방과 선반 물건은 저마다 효과를 들고 있다', () => {
    for (const item of SHOP_ITEMS) {
      if (item.category === 'studio') expect(item.studio).toBeDefined()
      if (item.category === 'shelf') expect(item.shelf).toBeDefined()
    }
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
