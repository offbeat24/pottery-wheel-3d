import { PROFILE_SAMPLES } from './clay'
import { CARVING_KNIFE } from './shop'
import type { OrderDefinition } from './types'

function makeProfile(factory: (t: number) => number): number[] {
  return Array.from({ length: PROFILE_SAMPLES }, (_, index) => factory(index / (PROFILE_SAMPLES - 1)))
}

function bump(t: number, center: number, width: number, amount: number): number {
  return Math.exp(-Math.pow((t - center) / width, 2)) * amount
}

// 도구가 없으면 그 도구 전용 주문은 목록에 나타나지 않는다.
export function availableOrders(owned: readonly string[]): OrderDefinition[] {
  return ORDERS.filter((order) => !order.requires || owned.includes(order.requires))
}

export const ORDERS: OrderDefinition[] = [
  {
    id: 'morning-cup',
    name: '아침 찻잔',
    subtitle: '찻자리 주문',
    description: '곧은 몸통과 살짝 열린 입구',
    height: 1.48,
    accent: '#d67b49',
    outerRadii: makeProfile((t) => 0.64 + t * 0.1 + Math.sin(t * Math.PI) * 0.035),
  },
  {
    id: 'sunny-bowl',
    name: '햇살 사발',
    subtitle: '밥상 주문',
    description: '낮고 넉넉하게 벌어진 곡선',
    height: 1.2,
    accent: '#aa6948',
    outerRadii: makeProfile((t) => 0.54 + Math.sin(t * Math.PI * 0.72) * 0.42 + t * 0.06),
  },
  {
    id: 'moon-plate',
    name: '달빛 접시',
    subtitle: '차림 주문',
    description: '얕게 눕고 테두리만 살짝 선 접시',
    height: 1.08,
    accent: '#c9955f',
    outerRadii: makeProfile((t) => 0.62 + t * 0.42 + bump(t, 0.96, 0.08, 0.06)),
  },
  {
    id: 'straight-tumbler',
    name: '곧은 통잔',
    subtitle: '작업대 주문',
    description: '위아래 폭이 같은 단정한 원통',
    height: 1.72,
    accent: '#8d7f6a',
    outerRadii: makeProfile(() => 0.62),
  },
  {
    id: 'round-jar',
    name: '둥근 항아리',
    subtitle: '광 주문',
    description: '배가 불룩하고 어깨에서 오므라드는 형태',
    height: 1.42,
    accent: '#9c5f42',
    outerRadii: makeProfile((t) => 0.58 + bump(t, 0.44, 0.32, 0.44) - bump(t, 1, 0.2, 0.16)),
  },
  {
    id: 'quiet-vase',
    name: '고요한 화병',
    subtitle: '꽃자리 주문',
    description: '풍성한 배와 가느다란 목',
    height: 1.88,
    accent: '#71805d',
    outerRadii: makeProfile((t) => {
      const belly = bump(t, 0.42, 0.29, 0.38)
      const neck = bump(t, 0.82, 0.16, 0.2)
      const lip = bump(t, 1, 0.07, 0.12)
      return 0.57 + belly - neck + lip
    }),
  },
  {
    id: 'gourd-bottle',
    name: '호리병',
    subtitle: '나들이 주문',
    description: '아래위 두 개의 배 사이를 잘록하게 조인 형태',
    height: 1.86,
    accent: '#7a6a86',
    outerRadii: makeProfile((t) => 0.5 + bump(t, 0.2, 0.19, 0.42) + bump(t, 0.72, 0.17, 0.3) - bump(t, 0.46, 0.13, 0.14)),
  },
  {
    id: 'ripple-jar',
    name: '물결 단지',
    subtitle: '장식 주문',
    description: '몸통을 따라 물결이 두 번 오르내리는 단지',
    height: 1.62,
    accent: '#4f7a72',
    outerRadii: makeProfile((t) => 0.74 + Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.16 - bump(t, 1, 0.12, 0.1)),
  },
  {
    id: 'carved-cup',
    name: '새김무늬 잔',
    subtitle: '조각칼 주문',
    description: '몸통 가운데를 한 줄 깊게 파낸 잔',
    height: 1.5,
    accent: '#8c6f9c',
    requires: CARVING_KNIFE,
    outerRadii: makeProfile((t) => 0.68 + t * 0.06 - bump(t, 0.5, 0.045, 0.11)),
  },
  {
    id: 'carved-jar',
    name: '세 줄 새김 항아리',
    subtitle: '조각칼 주문',
    description: '어깨 아래로 가는 홈을 세 줄 나란히 새긴 항아리',
    height: 1.66,
    accent: '#4c6b8a',
    requires: CARVING_KNIFE,
    outerRadii: makeProfile((t) => {
      const body = 0.62 + bump(t, 0.42, 0.34, 0.3) - bump(t, 1, 0.18, 0.12)
      const grooves = bump(t, 0.6, 0.035, 0.09) + bump(t, 0.68, 0.035, 0.09) + bump(t, 0.76, 0.035, 0.09)
      return body - grooves
    }),
  },
  {
    id: 'slim-bottle',
    name: '가는 목 병',
    subtitle: '주안상 주문',
    description: '낮은 배에서 길고 좁게 뽑아 올린 목',
    height: 1.96,
    accent: '#5f6f7a',
    outerRadii: makeProfile((t) => 0.46 + bump(t, 0.24, 0.22, 0.44) - bump(t, 0.7, 0.24, 0.05) + bump(t, 1, 0.06, 0.08)),
  },
]
