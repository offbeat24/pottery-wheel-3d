export type InteractionMode = 'camera' | 'shaping'

export interface ClayProfile {
  height: number
  outerRadii: number[]
  innerRadii: number[]
  opening: number
}

export type CraftStage = 'forming' | 'drying' | 'leather-hard' | 'glazing' | 'fired'
export type GlazeId = 'celadon' | 'cream' | 'iron'
export type GlazeChoice = GlazeId | 'unglazed'

export interface CraftState {
  stage: CraftStage
  moisture: number
  clayMass: number
  reserveLumps: number
  handleAttached: boolean
  glaze: GlazeChoice | null
  glazeCoverage: number
  kilnTemperature: number
  firingQuality: number | null
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
}

export interface ScoreBreakdown {
  silhouette: number
  height: number
  smoothness: number
  total: number
}
