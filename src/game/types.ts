export type InteractionMode = 'camera' | 'shaping'

export interface ClayProfile {
  height: number
  outerRadii: number[]
  innerRadii: number[]
}

export interface WheelState {
  speed: number
  pedalDown: boolean
  mode: InteractionMode
}

export type ShapingAction = 'narrow' | 'widen' | 'pull' | 'idle'

export interface ShapingInput {
  normalizedHeight: number
  action: ShapingAction
  strength: number
}

export interface OrderDefinition {
  id: string
  name: string
  subtitle: string
  description: string
  height: number
  outerRadii: number[]
  accent: string
  /** 이 도구를 가져야 열리는 주문. 없으면 처음부터 열려 있다. */
  requires?: string
}

export interface ScoreBreakdown {
  silhouette: number
  height: number
  smoothness: number
  total: number
}
