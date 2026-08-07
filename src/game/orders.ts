import { PROFILE_SAMPLES } from './clay'
import type { OrderDefinition } from './types'

function makeProfile(factory: (t: number) => number): number[] {
  return Array.from({ length: PROFILE_SAMPLES }, (_, index) => factory(index / (PROFILE_SAMPLES - 1)))
}

export const ORDERS: OrderDefinition[] = [
  {
    id: 'morning-cup',
    name: '아침 찻잔',
    subtitle: '첫 번째 주문',
    description: '곧은 몸통과 살짝 열린 입구',
    height: 1.48,
    accent: '#d67b49',
    outerRadii: makeProfile((t) => 0.64 + t * 0.1 + Math.sin(t * Math.PI) * 0.035),
  },
  {
    id: 'sunny-bowl',
    name: '햇살 사발',
    subtitle: '두 번째 주문',
    description: '낮고 넉넉하게 벌어진 곡선',
    height: 1.2,
    accent: '#aa6948',
    outerRadii: makeProfile((t) => 0.54 + Math.sin(t * Math.PI * 0.72) * 0.42 + t * 0.06),
  },
  {
    id: 'quiet-vase',
    name: '고요한 화병',
    subtitle: '마지막 주문',
    description: '풍성한 배와 가느다란 목',
    height: 1.88,
    accent: '#71805d',
    outerRadii: makeProfile((t) => {
      const belly = Math.exp(-Math.pow((t - 0.42) / 0.29, 2)) * 0.38
      const neck = Math.exp(-Math.pow((t - 0.82) / 0.16, 2)) * 0.2
      const lip = Math.exp(-Math.pow((t - 1) / 0.07, 2)) * 0.12
      return 0.57 + belly - neck + lip
    }),
  },
]
