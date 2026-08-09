export type ShopCategory = 'tool' | 'studio' | 'shelf'

/** 공방 한 채의 색과 빛. 목록에서 뒤에 올수록 상위 등급이다. */
export interface StudioEffect {
  wall: number
  floor: number
  background: number
  sunIntensity: number
  hemisphereIntensity: number
  priceMultiplier: number
}

/** 전시 선반의 판재와 테. */
export interface ShelfEffect {
  board: number
  boardRoughness: number
  trim: number
  trimMetalness: number
}

export interface ShopItem {
  id: string
  name: string
  price: number
  description: string
  category: ShopCategory
  studio?: StudioEffect
  shelf?: ShelfEffect
}

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  tool: '도구',
  studio: '공방',
  shelf: '선반',
}

export const CARVING_KNIFE = 'carving-knife'
export const WIDE_STUDIO = 'wide-studio'
export const RIVER_STUDIO = 'river-studio'
export const HILL_STUDIO = 'hill-studio'
export const DISPLAY_CASE = 'display-case'
export const GLASS_CASE = 'glass-case'
export const LACQUER_CASE = 'lacquer-case'

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: CARVING_KNIFE,
    name: '조각칼',
    price: 25000,
    category: 'tool',
    description: '성형 중 E를 누르면 선택한 높이에 가는 홈을 새깁니다. 새김무늬 주문이 열립니다.',
  },
  {
    id: WIDE_STUDIO,
    name: '길가 공방',
    price: 60000,
    category: 'studio',
    description: '볕이 드는 회벽 공방으로 옮깁니다. 손님이 늘어 판매가가 1.3배가 됩니다.',
    studio: {
      wall: 0xf0dcc0,
      floor: 0xd9ac82,
      background: 0xe8c49a,
      sunIntensity: 5,
      hemisphereIntensity: 3,
      priceMultiplier: 1.3,
    },
  },
  {
    id: RIVER_STUDIO,
    name: '강변 공방',
    price: 140000,
    category: 'studio',
    description: '물빛이 도는 서늘한 공방입니다. 판매가가 1.6배가 됩니다.',
    studio: {
      wall: 0xdde7e5,
      floor: 0xc7b498,
      background: 0xd3e0dd,
      sunIntensity: 5.4,
      hemisphereIntensity: 3.2,
      priceMultiplier: 1.6,
    },
  },
  {
    id: HILL_STUDIO,
    name: '언덕 위 유리 공방',
    price: 260000,
    category: 'studio',
    description: '온종일 볕이 드는 언덕 위 공방입니다. 판매가가 2배가 됩니다.',
    studio: {
      wall: 0xfdf4e5,
      floor: 0xe7d3b4,
      background: 0xf3e6cf,
      sunIntensity: 6,
      hemisphereIntensity: 3.6,
      priceMultiplier: 2,
    },
  },
  {
    id: DISPLAY_CASE,
    name: '원목 진열장',
    price: 30000,
    category: 'shelf',
    description: '전시 선반을 짙은 원목과 황동 테로 바꿉니다.',
    shelf: { board: 0x4b2f21, boardRoughness: 0.55, trim: 0xc9a24a, trimMetalness: 0.72 },
  },
  {
    id: GLASS_CASE,
    name: '유리 진열장',
    price: 90000,
    category: 'shelf',
    description: '유리와 은빛 테로 마감한 밝은 진열장입니다.',
    shelf: { board: 0xb9c4c6, boardRoughness: 0.3, trim: 0xe8eef0, trimMetalness: 0.85 },
  },
  {
    id: LACQUER_CASE,
    name: '옻칠 진열장',
    price: 160000,
    category: 'shelf',
    description: '검게 옻칠한 판에 금테를 두른 진열장입니다.',
    shelf: { board: 0x1d1613, boardRoughness: 0.25, trim: 0xd9b45a, trimMetalness: 0.9 },
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

/** 같은 갈래를 여러 개 가지고 있으면 목록에서 가장 뒤에 있는(가장 좋은) 것을 쓴다. */
export function bestOwned(owned: readonly string[], category: ShopCategory): ShopItem | null {
  const candidates = SHOP_ITEMS.filter((item) => item.category === category && owned.includes(item.id))
  return candidates.length > 0 ? candidates[candidates.length - 1] : null
}

export function priceMultiplier(owned: readonly string[]): number {
  return bestOwned(owned, 'studio')?.studio?.priceMultiplier ?? 1
}
