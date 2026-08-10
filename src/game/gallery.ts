import { MAX_HEIGHT, PROFILE_SAMPLES } from './clay'
import { MAX_PACE, MIN_PACE } from './scoring'

// 손으로 새길 수 있는 줄 수의 상한. 고쳐 넣은 저장본이 채점을 늘어지게 만들지 않도록 자른다.
const MAX_CARVINGS = 24

export interface SavedPiece {
  height: number
  outerRadii: number[]
  /** 완성 당시의 표면 트임. 저장본에 없으면 0으로 본다. */
  damage: number
  /** 굽기 완성도(0.5~1). 저장본에 없으면 1로 본다. */
  firing: number
  /** 완성까지 걸린 시간이 만든 값 배수(0.7~1.35). 저장본에 없으면 1로 본다. */
  pace: number
  /** 조각칼로 새긴 높이(0~1)를 새긴 순서대로. 저장본에 없으면 빈 배열로 본다. */
  carvings: number[]
}

// localStorage는 사용자가 고칠 수 있으므로 형태가 맞는 항목만 살린다.
export function parseGallery(raw: string | null): Record<string, SavedPiece> {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

  const gallery: Record<string, SavedPiece> = {}
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    const piece = value as Partial<SavedPiece> | null
    if (!piece || typeof piece !== 'object') continue
    if (!isFiniteNumber(piece.height) || piece.height <= 0 || piece.height > MAX_HEIGHT) continue
    if (!Array.isArray(piece.outerRadii) || piece.outerRadii.length !== PROFILE_SAMPLES) continue
    if (!piece.outerRadii.every((radius) => isFiniteNumber(radius) && radius > 0)) continue
    const damage = isFiniteNumber(piece.damage) ? Math.min(1, Math.max(0, piece.damage)) : 0
    const firing = isFiniteNumber(piece.firing) ? Math.min(1, Math.max(0.5, piece.firing)) : 1
    const pace = isFiniteNumber(piece.pace) ? Math.min(MAX_PACE, Math.max(MIN_PACE, piece.pace)) : 1
    const carvings = Array.isArray(piece.carvings)
      ? piece.carvings.filter((height) => isFiniteNumber(height) && height >= 0 && height <= 1).slice(0, MAX_CARVINGS)
      : []
    gallery[id] = { height: piece.height, outerRadii: [...piece.outerRadii], damage, firing, pace, carvings }
  }
  return gallery
}

export function parseEarnings(raw: string | null): number {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
