import { MAX_HEIGHT, PROFILE_SAMPLES } from './clay'

export interface SavedPiece {
  height: number
  outerRadii: number[]
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
    gallery[id] = { height: piece.height, outerRadii: [...piece.outerRadii] }
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
