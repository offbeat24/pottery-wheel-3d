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

/**
 * 도구가 열어주는 「기법」 요구. 라운드가 올라가면 요구하는 홈이 늘고 오차가 좁아진다.
 * 새 도구를 넣을 때는 주문에 requires(도구)와 technique(그 도구로 해야 할 일)를 함께 적는다.
 */
export interface OrderTechnique {
  /** 이 기법에 필요한 도구. 주문의 requires와 같아야 한다. */
  tool: string
  /** 새겨야 하는 높이(0~1). 아래에서 위 순서로 적는다. */
  grooves: number[]
  /** 홈 하나가 인정되는 높이 오차. 정확할수록 점수가 높다. */
  tolerance: number
  /** true면 적은 순서(아래→위)대로 새겨야 한다. */
  ordered: boolean
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
  /** 도구로 해야 할 일. 있으면 기법이 점수 항목에 들어간다. */
  technique?: OrderTechnique
}

export interface ScoreBreakdown {
  silhouette: number
  height: number
  smoothness: number
  /** 기법 점수. 요구가 없는 주문은 100이고 총점 가중치도 0이다. */
  technique: number
  total: number
}
