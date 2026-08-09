export interface ShopItem {
  id: string
  name: string
  price: number
  description: string
}

export const CARVING_KNIFE = 'carving-knife'
export const WIDE_STUDIO = 'wide-studio'
export const STUDIO_PRICE_MULTIPLIER = 1.3

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: CARVING_KNIFE,
    name: '조각칼',
    price: 25000,
    description: '성형 중 E를 누르면 선택한 높이에 가는 홈을 새깁니다. 새김무늬 주문이 열립니다.',
  },
  {
    id: WIDE_STUDIO,
    name: '길가 공방으로 이사',
    price: 60000,
    description: '볕이 드는 넓은 공방으로 옮깁니다. 손님이 늘어 판매가가 1.3배가 됩니다.',
  },
]

// 저장된 보유 목록은 사용자가 고칠 수 있으므로 아는 물건만 살린다.
export function parseOwned(raw: string | null): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const known = SHOP_ITEMS.map((item) => item.id)
  return known.filter((id) => parsed.includes(id))
}

export function priceMultiplier(owned: readonly string[]): number {
  return owned.includes(WIDE_STUDIO) ? STUDIO_PRICE_MULTIPLIER : 1
}
